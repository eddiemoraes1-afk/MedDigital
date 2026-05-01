import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { enviarEmailConfirmacao, enviarWhatsAppConfirmacao } from '@/lib/notifications'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { medico_id, data_hora, observacoes, reagendado_de } = await request.json()
  if (!medico_id || !data_hora) {
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  }

  // Converter para UTC explicitamente antes de salvar.
  // A coluna data_hora é timestamp without timezone — se salvarmos com offset (-03:00)
  // o PostgreSQL ignora o offset e armazena o horário literal, causando exibição errada.
  // Convertendo para UTC: "2026-05-09T10:00:00-03:00" → "2026-05-09T13:00:00.000Z"
  const dataHoraUTC = new Date(data_hora).toISOString()

  const adminSupabase = createAdminClient()

  // Buscar paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('id, nome, telefone')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ erro: 'Paciente não encontrado' }, { status: 404 })

  // Verificar se slot ainda está disponível (comparar com UTC armazenado)
  const { data: conflito } = await adminSupabase
    .from('agendamentos')
    .select('id')
    .eq('medico_id', medico_id)
    .eq('data_hora', dataHoraUTC)
    .not('status', 'in', '("cancelado","reagendado")')
    .single()

  if (conflito) return NextResponse.json({ erro: 'Horário já ocupado' }, { status: 409 })

  // Criar agendamento com timestamp UTC
  const { data: agendamento, error } = await adminSupabase
    .from('agendamentos')
    .insert({
      paciente_id: paciente.id,
      medico_id,
      data_hora: dataHoraUTC,
      status: 'confirmado',
      tipo: 'virtual',
      observacoes: observacoes || null,
      reagendado_de: reagendado_de || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Buscar dados do médico
  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('nome, especialidade')
    .eq('id', medico_id)
    .single()

  // Enviar notificações (sem bloquear a resposta)
  const dadosNotificacao = {
    pacienteNome: paciente.nome,
    pacienteEmail: user.email!,
    pacienteTelefone: paciente.telefone,
    medicoNome: medico?.nome || 'Médico',
    medicoEspecialidade: medico?.especialidade || '',
    dataHora: new Date(dataHoraUTC),
  }

  // Enviar notificações aguardando conclusão (Vercel encerra função antes de promises soltas)
  await Promise.all([
    enviarEmailConfirmacao(dadosNotificacao),
    enviarWhatsAppConfirmacao(dadosNotificacao),
  ]).catch(err => console.error('Erro nas notificações:', err))

  return NextResponse.json({ sucesso: true, agendamento })
}
