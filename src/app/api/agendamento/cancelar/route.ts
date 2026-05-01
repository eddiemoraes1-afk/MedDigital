import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { enviarEmailCancelamento } from '@/lib/notifications'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { agendamento_id, status: novoStatus } = await request.json()
  if (!agendamento_id) return NextResponse.json({ erro: 'agendamento_id obrigatório' }, { status: 400 })
  const statusFinal = novoStatus === 'reagendado' ? 'reagendado' : 'cancelado'

  const adminSupabase = createAdminClient()

  // Verificar que o agendamento pertence a este paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('id, nome, telefone')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ erro: 'Paciente não encontrado' }, { status: 404 })

  const { data: agendamento } = await adminSupabase
    .from('agendamentos')
    .select('id, paciente_id, status, data_hora, medico_id')
    .eq('id', agendamento_id)
    .single()

  if (!agendamento) return NextResponse.json({ erro: 'Agendamento não encontrado' }, { status: 404 })
  if (agendamento.paciente_id !== paciente.id) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  if (['cancelado', 'reagendado'].includes(agendamento.status)) {
    return NextResponse.json({ erro: 'Já encerrado' }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('agendamentos')
    .update({ status: statusFinal })
    .eq('id', agendamento_id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Enviar email de cancelamento apenas no cancelamento real (não no reagendamento,
  // pois o novo agendamento já envia email de confirmação)
  if (statusFinal === 'cancelado') {
    const { data: medico } = await adminSupabase
      .from('medicos')
      .select('nome, especialidade')
      .eq('id', agendamento.medico_id)
      .single()

    await enviarEmailCancelamento({
      pacienteNome: paciente.nome,
      pacienteEmail: user.email!,
      pacienteTelefone: paciente.telefone,
      medicoNome: medico?.nome || 'Médico',
      medicoEspecialidade: medico?.especialidade || '',
      dataHora: new Date(agendamento.data_hora),
    }).catch(err => console.error('Erro ao enviar email de cancelamento:', err))
  }

  return NextResponse.json({ sucesso: true })
}
