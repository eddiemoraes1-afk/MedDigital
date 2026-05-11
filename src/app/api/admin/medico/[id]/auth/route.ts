import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()
  const { email, senha } = body as { email?: string; senha?: string }

  if (!email && !senha) {
    return NextResponse.json({ error: 'Informe e-mail ou senha para atualizar' }, { status: 400 })
  }
  if (senha && senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Busca o usuario_id do médico
  const { data: medico, error: medicoErr } = await admin
    .from('medicos')
    .select('usuario_id')
    .eq('id', id)
    .single()

  if (medicoErr || !medico) {
    return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 })
  }

  // Monta payload para auth.admin.updateUserById
  const authUpdate: { email?: string; password?: string } = {}
  if (email) authUpdate.email = email.trim().toLowerCase()
  if (senha) authUpdate.password = senha

  const { error: authErr } = await admin.auth.admin.updateUserById(
    medico.usuario_id,
    authUpdate,
  )
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 })
  }

  // Se o e-mail mudou, espelha na coluna medicos.email também
  if (email) {
    await admin
      .from('medicos')
      .update({ email: email.trim().toLowerCase() })
      .eq('id', id)
  }

  revalidatePath(`/admin/medicos/${id}`)
  return NextResponse.json({ ok: true })
}
