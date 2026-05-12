import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Verificar autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  // Verificar se o usuário é médico aprovado
  const { data: medico } = await admin
    .from('medicos')
    .select('id, nome, especialidade, crm, crm_uf, status, sexo')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Buscar atendimento com triagem
  const { data: atendimento } = await admin
    .from('atendimentos')
    .select('id, sala_video, paciente_id, agendamento_id, medico_id, status, notas_medico, iniciado_em, criado_em')
    .eq('id', id)
    .single()

  if (!atendimento) {
    return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 })
  }

  // Buscar triagem (se existir)
  const { data: triagem } = await admin
    .from('triagens')
    .select('classificacao_risco, resumo_ia')
    .eq('atendimento_id', id)
    .maybeSingle()

  // Buscar paciente com todos os campos necessários para o atestado
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome, cpf, telefone, data_nascimento, sexo')
    .eq('id', atendimento.paciente_id)
    .single()

  // Marcar como em_andamento se ainda aguardando
  if (atendimento.status === 'aguardando') {
    await admin
      .from('atendimentos')
      .update({
        status: 'em_andamento',
        medico_id: medico.id,
        iniciado_em: new Date().toISOString(),
      })
      .eq('id', id)
  }

  return NextResponse.json({
    atendimento,
    triagem,
    paciente,
    medico,
  })
}
