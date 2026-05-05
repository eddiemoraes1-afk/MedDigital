import { createClient, createAdminClient } from '@/lib/supabase/server'
import TemaProvider from './TemaProvider'
import { getEmpresaPaciente } from '@/lib/getEmpresaPaciente'

/**
 * Layout compartilhado de toda a área /paciente.
 * Busca empresa + cor da empresa UMA VEZ via getEmpresaPaciente (cache React),
 * e disponibiliza para todas as páginas via TemaProvider (React context).
 */
export default async function PacienteLayout({ children }: { children: React.ReactNode }) {
  // Tentar obter o usuário logado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let logoUrl: string | null = null
  let corPrimaria: string | null = null
  let empresaNome: string | null = null
  let pacienteNome: string | null = null

  if (user) {
    const adminSupabase = createAdminClient()

    // Buscar paciente
    const { data: paciente } = await adminSupabase
      .from('pacientes')
      .select('id, nome')
      .eq('usuario_id', user.id)
      .single()

    if (paciente) {
      pacienteNome = paciente.nome

      // Buscar empresa (deduplica com outras chamadas via cache React)
      const empresa = await getEmpresaPaciente(paciente.id)
      logoUrl = empresa.logoUrl
      corPrimaria = empresa.corPrimaria
      empresaNome = empresa.empresaNome
    }
  }

  return (
    <TemaProvider
      corPrimaria={corPrimaria}
      logoUrl={logoUrl}
      empresaNome={empresaNome}
      pacienteNome={pacienteNome}
    >
      {children}
    </TemaProvider>
  )
}
