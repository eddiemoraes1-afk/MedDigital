import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  consultarCobranca, traduzirStatus,
  EVENTOS_PAGO, EVENTOS_NEGATIVOS,
} from '@/lib/asaas'

/**
 * Recebe os avisos do Asaas.
 *
 * Três camadas de proteção:
 *   1. Valida o token no cabeçalho — só o Asaas conhece esse valor.
 *   2. Nunca confia no conteúdo do aviso. Consulta a cobrança na fonte
 *      antes de dar qualquer coisa como paga.
 *   3. Idempotente. O Asaas reenvia avisos; processar duas vezes não muda nada.
 *
 * Responde 200 mesmo em caso de erro interno, para o Asaas não ficar
 * reenviando indefinidamente. O que deu errado fica registrado.
 */
export async function POST(req: NextRequest) {
  const db = createAdminClient()

  // ── 1. Autenticação ──
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN
  const tokenRecebido = req.headers.get('asaas-access-token')

  if (!tokenEsperado) {
    await log(db, null, 'webhook_sem_token_configurado', { aviso: 'ASAAS_WEBHOOK_TOKEN ausente' })
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 })
  }
  if (tokenRecebido !== tokenEsperado) {
    await log(db, null, 'webhook_token_invalido', { recebido: tokenRecebido ? 'presente' : 'ausente' })
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  // ── 2. Corpo ──
  const corpo = await req.json().catch(() => null)
  const evento: string | undefined = corpo?.event
  const cobrancaId: string | undefined = corpo?.payment?.id

  if (!evento || !cobrancaId) {
    await log(db, null, 'webhook_corpo_invalido', corpo)
    return NextResponse.json({ recebido: true })
  }

  try {
    // ── 3. Localiza o pagamento ──
    const { data: pagamento } = await db
      .from('pagamentos')
      .select('*')
      .eq('asaas_cobranca_id', cobrancaId)
      .maybeSingle()

    if (!pagamento) {
      // Cobrança criada fora da plataforma (direto no painel do Asaas, por exemplo).
      await log(db, null, 'webhook_cobranca_desconhecida', { evento, cobrancaId })
      return NextResponse.json({ recebido: true })
    }

    await log(db, pagamento.id, `webhook_${evento}`, { cobrancaId })

    // Eventos que não mexem no status: só registra e sai.
    if (!EVENTOS_PAGO.has(evento) && !EVENTOS_NEGATIVOS.has(evento)) {
      return NextResponse.json({ recebido: true })
    }

    // ── 4. Confirma na fonte. Nunca confia só no aviso. ──
    let statusNovo: string
    let pagoEm: string | null = null
    try {
      const cobranca = await consultarCobranca(cobrancaId)
      statusNovo = traduzirStatus(cobranca.status)
      if (statusNovo === 'pago') {
        pagoEm = cobranca.confirmedDate || cobranca.paymentDate || new Date().toISOString()
      }
    } catch {
      // Se a consulta falhar, usa o evento — mas registra que foi por fallback.
      statusNovo = EVENTOS_PAGO.has(evento) ? 'pago' : 'cancelado'
      if (statusNovo === 'pago') pagoEm = new Date().toISOString()
      await log(db, pagamento.id, 'webhook_sem_confirmacao_na_fonte', { evento })
    }

    // ── 5. Idempotência ──
    if (pagamento.status === statusNovo) {
      return NextResponse.json({ recebido: true, semMudanca: true })
    }

    // Uma vez pago, só estorno reverte. Protege contra avisos fora de ordem.
    if (pagamento.status === 'pago' && statusNovo !== 'estornado') {
      await log(db, pagamento.id, 'webhook_ignorado_ja_pago', { evento, statusNovo })
      return NextResponse.json({ recebido: true, ignorado: true })
    }

    await db.from('pagamentos')
      .update({ status: statusNovo, pago_em: pagoEm })
      .eq('id', pagamento.id)

    await log(db, pagamento.id, `status_alterado_para_${statusNovo}`, { evento })

    return NextResponse.json({ recebido: true, status: statusNovo })

  } catch (e) {
    await log(db, null, 'webhook_erro_interno', {
      evento, cobrancaId,
      mensagem: e instanceof Error ? e.message : String(e),
    })
    // 200 de propósito: evita o Asaas reenviar em laço por erro nosso.
    return NextResponse.json({ recebido: true, erro: true })
  }
}

async function log(db: any, pagamentoId: string | null, evento: string, detalhe: unknown) {
  try {
    await db.from('pagamentos_eventos').insert({
      pagamento_id: pagamentoId, origem: 'webhook', evento, detalhe,
    })
  } catch {
    // Falha de log nunca derruba o webhook.
  }
}
