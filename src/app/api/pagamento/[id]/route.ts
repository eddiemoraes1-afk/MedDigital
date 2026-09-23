import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { consultarCobranca, traduzirStatus } from '@/lib/asaas'

/**
 * Consulta a situação de um pagamento.
 *
 * A tela do paciente chama isto de tempos em tempos enquanto ele paga.
 * Se o webhook ainda não chegou, confirmamos direto no Asaas — assim o
 * paciente nunca fica preso esperando por um aviso que atrasou.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = createAdminClient()

  const { data: paciente } = await db
    .from('pacientes').select('id').eq('usuario_id', user.id).maybeSingle()
  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { data: pagamento } = await db
    .from('pagamentos').select('*').eq('id', id).maybeSingle()

  // O paciente só enxerga os próprios pagamentos.
  if (!pagamento || pagamento.paciente_id !== paciente.id) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
  }

  let atual = pagamento

  // Ainda pendente? Confere na fonte antes de responder.
  if (pagamento.status === 'pendente' && pagamento.asaas_cobranca_id) {
    try {
      const cobranca = await consultarCobranca(pagamento.asaas_cobranca_id)
      const novo = traduzirStatus(cobranca.status)

      if (novo !== pagamento.status) {
        const { data: atualizado } = await db
          .from('pagamentos')
          .update({
            status: novo,
            pago_em: novo === 'pago'
              ? (cobranca.confirmedDate || cobranca.paymentDate || new Date().toISOString())
              : null,
          })
          .eq('id', pagamento.id)
          .select('*')
          .single()

        if (atualizado) atual = atualizado

        await db.from('pagamentos_eventos').insert({
          pagamento_id: pagamento.id,
          origem: 'api',
          evento: `status_atualizado_para_${novo}`,
          detalhe: { status_asaas: cobranca.status },
        })
      }
    } catch {
      // Asaas indisponível: devolvemos o que temos gravado.
    }
  }

  return NextResponse.json({
    pagamento: {
      id: atual.id,
      referencia: atual.referencia,
      descricao: atual.descricao,
      valor: Number(atual.valor),
      metodo: atual.metodo,
      status: atual.status,
      pix_copia_cola: atual.pix_copia_cola,
      pix_qrcode_base64: atual.pix_qrcode_base64,
      pix_expira_em: atual.pix_expira_em,
      link_pagamento: atual.link_pagamento,
      vencimento: atual.vencimento,
      pago_em: atual.pago_em,
    },
  })
}
