import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: medico } = await admin
    .from('medicos')
    .select('id')
    .eq('usuario_id', user.id)
    .single()
  if (!medico) return NextResponse.json({ error: 'Médico não encontrado' }, { status: 403 })

  const body = await req.json()
  const {
    atendimento_id, paciente_id,
    status, motivos, motivo_outro,
    conduta, ciente_paciente, observacoes,
  } = body

  if (!paciente_id || !status || !conduta) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('exclusoes_telemedicina')
    .insert({
      atendimento_id: atendimento_id || null,
      paciente_id,
      medico_id:      medico.id,
      status,
      motivos:        motivos ?? [],
      motivo_outro:   motivo_outro || null,
      conduta,
      ciente_paciente: ciente_paciente ?? false,
      observacoes:    observacoes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { searchParams } = new URL(req.url)
  const atendimento_id = searchParams.get('atendimento_id')
  const paciente_id    = searchParams.get('paciente_id')

  let query = admin
    .from('exclusoes_telemedicina')
    .select('*, medicos(nome, crm, especialidade)')
    .order('criado_em', { ascending: false })

  if (atendimento_id) query = query.eq('atendimento_id', atendimento_id)
  else if (paciente_id) query = query.eq('paciente_id', paciente_id)
  else return NextResponse.json({ error: 'Parâmetro obrigatório ausente' }, { status: 400 })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
