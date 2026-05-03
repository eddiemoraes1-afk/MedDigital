import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type PerfilSistema = {
  role: 'admin' | 'empresa'
  empresaId?: string
  empresaNome?: string
  usuarioId: string
  email: string
}

/**
 * Verifica se o usuário logado tem perfil de sistema (admin ou empresa).
 * Redireciona para /login se não estiver autenticado.
 * Retorna null se autenticado mas sem perfil de sistema (ex: paciente, médico).
 */
export async function getPerfilSistema(): Promise<PerfilSistema | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()
  const { data: perfil } = await adminSupabase
    .from('perfis_sistema')
    .select('role, empresa_id')
    .eq('usuario_id', user.id)
    .single()

  if (!perfil) return null

  let empresaNome: string | undefined
  if (perfil.empresa_id) {
    const { data: emp } = await adminSupabase
      .from('empresas')
      .select('nome')
      .eq('id', perfil.empresa_id)
      .single()
    empresaNome = emp?.nome
  }

  return {
    role: perfil.role,
    empresaId: perfil.empresa_id ?? undefined,
    empresaNome,
    usuarioId: user.id,
    email: user.email ?? '',
  }
}

/**
 * Garante que o usuário é admin. Redireciona para /login se não for.
 */
export async function requireAdmin(): Promise<PerfilSistema> {
  const perfil = await getPerfilSistema()
  if (!perfil || perfil.role !== 'admin') redirect('/login')
  return perfil
}

/**
 * Garante que o usuário é empresa (ou admin). Redireciona corretamente se não for.
 */
export async function requireEmpresa(): Promise<PerfilSistema> {
  const perfil = await getPerfilSistema()
  if (!perfil) redirect('/login')
  if (perfil.role === 'admin') redirect('/admin')           // admin vai para o painel admin
  if (perfil.role !== 'empresa') redirect('/paciente/dashboard')
  return perfil
}
