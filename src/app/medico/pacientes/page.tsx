import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import FiltrosPacientesMedico from './FiltrosPacientesMedico'
import MedicoHeader from '../MedicoHeader'

export default async function MedicoPacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('id, nome, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') redirect('/medico/dashboard')

  // Buscar todos os pacientes
  const { data: pacientes } = await adminSupabase
    .from('pacientes')
    .select('id, nome, cpf, telefone, data_nascimento')
    .order('nome', { ascending: true })

  if (!pacientes || pacientes.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center">
        <p className="text-gray-400">Nenhum paciente cadastrado.</p>
      </div>
    )
  }

  const pacienteIds = pacientes.map(p => p.id)

  // Buscar última triagem de cada paciente
  const { data: todasTriagens } = await adminSupabase
    .from('triagens')
    .select('paciente_id, classificacao_risco, resumo_ia, criado_em')
    .in('paciente_id', pacienteIds)
    .order('criado_em', { ascending: false })

  // Buscar contagem de atendimentos por paciente
  const { data: todosAtendimentos } = await adminSupabase
    .from('atendimentos')
    .select('paciente_id')
    .in('paciente_id', pacienteIds)

  // Montar mapa: paciente_id → última triagem
  const ultimaTriagemMap: Record<string, any> = {}
  for (const t of todasTriagens ?? []) {
    if (!ultimaTriagemMap[t.paciente_id]) {
      ultimaTriagemMap[t.paciente_id] = t
    }
  }

  // Montar mapa: paciente_id → total de triagens
  const totalTriagensMap: Record<string, number> = {}
  for (const t of todasTriagens ?? []) {
    totalTriagensMap[t.paciente_id] = (totalTriagensMap[t.paciente_id] || 0) + 1
  }

  // Montar mapa: paciente_id → total de atendimentos
  const totalAtendMap: Record<string, number> = {}
  for (const a of todosAtendimentos ?? []) {
    totalAtendMap[a.paciente_id] = (totalAtendMap[a.paciente_id] || 0) + 1
  }

  // Montar lista final enriquecida
  const pacientesEnriquecidos = pacientes.map(p => ({
    id: p.id,
    nome: p.nome,
    cpf: p.cpf ?? null,
    telefone: p.telefone ?? null,
    data_nascimento: p.data_nascimento ?? null,
    ultima_triagem: ultimaTriagemMap[p.id] ?? null,
    total_triagens: totalTriagensMap[p.id] ?? 0,
    total_atendimentos: totalAtendMap[p.id] ?? 0,
  }))

  // Ordenar: primeiro quem tem triagem recente de risco alto, depois por nome
  const ordemRisco: Record<string, number> = { vermelho: 0, laranja: 1, amarelo: 2, verde: 3 }
  pacientesEnriquecidos.sort((a, b) => {
    const ra = ordemRisco[a.ultima_triagem?.classificacao_risco ?? ''] ?? 4
    const rb = ordemRisco[b.ultima_triagem?.classificacao_risco ?? ''] ?? 4
    if (ra !== rb) return ra - rb
    return a.nome.localeCompare(b.nome)
  })

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader titulo="Prontuários" backHref="/medico/dashboard" medicoNome={medico.nome} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#1A3A2C] rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A3A2C]">Prontuários dos Pacientes</h1>
            <p className="text-sm text-gray-400">
              {pacientesEnriquecidos.length} {pacientesEnriquecidos.length === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'}
            </p>
          </div>
        </div>

        <FiltrosPacientesMedico pacientes={pacientesEnriquecidos} />
      </main>
    </div>
  )
}
