import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()
  const custo = Number(body.custo_consulta ?? 0)

  if (isNaN(custo) || custo < 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('medicos')
    .update({ custo_consulta: custo })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
