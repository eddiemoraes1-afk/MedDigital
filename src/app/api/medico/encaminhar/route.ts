import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: medicoAtual } = await supabase
    .from('medicos')
    .select('id, nome, sexo')
    .eq('usuario_id', user.id)
    .single()

  if (!medicoAtual) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { tipo, paciente_id, medico_destino_id, sala_video, observacoes, data_hora } = body

  if (!tipo || !paciente_id || !medico_destino_id) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  const titulo = medicoAtual.sexo === 'F' ? 'Dra.' : 'Dr.'
  const headerEnc = `[Encaminhado por ${titulo} ${medicoAtual.nome}]`
  const notasFinal = observacoes
    ? `${headerEnc}\n${observacoes}`
    : headerEnc

  // ── Encaminhamento imediato: paciente entra na fila virtual do especialista ─
  if (tipo === 'imediato') {
    const { data, error } = await adminSupabase
      .from('atendimentos')
      .insert({
        paciente_id,
        medico_id: medico_destino_id,
        status: 'aguardando',
        tipo: 'virtual',
        sala_video: sala_video ?? null,
        notas_medico: notasFinal,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tipo: 'imediato', atendimento_id: data.id })
  }

  // ── Encaminhamento agendado: cria agendamento na agenda do especialista ─────
  if (tipo === 'agendado') {
    if (!data_hora) {
      return NextResponse.json({ error: 'data_hora obrigatória para agendamento' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('agendamentos')
      .insert({
        paciente_id,
        medico_id: medico_destino_id,
        data_hora,
        status: 'agendado',
        observacoes: notasFinal,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tipo: 'agendado', agendamento_id: data.id })
  }

  return NextResponse.json({ error: 'Tipo inválido. Use "imediato" ou "agendado".' }, { status: 400 })
}
