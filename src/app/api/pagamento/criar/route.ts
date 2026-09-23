import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  criarCliente, criarCobranca, obterQrCodePix,
  ASAAS_CONTA, AsaasErro,
} from '@/lib/asaas'
import { lerConfigPagamento } from '@/lib/config-pagamento'

/**
 * Cria uma cobrança para o paciente logado.
 *
 * Idempotente: se já existe pagamento com a mesma `referencia`, devolve o que
 * existe em vez de cobrar de novo. Isso protege contra clique duplo, recarga
 * de página e chamadas repetidas.
 */
export async function POST(req: NextRequest) {
  // ── 1. Identifica o paciente logado ──
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = createAdminClient()

  const { data: paciente } = await db
    .from('pacientes')
    .select('id, nome, cpf, telefone')
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }
  if (!paciente.cpf) {
    return NextResponse.json(
      { error: 'Seu cadastro está sem CPF. Atualize o cadastro antes de pagar.' },
      { status: 400 },
    )
  }

  // ── 2. Lê e valida a requisição ──
  const body = await req.json().catch(() => null)
  const metodo: 'pix' | 'cartao' = body?.metodo === 'cartao' ? 'cartao' : 'pix'
  const referencia: string = typeof body?.referencia === 'string' && body.referencia.trim()
    ? body.referencia.trim()
    : `avulsa:${user.id}:${new Date().toISOString().slice(0, 10)}`
  const descricao: string = typeof body?.descricao === 'string' && body.descricao.trim()
    ? body.descricao.trim()
    : 'Consulta médica — Aduno'

  const valor = Number(body?.valor)
  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
  }

  // ── 3. Trava anti-duplicidade ──
  const { data: existente } = await db
    .from('pagamentos')
    .select('*')
    .eq('referencia', referencia)
    .maybeSingle()

  if (existente) {
    // Já pago ou ainda válido: devolve o mesmo, sem cobrar de novo.
    if (existente.status === 'pago' || existente.status === 'pendente') {
      return NextResponse.json({ pagamento: publico(existente), reaproveitado: true })
    }
    return NextResponse.json(
      { error: `Já existe uma cobrança para esta referência com status "${existente.status}".` },
      { status: 409 },
    )
  }

  try {
    // ── 4. Garante o cliente no Asaas (por conta) ──
    const { data: vinculo } = await db
      .from('asaas_clientes')
      .select('asaas_cliente_id')
      .eq('paciente_id', paciente.id)
      .eq('asaas_conta', ASAAS_CONTA)
      .maybeSingle()

    let clienteId = vinculo?.asaas_cliente_id ?? null

    if (!clienteId) {
      const cliente = await criarCliente({
        nome: paciente.nome,
        cpf: paciente.cpf,
        email: user.email,
        telefone: paciente.telefone,
        referenciaExterna: paciente.id,
      })
      clienteId = cliente.id
      await db.from('asaas_clientes').insert({
        paciente_id: paciente.id,
        asaas_conta: ASAAS_CONTA,
        asaas_cliente_id: clienteId,
      })
    }

    // ── 5. Cria a cobrança, com os limites vindos do painel admin ──
    const config = await lerConfigPagamento()

    const cobranca = await criarCobranca({
      clienteId,
      valor,
      descricao,
      metodo,
      referenciaExterna: referencia,
      valorMaximo: config.valorMaximo,
      ativo: config.ativo,
    })

    // ── 6. PIX: busca o QR code ──
    let pixCopiaCola: string | null = null
    let pixQrCode: string | null = null
    let pixExpira: string | null = null

    if (metodo === 'pix') {
      try {
        const qr = await obterQrCodePix(cobranca.id)
        pixCopiaCola = qr.payload
        pixQrCode = qr.encodedImage
        pixExpira = qr.expirationDate ?? null
      } catch {
        // Sem QR code o paciente ainda consegue pagar pela fatura do Asaas.
      }
    }

    // ── 7. Grava do nosso lado ──
    const { data: pagamento, error } = await db
      .from('pagamentos')
      .insert({
        paciente_id: paciente.id,
        referencia,
        descricao,
        valor,
        metodo,
        status: 'pendente',
        asaas_conta: ASAAS_CONTA,
        asaas_cobranca_id: cobranca.id,
        asaas_cliente_id: clienteId,
        pix_copia_cola: pixCopiaCola,
        pix_qrcode_base64: pixQrCode,
        pix_expira_em: pixExpira,
        link_pagamento: cobranca.invoiceUrl ?? null,
        vencimento: cobranca.dueDate ?? null,
        agendamento_id: body?.agendamento_id ?? null,
        atendimento_id: body?.atendimento_id ?? null,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    await registrar(db, pagamento.id, 'api', 'cobranca_criada', {
      cobranca_id: cobranca.id, metodo, valor,
    })

    return NextResponse.json({ pagamento: publico(pagamento) }, { status: 201 })

  } catch (e) {
    const erro = e instanceof AsaasErro ? e : null
    await registrar(db, null, 'sistema', 'falha_ao_criar_cobranca', {
      referencia,
      mensagem: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json(
      { error: erro?.message || 'Não foi possível gerar a cobrança. Tente novamente.' },
      { status: erro?.status && erro.status < 500 ? erro.status : 502 },
    )
  }
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────

/** Devolve só o que o navegador precisa ver. Nada de identificadores internos do Asaas. */
function publico(p: any) {
  return {
    id: p.id,
    referencia: p.referencia,
    descricao: p.descricao,
    valor: Number(p.valor),
    metodo: p.metodo,
    status: p.status,
    pix_copia_cola: p.pix_copia_cola,
    pix_qrcode_base64: p.pix_qrcode_base64,
    pix_expira_em: p.pix_expira_em,
    link_pagamento: p.link_pagamento,
    vencimento: p.vencimento,
    pago_em: p.pago_em,
  }
}

async function registrar(db: any, pagamentoId: string | null, origem: string, evento: string, detalhe: unknown) {
  try {
    await db.from('pagamentos_eventos').insert({
      pagamento_id: pagamentoId, origem, evento, detalhe,
    })
  } catch {
    // Log nunca derruba a operação principal.
  }
}
