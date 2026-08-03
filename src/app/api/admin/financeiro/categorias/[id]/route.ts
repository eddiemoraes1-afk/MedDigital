import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin()
  const db  = createAdminClient()
  const { id } = await params
  const body = await req.json()

  const { nome, tipo, grupo_dre, ordem, ativo } = body
  const update: Record<string, unknown> = {}
  if (nome      !== undefined) update.nome      = nome
  if (tipo      !== undefined) update.tipo      = tipo
  if (grupo_dre !== undefined) update.grupo_dre = grupo_dre
  if (ordem     !== undefined) update.ordem     = Number(ordem)
  if (ativo     !== undefined) update.ativo     = ativo

  const { data, error } = await db
    .from('categorias_financeiras')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categoria: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin()
  const db  = createAdminClient()
  const { id } = await params

  const { error } = await db
    .from('categorias_financeiras')
    .update({ ativo: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
