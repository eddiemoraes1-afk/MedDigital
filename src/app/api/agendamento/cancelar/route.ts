import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { agendamento_id } = await request.json()
  if (!agendamento_id) return NextResponse.json({ erro: 'agendamento_id obrigatório' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // Verificar que o agendamento pertence a este paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ erro: 'Paciente não encontrado' }, { status: 404 })

  const { data: agendamento } = await adminSupabase
    .from('agendamentos')
    .select('id, paciente_id, status')
    .eq('id', agendamento_id)
    .single()

  if (!agendamento) return NextResponse.json({ erro: 'Agendamento não encontrado' }, { status: 404 })
  if (agendamento.paciente_id !== paciente.id) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  if (agendamento.status === 'cancelado') return NextResponse.json({ erro: 'Já cancelado' }, { status: 400 })

  const { error } = await adminSupabase
    .from('agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', agendamento_id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ sucesso: true })
}
