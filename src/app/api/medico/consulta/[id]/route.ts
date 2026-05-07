import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Verificar se é médico autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  // Verificar se o usuário é médico aprovado
  const { data: medico } = await admin
    .from('medicos')
    .select('id, nome, especialidade, crm, crm_uf, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Buscar atendimento
  const { data: atendimento } = await admin
    .from('atendimentos')
    .select('id, sala_video, paciente_id, agendamento_id, medico_id, status')
    .eq('id', id)
    .single()

  if (!atendimento) {
    return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 })
  }

  // Buscar paciente (admin bypassa RLS)
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome, cpf, telefone, data_nascimento, sexo')
    .eq('id', atendimento.paciente_id)
    .single()

  // Buscar agendamento se houver
  let agendamento = null
  if (atendimento.agendamento_id) {
    const { data: ag } = await admin
      .from('agendamentos')
      .select('data_hora, observacoes')
      .eq('id', atendimento.agendamento_id)
      .single()
    agendamento = ag
  }

  return NextResponse.json({
    atendimento,
    paciente,
    medico,
    agendamento,
  })
}
