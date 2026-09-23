import { createAdminClient } from '@/lib/supabase/server'
import { lerConfigPagamento } from '@/lib/config-pagamento'

/**
 * Decide se uma consulta precisa ser paga antes de acontecer.
 *
 * Regra de negócio:
 *   · Paciente vinculado a uma empresa ativa  → a empresa paga. Passa direto.
 *   · Paciente particular                     → paga antes de entrar na fila.
 *
 * Esta checagem mora no servidor de propósito. Se ficasse só na tela,
 * bastaria mexer no navegador para pular a cobrança.
 */

export interface DecisaoCobranca {
  precisaPagar: boolean
  /** Identificador único da cobrança desta consulta. */
  referencia: string
  valor: number
  /** Motivo da liberação, quando não precisa pagar. */
  motivo?: 'vinculado_a_empresa' | 'ja_pago' | 'cobrancas_desativadas'
}

export async function avaliarCobrancaConsulta(
  pacienteId: string,
  triagemId: string | null,
): Promise<DecisaoCobranca> {
  const db = createAdminClient()

  // A referência amarra a cobrança à triagem. Assim o paciente não paga
  // duas vezes pela mesma consulta se recarregar a página.
  const referencia = triagemId
    ? `consulta:${triagemId}`
    : `consulta:${pacienteId}:${new Date().toISOString().slice(0, 10)}`

  const config = await lerConfigPagamento()
  const valor = config.valorConsultaAvulsa

  // ── 1. Cobranças desligadas no painel? Ninguém paga. ──
  if (!config.ativo) {
    return { precisaPagar: false, referencia, valor, motivo: 'cobrancas_desativadas' }
  }

  // ── 2. Tem vínculo ativo com alguma empresa? A empresa paga. ──
  const { data: vinculo } = await db
    .from('vinculos_empresa')
    .select('id, empresa_id, empresas(ativo)')
    .eq('paciente_id', pacienteId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (vinculo) {
    const empresa = vinculo.empresas as unknown as { ativo?: boolean } | null
    // Empresa desativada não cobre — o paciente volta a ser particular.
    if (empresa?.ativo !== false) {
      return { precisaPagar: false, referencia, valor, motivo: 'vinculado_a_empresa' }
    }
  }

  // ── 3. Particular: já pagou por esta consulta? ──
  const { data: pagamento } = await db
    .from('pagamentos')
    .select('status')
    .eq('referencia', referencia)
    .maybeSingle()

  if (pagamento?.status === 'pago') {
    return { precisaPagar: false, referencia, valor, motivo: 'ja_pago' }
  }

  return { precisaPagar: true, referencia, valor }
}
