import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { Activity, Stethoscope, CheckCircle2 } from 'lucide-react'
import AdminHeader from '../components/AdminHeader'
import FiltrosPacientes from './FiltrosPacientes'
import ListaPacientesClient from './ListaPacientesClient'
import { Suspense } from 'react'

interface Props {
  searchParams: Promise<{
    empresa_id?: string
    tipo?: string
    consultas?: string
    nome?: string
    cadastro_de?: string
    cadastro_ate?: string
  }>
}

export default async function AdminPacientesPage({ searchParams }: Props) {
  await requireAdmin()
  const { empresa_id, tipo, consultas, nome, cadastro_de, cadastro_ate } = await searchParams
  const adminSupabase = createAdminClient()

  // Buscar empresas para o filtro
  const { data: empresas } = await adminSupabase
    .from('empresas')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  // Buscar pacientes (sem join de consultas — faremos separado)
  const { data: todosPacientes } = await adminSupabase
    .from('pacientes')
    .select('id, nome, cpf, telefone, convenio, criado_em')
    .order('criado_em', { ascending: false })

  const pacienteIds = (todosPacientes ?? []).map(p => p.id)

  // Buscar atendimentos concluídos (consultas via triagem/fila)
  const { data: atendimentos } = pacienteIds.length > 0
    ? await adminSupabase
        .from('atendimentos')
        .select('paciente_id, finalizado_em, criado_em')
        .in('paciente_id', pacienteIds)
        .eq('status', 'concluido')
        .order('finalizado_em', { ascending: false })
    : { data: [] }

  // Buscar agendamentos concluídos (consultas agendadas)
  const { data: agendamentos } = pacienteIds.length > 0
    ? await adminSupabase
        .from('agendamentos')
        .select('paciente_id, data_hora')
        .in('paciente_id', pacienteIds)
        .eq('status', 'concluido')
        .order('data_hora', { ascending: false })
    : { data: [] }

  // Mapas: paciente_id → contagens + último atendimento
  const atendMap: Record<string, number> = {}
  const ultimoAtendMap: Record<string, string> = {}  // paciente_id → ISO date string
  for (const a of atendimentos ?? []) {
    atendMap[a.paciente_id] = (atendMap[a.paciente_id] ?? 0) + 1
    const dataA = a.finalizado_em ?? a.criado_em
    if (dataA && (!ultimoAtendMap[a.paciente_id] || dataA > ultimoAtendMap[a.paciente_id])) {
      ultimoAtendMap[a.paciente_id] = dataA
    }
  }
  const agendMap: Record<string, number> = {}
  for (const a of agendamentos ?? []) {
    agendMap[a.paciente_id] = (agendMap[a.paciente_id] ?? 0) + 1
    const dataA = a.data_hora
    if (dataA && (!ultimoAtendMap[a.paciente_id] || dataA > ultimoAtendMap[a.paciente_id])) {
      ultimoAtendMap[a.paciente_id] = dataA
    }
  }

  // Buscar vínculos para cruzar CPFs
  const cpfs = (todosPacientes ?? []).map(p => p.cpf).filter(Boolean) as string[]
  const { data: vinculos } = cpfs.length > 0
    ? await adminSupabase
        .from('vinculos_empresa')
        .select('cpf, empresa_id, cargo, departamento, empresas(id, nome)')
        .in('cpf', cpfs)
    : { data: [] }

  const vinculoMap: Record<string, any> = {}
  vinculos?.forEach(v => { if (v.cpf) vinculoMap[v.cpf] = v })

  // Enriquecer pacientes
  const pacientesEnriquecidos = (todosPacientes ?? []).map(p => ({
    ...p,
    totalAtend: atendMap[p.id] ?? 0,    // consultas via triagem
    totalAgend: agendMap[p.id] ?? 0,    // consultas agendadas
    totalConsultas: (atendMap[p.id] ?? 0) + (agendMap[p.id] ?? 0),
    ultimoAtend: ultimoAtendMap[p.id] ?? null,
    vinculo: p.cpf ? vinculoMap[p.cpf] ?? null : null,
  }))

  // Ordenar: mais recentemente atendido primeiro; sem atendimento → por criado_em desc
  pacientesEnriquecidos.sort((a, b) => {
    if (a.ultimoAtend && b.ultimoAtend) return b.ultimoAtend.localeCompare(a.ultimoAtend)
    if (a.ultimoAtend) return -1
    if (b.ultimoAtend) return 1
    return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  })

  // Helpers de data para filtros
  const nomeLower = (nome ?? '').toLowerCase().trim()
  const tsInicio = cadastro_de ? new Date(cadastro_de + 'T00:00:00-03:00').getTime() : null
  const tsFim    = cadastro_ate ? new Date(cadastro_ate + 'T23:59:59-03:00').getTime() : null

  // Aplicar filtros
  let pacientesFiltrados = pacientesEnriquecidos.filter(p => {
    if (empresa_id === 'particular') {
      if (p.vinculo) return false
    } else if (empresa_id) {
      if (!p.vinculo || (p.vinculo.empresas as any)?.id !== empresa_id) return false
    }
    if (tipo === 'vinculado' && !p.vinculo) return false
    if (tipo === 'particular' && p.vinculo) return false
    if (consultas === 'sim' && p.totalConsultas === 0) return false
    if (consultas === 'nao' && p.totalConsultas > 0) return false
    if (nomeLower && !p.nome.toLowerCase().includes(nomeLower)) return false
    if (tsInicio && new Date(p.criado_em).getTime() < tsInicio) return false
    if (tsFim && new Date(p.criado_em).getTime() > tsFim) return false
    return true
  })

  // KPIs
  const total = todosPacientes?.length ?? 0
  const comEmpresa = pacientesEnriquecidos.filter(p => p.vinculo).length
  const comAtendimento = pacientesEnriquecidos.filter(p => p.totalAtend > 0).length
  const comAgendamento = pacientesEnriquecidos.filter(p => p.totalAgend > 0).length
  const totalAtendimentos = (atendimentos ?? []).length

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader ativo="pacientes" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A3A2C] flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" /> Pacientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">{total} paciente(s) cadastrado(s) na plataforma</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-[#1A3A2C]">{total}</p>
            <p className="text-xs text-gray-500 mt-1">total cadastrados</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-purple-600">{comEmpresa}</p>
            <p className="text-xs text-gray-500 mt-1">vinculados a empresa</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-4 h-4 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{totalAtendimentos}</p>
            </div>
            <p className="text-xs text-gray-500">consultas via triagem</p>
            <p className="text-xs text-gray-400 mt-0.5">{comAtendimento} paciente{comAtendimento !== 1 ? 's' : ''} atendido{comAtendimento !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-blue-500">{comAgendamento}</p>
            <p className="text-xs text-gray-500 mt-1">com consulta agendada</p>
          </div>
        </div>

        {/* Filtros */}
        <Suspense fallback={null}>
          <FiltrosPacientes
            empresas={empresas ?? []}
            total={pacientesFiltrados.length}
            nomeInicial={nome ?? ''}
            cadastroDeInicial={cadastro_de ?? ''}
            cadastroAteInicial={cadastro_ate ?? ''}
          />
        </Suspense>

        {/* Tabela com paginação */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#1A3A2C]">
              Lista de pacientes
              {pacientesFiltrados.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({pacientesFiltrados.length} registro{pacientesFiltrados.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
          </div>

          <ListaPacientesClient pacientes={pacientesFiltrados} />
        </div>
      </main>
    </div>
  )
}
