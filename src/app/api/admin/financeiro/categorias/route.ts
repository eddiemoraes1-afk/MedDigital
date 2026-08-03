import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  await requireAdmin()
  const db = createAdminClient()
  const { data, error } = await db
    .from('categorias_financeiras')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categorias: data ?? [] })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const db   = createAdminClient()
  const body = await req.json()
  const { nome, tipo, grupo_dre, ordem } = body

  if (!nome || !tipo || !grupo_dre) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, tipo, grupo_dre' }, { status: 400 })
  }
  if (!['receita', 'despesa'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo deve ser receita ou despesa' }, { status: 400 })
  }

  // Calcular próxima ordem se não fornecida
  let ordemFinal = Number(ordem ?? 0)
  if (!ordemFinal) {
    const { data: maxRow } = await db
      .from('categorias_financeiras')
      .select('ordem')
      .order('ordem', { ascending: false })
      .limit(1)
      .single()
    ordemFinal = (maxRow?.ordem ?? 0) + 10
  }

  const { data, error } = await db
    .from('categorias_financeiras')
    .insert({ nome, tipo, grupo_dre, ordem: ordemFinal, ativo: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categoria: data }, { status: 201 })
}
