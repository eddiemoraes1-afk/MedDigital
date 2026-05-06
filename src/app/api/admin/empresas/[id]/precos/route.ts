import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()

  const preco_mensalidade = parseFloat(body.preco_mensalidade ?? 0)
  const preco_consulta = parseFloat(body.preco_consulta ?? 0)

  if (isNaN(preco_mensalidade) || isNaN(preco_consulta)) {
    return NextResponse.json({ error: 'Valores inválidos' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('empresas')
    .update({ preco_mensalidade, preco_consulta })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
