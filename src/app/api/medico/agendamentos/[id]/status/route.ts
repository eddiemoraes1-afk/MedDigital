import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const STATUS_VALIDOS = ['agendado', 'confirmado', 'pendente', 'concluido', 'cancelado', 'reagendado', 'nao_compareceu']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!status || !STATUS_VALIDOS.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar que este agendamento pertence ao médico logado
  const { data: medico } = await admin
    .from('medicos')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!medico) return NextResponse.json({ error: 'Médico não encontrado' }, { status: 403 })

  const { data: agendamento } = await admin
    .from('agendamentos')
    .select('id, medico_id')
    .eq('id', id)
    .single()

  if (!agendamento || agendamento.medico_id !== medico.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { error } = await admin
    .from('agendamentos')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
