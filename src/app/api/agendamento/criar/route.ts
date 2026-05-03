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

  // Buscar paciente — se não existir, criar automaticamente a partir do Auth
  let { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('id, nome, telefone')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) {
    const nomeAuth = user.user_metadata?.nome || user.email?.split('@')[0] || 'Paciente'
    const { data: novo, error: errCriacao } = await adminSupabase
      .from('pacientes')
      .insert({ usuario_id: user.id, nome: nomeAuth })
      .select('id, nome, telefone')
      .single()
    if (errCriacao || !novo) {
      return NextResponse.json({ erro: 'Paciente não encontrado e não foi possível criar o registro. Contate o suporte.' }, { status: 500 })
    }
    paciente = novo
  }

  // Verificar se slot ainda está disponível (comparar com UTC armazenado)
  const { data: conflitos } = await adminSupabase
    .from('agendamentos')
    .select('id')
    .eq('medico_id', medico_id)
    .eq('data_hora', dataHoraUTC)
    .not('status', 'in', '(cancelado,reagendado)')

  if (conflitos && conflitos.length > 0) {
    return NextResponse.json({ erro: 'Horário já ocupado' }, { status: 409 })
  }

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
