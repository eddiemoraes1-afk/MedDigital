import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST — cria nova ação
export async function POST(req: Request) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()
  const body = await req.json()

  const { setor, fator_risco, medida_controle, responsavel_nome, prazo } = body

  if (!fator_risco || !medida_controle) {
    return NextResponse.json({ error: 'Fator de risco e medida são obrigatórios.' }, { status: 400 })
  }

  const { error } = await db.from('plano_acao_nr1').insert({
    empresa_id: empresaId,
    setor: setor || null,
    fator_risco,
    medida_controle,
    responsavel_nome: responsavel_nome || null,
    prazo: prazo || null,
    status: 'pendente',
  })

  if (error) {
    console.error('[nr1/plano-acao] erro:', error)
    return NextResponse.json({ error: 'Erro ao criar ação.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// PATCH — atualiza status de uma ação existente
export async function PATCH(req: Request) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()
  const body = await req.json()

  const { id, status } = body
  if (!id || !status) {
    return NextResponse.json({ error: 'id e status são obrigatórios.' }, { status: 400 })
  }

  const validos = ['pendente', 'em_andamento', 'concluido', 'cancelado']
  if (!validos.includes(status)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }

  const update: Record<string, any> = { status }
  if (status === 'concluido') update.concluido_em = new Date().toISOString()

  const { error } = await db
    .from('plano_acao_nr1')
    .update(update)
    .eq('id', id)
    .eq('empresa_id', empresaId) // garante que só atualiza ação da própria empresa

  if (error) {
    console.error('[nr1/plano-acao PATCH] erro:', error)
    return NextResponse.json({ error: 'Erro ao atualizar ação.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
