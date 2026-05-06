import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/paciente/me
 * Retorna os dados do paciente logado usando adminClient (bypassa RLS).
 * Funciona tanto para pacientes vinculados a empresa quanto para particulares.
 */
export async function GET() {
  // 1. Verificar autenticação via cliente normal (respeita sessão)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Buscar dados do paciente com adminClient (sem RLS)
  const adminSupabase = createAdminClient()
  const { data: paciente, error } = await adminSupabase
    .from('pacientes')
    .select('id, nome, cpf, telefone, data_nascimento, sexo')
    .eq('usuario_id', user.id)
    .single()

  if (error || !paciente) {
    // Paciente não tem registro ainda — retorna dados do auth como fallback
    const meta = user.user_metadata ?? {}
    return NextResponse.json({
      id: null,
      nome: meta.nome || meta.full_name || '',
      cpf: meta.cpf || '',
      telefone: meta.telefone || meta.phone || '',
      data_nascimento: null,
      sexo: null,
    })
  }

  return NextResponse.json({
    id: paciente.id,
    nome: paciente.nome || '',
    cpf: paciente.cpf || '',
    telefone: paciente.telefone || '',
    data_nascimento: paciente.data_nascimento || null,
    sexo: paciente.sexo || null,
  })
}
