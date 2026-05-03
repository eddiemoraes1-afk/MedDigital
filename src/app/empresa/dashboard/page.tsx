import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Heart, Building2, LogOut, Users, Calendar,
  TrendingUp, Activity, CheckCircle2, Clock,
  AlertCircle, UserX, Download
} from 'lucide-react'
import FiltrosFuncionarios from './FiltrosFuncionarios'
import { Suspense } from 'react'

interface Props {
  searchParams: Promise<{ departamento?: string; status?: string }>
}

export default async function EmpresaDashboardPage({ searchParams }: Props) {
  const perfil = await requireEmpresa()
  const adminSupabase = createAdminClient()
  const empresaId = perfil.empresaId!
  const { departamento, status } = await searchParams

  // Dados da empresa
  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('id, nome, cnpj')
    .eq('id', empresaId)
    .single()

  // Funcionários com vínculo
  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select('id, nome_completo, cpf, cargo, departamento, email, ativo, paciente_id, data_admissao')
    .eq('empresa_id', empresaId)
    .order('nome_completo', { ascending: true })

  // Contagem e última consulta por paciente
  const pacienteIds = vinculos?.filter(v => v.paciente_id).map(v => v.paciente_id) ?? []

  let consultasPorPaciente: Record<string, { total: number; ultima: string | null }> = {}
  let agendamentosRecentes: any[] = []
  let totalConsultasMes = 0

  if (pacienteIds.length > 0) {
    // Todas as consultas dos funcionários (para contar e pegar última)
    const { data: todasConsultas } = await adminSupabase
      .from('agendamentos')
      .select('id, paciente_id, data_hora, status')
      .in('paciente_id', pacienteIds)
      .neq('status', 'cancelado')
      .order('data_hora', { ascending: false })

    todasConsultas?.forEach(c => {
      if (!consultasPorPaciente[c.paciente_id]) {
        consultasPorPaciente[c.paciente_id] = { total: 0, ultima: null }
      }
      consultasPorPaciente[c.paciente_id].total++
      if (!consultasPorPaciente[c.paciente_id].ultima) {
        consultasPorPaciente[c.paciente_id].ultima = c.data_hora
      }
    })

    agendamentosRecentes = (todasConsultas ?? []).slice(0, 8)

    const inicioMes = new Date()
    inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
    const { count } = await adminSupabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .in('paciente_id', pacienteIds)
      .gte('data_hora', inicioMes.toISOString())
      .neq('status', 'cancelado')
    totalConsultasMes = count ?? 0
  }

  const mapPaciente: Record<string, string> = {}
  vinculos?.forEach(v => { if (v.paciente_id) mapPaciente[v.paciente_id] = v.nome_completo })

  // KPIs globais
  const totalAtivos = vinculos?.filter(v => v.ativo).length ?? 0
  const totalVinculados = vinculos?.filter(v => v.paciente_id).length ?? 0
  const naoAtivaram = totalAtivos - totalVinculados

  // Departamentos únicos para o filtro
  const departamentos = [...new Set(vinculos?.map(v => v.departamento).filter(Boolean) ?? [])] as string[]

  // Aplicar filtros
  let funcionarios = (vinculos ?? []).filter(v => {
    if (departamento && v.departamento !== departamento) return false
    if (status === 'ativo' && !v.paciente_id) return false
    if (status === 'inativo' && v.paciente_id) return false
    return true
  })

  function formatDataHora(iso: string) {
    const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'))
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' })
  }

  const exportUrl = `/api/empresa/funcionarios/exportar?empresa_id=${empresaId}${departamento ? `&departamento=${encodeURIComponent(departamento)}` : ''}${status ? `&status=${status}` : ''}`

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Header */}
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <div>
              <span className="font-bold">MedDigital</span>
              <span className="text-xs text-blue-300 ml-2">Portal RH</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> {empresa?.nome}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="text-sm text-blue-300 hover:text-white flex items-center gap-1.5">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A3A5C]">Painel de Saúde Corporativa</h1>
          <p className="text-gray-500 text-sm mt-1">{empresa?.nome} · {empresa?.cnpj || 'CNPJ não informado'}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-[#2E75B6]" />
              <span className="text-xs text-gray-400">funcionários</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalAtivos}</p>
            <p className="text-xs text-gray-500 mt-1">na empresa</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-xs text-gray-400">usando</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{totalVinculados}</p>
            <p className="text-xs text-gray-500 mt-1">usam a plataforma</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-400">este mês</span>
            </div>
            <p className="text-3xl font-bold text-orange-500">{totalConsultasMes}</p>
            <p className="text-xs text-gray-500 mt-1">consultas</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-400">adesão</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {totalAtivos > 0 ? Math.round((totalVinculados / totalAtivos) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">da equipe</p>
          </div>
        </div>

        {/* Alerta de não ativação */}
        {naoAtivaram > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {naoAtivaram} funcionário{naoAtivaram > 1 ? 's ainda não ativaram' : ' ainda não ativou'} a conta
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Compartilhe o link <strong>med-digital.vercel.app/cadastro</strong> com eles para que se cadastrem.
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Tabela de funcionários — ocupa 2/3 */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#2E75B6]" /> Funcionários
                  <span className="text-xs text-gray-400 font-normal">({funcionarios.length})</span>
                </h2>
                <a
                  href={`${exportUrl}&formato=xlsx`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar Excel
                </a>
              </div>

              {/* Filtros */}
              <Suspense fallback={null}>
                <FiltrosFuncionarios departamentos={departamentos} />
              </Suspense>

              {funcionarios.length === 0 ? (
                <div className="py-12 text-center">
                  <UserX className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum funcionário encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo / Depto</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultas</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Última</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {funcionarios.map((v: any) => {
                        const saude = v.paciente_id ? (consultasPorPaciente[v.paciente_id] ?? { total: 0, ultima: null }) : null
                        return (
                          <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800 text-sm">{v.nome_completo}</p>
                              {v.email && <p className="text-xs text-gray-400">{v.email}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-gray-700">{v.cargo || '—'}</p>
                              {v.departamento && <p className="text-xs text-gray-400">{v.departamento}</p>}
                            </td>
                            <td className="px-4 py-3">
                              {v.paciente_id ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                                  <UserX className="w-3 h-3" /> Não ativou
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {saude ? (
                                <span className={`text-sm font-semibold ${saude.total > 0 ? 'text-[#1A3A5C]' : 'text-gray-300'}`}>
                                  {saude.total}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {saude?.ultima ? (
                                <span className="text-xs text-gray-500">{formatDataHora(saude.ultima)}</span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Consultas recentes — 1/3 */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-[#2E75B6]" /> Consultas recentes
              </h2>
              {agendamentosRecentes.length > 0 ? (
                <div className="space-y-3">
                  {agendamentosRecentes.map((a: any) => (
                    <div key={a.id} className="border-l-2 border-[#2E75B6] pl-3">
                      <p className="text-sm font-medium text-gray-800 leading-tight">
                        {mapPaciente[a.paciente_id] || 'Funcionário'}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDataHora(a.data_hora)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                        a.status === 'concluido' ? 'bg-green-100 text-green-700' :
                        a.status === 'confirmado' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status === 'concluido' ? 'Concluída' :
                         a.status === 'confirmado' ? 'Confirmada' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhuma consulta ainda</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
