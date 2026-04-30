import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, senha, nome, tipo, cpf, telefone, crm, crm_uf, especialidade } = body

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
    const { error } = await adminSupabase.from('pacientes').insert({
      usuario_id: userId,
      nome,
      cpf: cpf?.replace(/\D/g, '') || null,
      telefone: telefone?.replace(/\D/g, '') || null,
    })
    if (error) {
      console.error('Erro ao inserir paciente:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
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
