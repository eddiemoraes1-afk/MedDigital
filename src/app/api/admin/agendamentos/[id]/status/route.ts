import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function isAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis_sistema')
    .select('role')
    .eq('usuario_id', user.id)
    .single()
  return perfil?.role === 'admin'
}

const STATUS_VALIDOS = ['agendado', 'confirmado', 'pendente', 'concluido', 'cancelado', 'reagendado', 'nao_compareceu']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!status || !STATUS_VALIDOS.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('agendamentos')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
