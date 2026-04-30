import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // Usar cliente normal para ler a sessão do usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', 'http://localhost:3000'))
  }

  // Usar admin client (service role) para buscar perfil sem RLS bloqueando
  const adminSupabase = createAdminClient()
  const { data: perfil, error } = await adminSupabase
    .from('perfis')
    .select('tipo')
    .eq('id', user.id)
    .single()

  console.log('[redirect] user.id:', user.id, '| perfil:', perfil, '| error:', error)

  if (perfil?.tipo === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', 'http://localhost:3000'))
  } else if (perfil?.tipo === 'medico') {
    return NextResponse.redirect(new URL('/medico/dashboard', 'http://localhost:3000'))
  } else {
    return NextResponse.redirect(new URL('/paciente/dashboard', 'http://localhost:3000'))
  }
}
