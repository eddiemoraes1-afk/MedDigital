import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Retorna o perfil de sistema do usuário logado (role + empresa_id)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null)

  const adminSupabase = createAdminClient()
  const { data: perfil } = await adminSupabase
    .from('perfis_sistema')
    .select('role, empresa_id')
    .eq('usuario_id', user.id)
    .single()

  if (!perfil) return NextResponse.json(null)

  // Se admin: busca o primeiro médico cadastrado para uso nas páginas de médico
  let medicoId: string | null = null
  if (perfil.role === 'admin') {
    const { data: medico } = await adminSupabase
      .from('medicos')
      .select('id')
      .order('criado_em', { ascending: true })
      .limit(1)
      .single()
    medicoId = medico?.id ?? null
  }

  return NextResponse.json({ ...perfil, medicoId })
}
