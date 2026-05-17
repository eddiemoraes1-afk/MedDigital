import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Activity, User, Phone, FileText, Building2, Calendar, CheckCircle2, Stethoscope } from 'lucide-react'
import AdminHeader from '../components/AdminHeader'
import FiltrosPacientes from './FiltrosPacientes'
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

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#1A3A2C]">Lista de pacientes</h2>
          </div>

          {pacientesFiltrados.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Nenhum paciente encontrado com esses filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CPF</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contato</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultas</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Último atend.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pacientesFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <Link
                              href={`/admin/pacientes/${p.id}`}
                              className="font-medium text-[#5BBD9B] hover:underline"
                            >
                              {p.nome}
                            </Link>
                            {p.convenio && <p className="text-xs text-gray-400">{p.convenio}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.cpf ? (
                          <span className="font-mono text-xs text-gray-600 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-gray-400" />{p.cpf}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {p.telefone ? (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />{p.telefone}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {p.vinculo ? (
                          <div>
                            <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {(p.vinculo.empresas as any)?.nome ?? '—'}
                            </span>
                            {p.vinculo.cargo && <p className="text-xs text-gray-400 mt-0.5">{p.vinculo.cargo}</p>}
                          </div>
                        ) : <span className="text-xs text-gray-300">Particular</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {p.totalAtend > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                              <Stethoscope className="w-3 h-3" />
                              {p.totalAtend} via triagem
                            </span>
                          )}
                          {p.totalAgend > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {p.totalAgend} agendada{p.totalAgend !== 1 ? 's' : ''}
                            </span>
                          )}
                          {p.totalConsultas === 0 && (
                            <span className="text-xs text-gray-400 px-2">0 consultas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.ultimoAtend ? (
                          <span className="text-xs text-[#5BBD9B] font-medium flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" />
                            {new Date(p.ultimoAtend).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
