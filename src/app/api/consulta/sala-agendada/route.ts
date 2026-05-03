import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { agendamento_id } = await req.json()
  if (!agendamento_id) return NextResponse.json({ error: 'agendamento_id obrigatório' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // Buscar o agendamento
  const { data: agendamento } = await adminSupabase
    .from('agendamentos')
    .select('id, paciente_id, medico_id, data_hora, sala_video, status')
    .eq('id', agendamento_id)
    .single()

  if (!agendamento) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
  if (agendamento.status === 'cancelado') return NextResponse.json({ error: 'Agendamento cancelado' }, { status: 400 })

  // Verificar autorização: deve ser o paciente ou o médico do agendamento
  const { data: paciente } = await adminSupabase
    .from('pacientes').select('id').eq('usuario_id', user.id).single()
  const { data: medico } = await adminSupabase
    .from('medicos').select('id').eq('usuario_id', user.id).single()

  const isPaciente = paciente && agendamento.paciente_id === paciente.id
  const isMedico = medico && agendamento.medico_id === medico.id

  if (!isPaciente && !isMedico) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  let salaUrl = agendamento.sala_video

  // Se a sala ainda não existe, criar no Daily.co
  if (!salaUrl) {
    const nomeSala = `agendada-${agendamento_id.slice(0, 8)}-${Date.now()}`
    const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: nomeSala,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 14400, // 4 horas de validade
          enable_chat: true,
          enable_screenshare: true,
        },
      }),
    })

    if (!dailyRes.ok) {
      const err = await dailyRes.text()
      console.error('Daily.co error:', err)
      return NextResponse.json({ error: 'Erro ao criar sala de vídeo' }, { status: 500 })
    }

    salaUrl = `https://${process.env.DAILY_DOMAIN}/${nomeSala}`

    // Salvar a URL da sala no agendamento
    await adminSupabase
      .from('agendamentos')
      .update({ sala_video: salaUrl })
      .eq('id', agendamento_id)
  }

  // Buscar ou criar o atendimento vinculado a este agendamento
  const { data: atendimentoExistente } = await adminSupabase
    .from('atendimentos')
    .select('id')
    .eq('agendamento_id', agendamento_id)
    .single()

  let atendimentoId = atendimentoExistente?.id

  if (!atendimentoId) {
    const { data: novoAtendimento, error } = await adminSupabase
      .from('atendimentos')
      .insert({
        paciente_id: agendamento.paciente_id,
        medico_id: agendamento.medico_id,
        agendamento_id,
        tipo: 'virtual',
        status: 'em_andamento',
        sala_video: salaUrl,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar atendimento:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    atendimentoId = novoAtendimento.id
  }

  return NextResponse.json({ salaUrl, atendimentoId })
}
