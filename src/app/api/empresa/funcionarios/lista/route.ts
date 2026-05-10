import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  // Identificar a empresa do usuário logado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis_sistema')
    .select('role, empresa_id')
    .eq('usuario_id', user.id)
    .single()

  if (!perfil || perfil.role !== 'empresa' || !perfil.empresa_id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const empresaId = perfil.empresa_id

  const { data: vinculos, error } = await admin
    .from('vinculos_empresa')
    .select(`
      id, nome_completo, cpf, email,
      cargo, tipo_cargo, departamento,
      relacao, nome_mae, nome_social,
      data_admissao, ativo, paciente_id
    `)
    .eq('empresa_id', empresaId)
    .order('nome_completo', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ vinculos: vinculos ?? [] })
}
