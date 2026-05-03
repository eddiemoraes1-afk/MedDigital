import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, senha, nome, tipo, cpf, telefone, data_nascimento, sexo, crm, crm_uf, especialidade } = body

  const adminSupabase = createAdminClient()

  // Criar usuário via admin (evita problemas de confirmação de email)
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // confirma automaticamente
    user_metadata: { nome, tipo }
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // Criar registro na tabela correspondente
  if (tipo === 'paciente') {
    const cpfLimpo = cpf?.replace(/\D/g, '') || null

    const { data: novoPaciente, error } = await adminSupabase.from('pacientes').insert({
      usuario_id: userId,
      nome,
      cpf: cpfLimpo,
      telefone: telefone?.replace(/\D/g, '') || null,
      data_nascimento: data_nascimento || null,
      sexo: sexo || null,
    }).select('id').single()

    if (error) {
      console.error('Erro ao inserir paciente:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Vínculo automático: se o CPF constar em vinculos_empresa, linkar paciente_id
    if (cpfLimpo && novoPaciente?.id) {
      await adminSupabase
        .from('vinculos_empresa')
        .update({ paciente_id: novoPaciente.id })
        .eq('cpf', cpfLimpo)
        .is('paciente_id', null)
    }
  } else {
    const { error } = await adminSupabase.from('medicos').insert({
      usuario_id: userId,
      nome,
      crm,
      crm_uf,
      especialidade,
      telefone: telefone?.replace(/\D/g, '') || null,
      status: 'em_analise',
    })
    if (error) {
      console.error('Erro ao inserir médico:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
