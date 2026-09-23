import { createAdminClient } from '@/lib/supabase/server'

/**
 * Configurações de pagamento editáveis pelo super admin.
 *
 * A ordem de precedência é: banco → variável de ambiente → padrão do código.
 * Assim o preço muda pelo painel, sem deploy, mas o sistema continua de pé
 * mesmo que a configuração ainda não exista no banco.
 */

export interface ConfigPagamento {
  /** Preço da consulta avulsa para paciente particular. */
  valorConsultaAvulsa: number
  /** Teto de segurança: cobrança acima disso é recusada. */
  valorMaximo: number
  /** Chave geral. Com false, nenhuma cobrança é criada. */
  ativo: boolean
}

const PADRAO: ConfigPagamento = {
  valorConsultaAvulsa: 89.9,
  valorMaximo: 500,
  ativo: true,
}

/** Teto absoluto do ambiente. O painel nunca consegue ultrapassar este valor. */
const TETO_ABSOLUTO = Number(process.env.PAGAMENTO_TETO_ABSOLUTO || '2000')

function numero(valor: unknown, alternativa: number): number {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : alternativa
}

export async function lerConfigPagamento(): Promise<ConfigPagamento> {
  const doAmbiente: ConfigPagamento = {
    valorConsultaAvulsa: numero(process.env.VALOR_CONSULTA_AVULSA, PADRAO.valorConsultaAvulsa),
    valorMaximo: numero(process.env.PAGAMENTO_VALOR_MAXIMO, PADRAO.valorMaximo),
    ativo: process.env.PAGAMENTOS_ATIVO !== 'false',
  }

  try {
    const db = createAdminClient()
    const { data } = await db
      .from('configuracoes_sistema')
      .select('chave, valor')
      .in('chave', ['valor_consulta_avulsa', 'pagamento_valor_maximo', 'pagamentos_ativo'])

    const mapa: Record<string, string> = {}
    for (const linha of data ?? []) mapa[linha.chave] = linha.valor

    // A chave geral do ambiente tem prioridade: se estiver desligada lá,
    // o painel não consegue religar. É o freio de emergência de verdade.
    const ativo = doAmbiente.ativo === false
      ? false
      : (mapa.pagamentos_ativo ?? 'true') !== 'false'

    return {
      valorConsultaAvulsa: numero(mapa.valor_consulta_avulsa, doAmbiente.valorConsultaAvulsa),
      valorMaximo: Math.min(
        numero(mapa.pagamento_valor_maximo, doAmbiente.valorMaximo),
        TETO_ABSOLUTO,
      ),
      ativo,
    }
  } catch {
    // Banco indisponível: segue com o ambiente, sem derrubar o pagamento.
    return { ...doAmbiente, valorMaximo: Math.min(doAmbiente.valorMaximo, TETO_ABSOLUTO) }
  }
}
