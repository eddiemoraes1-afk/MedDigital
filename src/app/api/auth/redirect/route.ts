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

  // Verificar perfis_sistema primeiro (admin, empresa, médico aprovado via sistema B2B)
  const { data: perfilSistema } = await adminSupabase
    .from('perfis_sistema')
    .select('role')
    .eq('usuario_id', user.id)
    .single()

  if (perfilSistema?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin', baseUrl))
  }
  if (perfilSistema?.role === 'empresa') {
    return NextResponse.redirect(new URL('/empresa/dashboard', baseUrl))
  }

  // Fallback: verificar tabela perfis (médicos e pacientes)
  const { data: perfil } = await adminSupabase
    .from('perfis')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (perfil?.tipo === 'medico') {
    return NextResponse.redirect(new URL('/medico/dashboard', baseUrl))
  }

  // Verificar se é médico aprovado
  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('id, status')
    .eq('usuario_id', user.id)
    .single()

  if (medico) {
    return NextResponse.redirect(new URL('/medico/dashboard', baseUrl))
  }

  return NextResponse.redirect(new URL('/paciente/dashboard', baseUrl))
}
