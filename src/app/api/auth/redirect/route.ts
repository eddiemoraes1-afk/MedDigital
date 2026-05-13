import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!user) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const adminSupabase = createAdminClient()

  // Determinar perfil
  let perfil = 'paciente'

  const { data: perfilSistema } = await adminSupabase
    .from('perfis_sistema')
    .select('role')
    .eq('usuario_id', user.id)
    .single()

  if (perfilSistema?.role === 'admin')   perfil = 'admin'
  if (perfilSistema?.role === 'empresa') perfil = 'empresa'

  if (perfil === 'paciente') {
    const { data: medico } = await adminSupabase
      .from('medicos')
      .select('id')
      .eq('usuario_id', user.id)
      .single()
    if (medico) perfil = 'medico'
  }

  // Registrar login (fire-and-forget — não bloqueia o redirect)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  adminSupabase
    .from('sessoes_sistema')
    .insert({
      usuario_id: user.id,
      email:      user.email ?? '',
      perfil,
      login_em:   new Date().toISOString(),
      ip,
    })
    .then()  // async, não esperamos

  // Redirecionar conforme perfil
  if (perfil === 'admin')   return NextResponse.redirect(new URL('/admin', baseUrl))
  if (perfil === 'empresa') return NextResponse.redirect(new URL('/empresa/dashboard', baseUrl))

  // Médicos e pacientes: checar perfis antigos se necessário
  const { data: perfilAntigo } = await adminSupabase
    .from('perfis')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (perfilAntigo?.tipo === 'medico' || perfil === 'medico') {
    return NextResponse.redirect(new URL('/medico/dashboard', baseUrl))
  }

  return NextResponse.redirect(new URL('/paciente/dashboard', baseUrl))
}
