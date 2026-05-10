import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { tipo_receita, receita_id, medicamentos, instrucoes, cpf, telefone, consentimento_em } = body

  if (!tipo_receita || !medicamentos) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar paciente e empresa
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, cpf')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  // Buscar empresa_id via empresa_pacientes
  const { data: ep } = await admin
    .from('empresa_pacientes')
    .select('empresa_id')
    .eq('paciente_id', paciente.id)
    .single()

  const { data, error } = await admin
    .from('solicitacoes_renovacao')
    .insert({
      paciente_id:           paciente.id,
      empresa_id:            ep?.empresa_id ?? null,
      tipo_receita,
      receita_referencia_id: receita_id ?? null,
      medicamentos,
      instrucoes:            instrucoes ?? null,
      status:                'pendente',
      consentimento_lgpd:    true,
      cpf_confirmado:        cpf || paciente.cpf || null,
      telefone_contato:      telefone || null,
      consentimento_em:      consentimento_em || new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

// ── Atualizar status (usado pelo médico ao atender) ───────────────────────────
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { id, status, medico_id } = body

  if (!id || !status) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const admin = createAdminClient()

  const { error } = await admin
    .from('solicitacoes_renovacao')
    .update({ status, medico_id: medico_id ?? null, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
