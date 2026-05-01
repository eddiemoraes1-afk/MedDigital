import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Rota temporária para resetar senha do admin - DELETAR APÓS USO
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const email = searchParams.get('email')
  const novaSenha = searchParams.get('senha')

  if (secret !== 'meddigital2025reset') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  if (!email || !novaSenha) {
    return NextResponse.json({ erro: 'Email e senha obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Busca o usuário pelo email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ erro: listError.message }, { status: 500 })
  }

  const user = users.users.find(u => u.email === email)
  if (!user) {
    return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
  }

  // Atualiza a senha
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: novaSenha,
  })

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true, mensagem: 'Senha atualizada. Delete esta rota agora!' })
}
