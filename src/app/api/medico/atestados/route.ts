import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getMedico() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: medico } = await admin.from('medicos').select('id, status').eq('usuario_id', user.id).single()
  if (!medico || medico.status !== 'aprovado') return null
  return medico
}

// POST — criar atestado
export async function POST(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { paciente_id, atendimento_id, data_inicio, data_fim, dias, cid, texto_complementar, observacoes } = body

  if (!paciente_id || !data_inicio || !data_fim || !dias) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar empresa vinculada ao paciente
  const { data: pac } = await admin.from('pacientes').select('cpf').eq('id', paciente_id).single()
  let empresa_id: string | null = null
  if (pac?.cpf) {
    const { data: vinculo } = await admin.from('vinculos_empresa').select('empresa_id').eq('cpf', pac.cpf).maybeSingle()
    empresa_id = vinculo?.empresa_id ?? null
  }

  const { data, error } = await admin.from('atestados').insert({
    paciente_id,
    medico_id: medico.id,
    atendimento_id: atendimento_id || null,
    empresa_id,
    data_emissao: new Date().toISOString().split('T')[0],
    data_inicio,
    data_fim,
    dias,
    cid: cid || null,
    texto_complementar: texto_complementar || null,
    observacoes: observacoes || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ atestado: data })
}

// GET — listar atestados de um paciente
export async function GET(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const paciente_id = searchParams.get('paciente_id')
  if (!paciente_id) return NextResponse.json({ error: 'paciente_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('atestados')
    .select('*, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', paciente_id)
    .order('criado_em', { ascending: false })

  return NextResponse.json({ atestados: data ?? [] })
}
