import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!user) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const adminSupabase = createAdminClient()
  const { data: perfil } = await adminSupabase
    .from('perfis')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (perfil?.tipo === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', baseUrl))
  } else if (perfil?.tipo === 'medico') {
    return NextResponse.redirect(new URL('/medico/dashboard', baseUrl))
  } else {
    return NextResponse.redirect(new URL('/paciente/dashboard', baseUrl))
  }
}
