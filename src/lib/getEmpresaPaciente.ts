import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server'

export interface EmpresaPacienteData {
  logoUrl: string | null
  corPrimaria: string | null
  empresaNome: string | null
  empresaId: string | null
}

/**
 * Busca os dados de branding da empresa do paciente.
 * Usa cache() do React para deduplicar queries dentro do mesmo request server-side —
 * layout e páginas chamam esta função sem fazer múltiplas viagens ao banco.
 */
export const getEmpresaPaciente = cache(async (pacienteId: string): Promise<EmpresaPacienteData> => {
  const adminSupabase = createAdminClient()

  const { data: vinculo } = await adminSupabase
    .from('vinculos_empresa')
    .select('empresa_id')
    .eq('paciente_id', pacienteId)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!vinculo?.empresa_id) {
    return { logoUrl: null, corPrimaria: null, empresaNome: null, empresaId: null }
  }

  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('id, nome, logo_url, cor_primaria')
    .eq('id', vinculo.empresa_id)
    .single()

  return {
    logoUrl: empresa?.logo_url ?? null,
    corPrimaria: empresa?.cor_primaria ?? null,
    empresaNome: empresa?.nome ?? null,
    empresaId: empresa?.id ?? null,
  }
})
