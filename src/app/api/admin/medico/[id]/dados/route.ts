import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()

  const allowed = ['nome', 'especialidade', 'crm', 'crm_uf', 'telefone', 'cidade', 'estado', 'bio']
  const update: Record<string, string> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = String(body[key]).trim()
  }

  if (!update.nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('medicos').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
