import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  await requireAdmin()
  const db = createAdminClient()
  const { data, error } = await db
    .from('contas_bancarias')
    .select('*')
    .eq('ativo', true)
    .order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contas: data ?? [] })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const db   = createAdminClient()
  const body = await req.json()
  const { nome, banco, agencia, conta, saldo_inicial } = body
  if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const { data, error } = await db
    .from('contas_bancarias')
    .insert({ nome, banco: banco ?? null, agencia: agencia ?? null, conta: conta ?? null, saldo_inicial: Number(saldo_inicial ?? 0) })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conta: data }, { status: 201 })
}
