import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// PATCH — editar dados ou reconciliar saldo da conta
export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin()
  const db  = createAdminClient()
  const { id } = await params
  const body = await req.json()

  const { nome, banco, agencia, conta, saldo_atual, ativo, data_reconciliacao, observacao_reconciliacao } = body
  const update: Record<string, unknown> = {}

  if (nome     !== undefined) update.nome     = nome
  if (banco    !== undefined) update.banco    = banco    ?? null
  if (agencia  !== undefined) update.agencia  = agencia  ?? null
  if (conta    !== undefined) update.conta    = conta    ?? null
  if (ativo    !== undefined) update.ativo    = ativo

  // Reconciliação: atualiza saldo atual e registra data/obs
  if (saldo_atual !== undefined) {
    update.saldo_atual              = Number(saldo_atual)
    update.data_reconciliacao       = data_reconciliacao ?? new Date().toISOString().split('T')[0]
    update.observacao_reconciliacao = observacao_reconciliacao ?? null
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await db
    .from('contas_bancarias')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conta: data })
}

// DELETE — inativar conta
export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin()
  const db  = createAdminClient()
  const { id } = await params

  const { error } = await db
    .from('contas_bancarias')
    .update({ ativo: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
