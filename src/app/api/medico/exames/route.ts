import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getMedico() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: medico } = await admin
    .from('medicos')
    .select('id, status, nome')
    .eq('usuario_id', user.id)
    .single()
  if (!medico || medico.status !== 'aprovado') return null
  return medico
}

// POST — criar solicitação de exames
export async function POST(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    paciente_id,
    atendimento_id,
    exames,
    indicacao_clinica,
    observacoes,
    urgencia,
    data_solicitacao,
  } = body

  if (!paciente_id || !exames?.trim()) {
    return NextResponse.json({ error: 'paciente_id e exames são obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar empresa vinculada ao paciente
  const { data: pac } = await admin.from('pacientes').select('cpf').eq('id', paciente_id).single()
  let empresa_id: string | null = null
  if (pac?.cpf) {
    const { data: vinculo } = await admin
      .from('vinculos_empresa')
      .select('empresa_id')
      .eq('cpf', pac.cpf)
      .maybeSingle()
    empresa_id = vinculo?.empresa_id ?? null
  }

  const { data, error } = await admin
    .from('solicitacoes_exames')
    .insert({
      paciente_id,
      medico_id: medico.id,
      atendimento_id: atendimento_id || null,
      empresa_id,
      exames: exames.trim(),
      indicacao_clinica: indicacao_clinica || null,
      observacoes: observacoes || null,
      urgencia: urgencia || 'normal',
      data_solicitacao: data_solicitacao || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ solicitacao: data })
}

// GET — listar solicitações de exames de um paciente
export async function GET(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const paciente_id = searchParams.get('paciente_id')
  if (!paciente_id) return NextResponse.json({ error: 'paciente_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('solicitacoes_exames')
    .select('*, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', paciente_id)
    .order('criado_em', { ascending: false })

  return NextResponse.json({ exames: data ?? [] })
}
