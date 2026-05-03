import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis_sistema')
    .select('role')
    .eq('usuario_id', user.id)
    .single()
  if (perfil?.role !== 'admin') return null
  return user
}

export async function POST(request: NextRequest) {
  const user = await verificarAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { nome, cnpj, email_contato, telefone_contato, email_portal, senha_portal } = await request.json()

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!email_portal?.trim()) return NextResponse.json({ error: 'E-mail de portal obrigatório' }, { status: 400 })
  if (!senha_portal || senha_portal.length < 6) return NextResponse.json({ error: 'Senha mínima: 6 caracteres' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // 1. Criar empresa
  const { data: empresa, error: errEmpresa } = await adminSupabase
    .from('empresas')
    .insert({ nome: nome.trim(), cnpj: cnpj?.trim() || null, email_contato: email_contato?.trim() || null, telefone_contato: telefone_contato?.trim() || null })
    .select('id')
    .single()

  if (errEmpresa) return NextResponse.json({ error: errEmpresa.message }, { status: 500 })

  // 2. Criar usuário no Supabase Auth para o portal RH
  const { data: authUser, error: errAuth } = await adminSupabase.auth.admin.createUser({
    email: email_portal.trim(),
    password: senha_portal,
    email_confirm: true,
  })

  if (errAuth) {
    // Rollback empresa
    await adminSupabase.from('empresas').delete().eq('id', empresa.id)
    return NextResponse.json({ error: 'Erro ao criar usuário: ' + errAuth.message }, { status: 500 })
  }

  // 3. Criar perfil de sistema para o usuário RH
  const { error: errPerfil } = await adminSupabase
    .from('perfis_sistema')
    .insert({
      usuario_id: authUser.user.id,
      role: 'empresa',
      empresa_id: empresa.id,
    })

  if (errPerfil) {
    await adminSupabase.auth.admin.deleteUser(authUser.user.id)
    await adminSupabase.from('empresas').delete().eq('id', empresa.id)
    return NextResponse.json({ error: errPerfil.message }, { status: 500 })
  }

  return NextResponse.json({ id: empresa.id })
}
