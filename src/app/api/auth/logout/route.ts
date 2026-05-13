import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const admin = createAdminClient()
    const agora = new Date().toISOString()

    // Fechar a sessão aberta mais recente desse usuário
    const { data: sessao } = await admin
      .from('sessoes_sistema')
      .select('id, login_em')
      .eq('usuario_id', user.id)
      .is('logout_em', null)
      .order('login_em', { ascending: false })
      .limit(1)
      .single()

    if (sessao) {
      const duracao = Math.round(
        (new Date(agora).getTime() - new Date(sessao.login_em).getTime()) / 1000
      )
      await admin
        .from('sessoes_sistema')
        .update({ logout_em: agora, duracao_segundos: duracao })
        .eq('id', sessao.id)
    }
  }

  await supabase.auth.signOut()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(new URL('/login', baseUrl), { status: 302 })
}
