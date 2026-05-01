import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { medico_id, data_hora, observacoes } = await request.json()
  if (!medico_id || !data_hora) {
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Buscar paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('id, nome, telefone')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ erro: 'Paciente não encontrado' }, { status: 404 })

  // Verificar se slot ainda está disponível
  const { data: conflito } = await adminSupabase
    .from('agendamentos')
    .select('id')
    .eq('medico_id', medico_id)
    .eq('data_hora', data_hora)
    .neq('status', 'cancelado')
    .single()

  if (conflito) return NextResponse.json({ erro: 'Horário já ocupado' }, { status: 409 })

  // Criar agendamento
  const { data: agendamento, error } = await adminSupabase
    .from('agendamentos')
    .insert({
      paciente_id: paciente.id,
      medico_id,
      data_hora,
      status: 'confirmado',
      tipo: 'virtual',
      observacoes: observacoes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Buscar dados do médico para notificação
  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('nome, especialidade')
    .eq('id', medico_id)
    .single()

  return NextResponse.json({
    sucesso: true,
    agendamento,
    medico,
    paciente: { nome: paciente.nome, email: user.email, telefone: paciente.telefone }
  })
}
