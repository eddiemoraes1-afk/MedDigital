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
    .select('id, nome, status, sexo, foto_url')
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

  // Buscar triagens, atendimentos, atestados e exclusões em paralelo
  const [
    { data: todasTriagens },
    { data: todosAtendimentos },
    { data: todosAtestados },
    { data: todasExclusoes },
  ] = await Promise.all([
    adminSupabase
      .from('triagens')
      .select('paciente_id, classificacao_risco, resumo_ia, criado_em')
      .in('paciente_id', pacienteIds)
      .order('criado_em', { ascending: false }),
    adminSupabase
      .from('atendimentos')
      .select('paciente_id')
      .in('paciente_id', pacienteIds)
      .eq('status', 'concluido'),
    adminSupabase
      .from('atestados')
      .select('paciente_id')
      .in('paciente_id', pacienteIds),
    adminSupabase
      .from('exclusoes_telemedicina')
      .select('paciente_id')
      .in('paciente_id', pacienteIds),
  ])

  // Montar mapas
  const ultimaTriagemMap: Record<string, any> = {}
  const totalTriagensMap: Record<string, number> = {}
  for (const t of todasTriagens ?? []) {
    if (!ultimaTriagemMap[t.paciente_id]) ultimaTriagemMap[t.paciente_id] = t
    totalTriagensMap[t.paciente_id] = (totalTriagensMap[t.paciente_id] || 0) + 1
  }

  const totalAtendMap: Record<string, number> = {}
  for (const a of todosAtendimentos ?? []) {
    totalAtendMap[a.paciente_id] = (totalAtendMap[a.paciente_id] || 0) + 1
  }

  const totalAtestadosMap: Record<string, number> = {}
  for (const a of todosAtestados ?? []) {
    totalAtestadosMap[a.paciente_id] = (totalAtestadosMap[a.paciente_id] || 0) + 1
  }

  const totalExclusoesMap: Record<string, number> = {}
  for (const e of todasExclusoes ?? []) {
    totalExclusoesMap[e.paciente_id] = (totalExclusoesMap[e.paciente_id] || 0) + 1
  }

  // Montar lista final enriquecida (sem ordenação — feita no client)
  const pacientesEnriquecidos = pacientes.map(p => ({
    id: p.id,
    nome: p.nome,
    cpf: p.cpf ?? null,
    telefone: p.telefone ?? null,
    data_nascimento: p.data_nascimento ?? null,
    ultima_triagem: ultimaTriagemMap[p.id] ?? null,
    total_triagens: totalTriagensMap[p.id] ?? 0,
    total_atendimentos: totalAtendMap[p.id] ?? 0,
    total_atestados: totalAtestadosMap[p.id] ?? 0,
    total_exames: 0,
    total_receitas: 0,
    total_exclusoes: totalExclusoesMap[p.id] ?? 0,
  }))

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader titulo="Prontuários" backHref="/medico/dashboard" medicoNome={medico.nome} medicoSexo={medico.sexo} medicoFotoUrl={medico.foto_url} />

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
