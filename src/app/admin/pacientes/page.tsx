import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Activity, User, Phone, FileText, Building2, Calendar, CheckCircle2 } from 'lucide-react'
import AdminHeader from '../components/AdminHeader'
import FiltrosPacientes from './FiltrosPacientes'
import { Suspense } from 'react'

interface Props {
  searchParams: Promise<{ empresa_id?: string; tipo?: string; consultas?: string }>
}

export default async function AdminPacientesPage({ searchParams }: Props) {
  await requireAdmin()
  const { empresa_id, tipo, consultas } = await searchParams
  const adminSupabase = createAdminClient()

  // Buscar empresas para o filtro
  const { data: empresas } = await adminSupabase
    .from('empresas')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  // Buscar pacientes com contagem de agendamentos
  const { data: todosPacientes } = await adminSupabase
    .from('pacientes')
    .select('id, nome, cpf, telefone, convenio, criado_em, agendamentos(count)')
    .order('criado_em', { ascending: false })

  // Buscar vínculos para cruzar CPFs
  const cpfs = todosPacientes?.map(p => p.cpf).filter(Boolean) ?? []
  const { data: vinculos } = cpfs.length > 0
    ? await adminSupabase
        .from('vinculos_empresa')
        .select('cpf, empresa_id, cargo, departamento, empresas(id, nome)')
        .in('cpf', cpfs)
    : { data: [] }

  const vinculoMap: Record<string, any> = {}
  vinculos?.forEach(v => { if (v.cpf) vinculoMap[v.cpf] = v })

  // Aplicar filtros
  let pacientes = (todosPacientes ?? []).filter(p => {
    const vinculo = p.cpf ? vinculoMap[p.cpf] : null
    const totalConsultas = p.agendamentos?.[0]?.count ?? 0

    // Filtro por empresa
    if (empresa_id === 'particular') {
      if (vinculo) return false
    } else if (empresa_id) {
      if (!vinculo || (vinculo.empresas as any)?.id !== empresa_id) return false
    }

    // Filtro por tipo
    if (tipo === 'vinculado' && !vinculo) return false
    if (tipo === 'particular' && vinculo) return false

    // Filtro por consultas
    if (consultas === 'sim' && totalConsultas === 0) return false
    if (consultas === 'nao' && totalConsultas > 0) return false

    return true
  })

  const total = pacientes.length
  const comEmpresa = (todosPacientes ?? []).filter(p => p.cpf && vinculoMap[p.cpf]).length
  const comAgendamento = (todosPacientes ?? []).filter(p => (p.agendamentos?.[0]?.count ?? 0) > 0).length

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <AdminHeader ativo="pacientes" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A3A5C] flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" /> Pacientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">{todosPacientes?.length ?? 0} paciente(s) cadastrado(s) na plataforma</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-[#1A3A5C]">{todosPacientes?.length ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">total cadastrados</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-purple-600">{comEmpresa}</p>
            <p className="text-xs text-gray-500 mt-1">vinculados a empresa</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-green-600">{comAgendamento}</p>
            <p className="text-xs text-gray-500 mt-1">com consultas</p>
          </div>
        </div>

        {/* Filtros */}
        <Suspense fallback={null}>
          <FiltrosPacientes empresas={empresas ?? []} total={total} />
        </Suspense>

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[#1A3A5C]">Lista de pacientes</h2>
          </div>

          {pacientes.length === 0 ? (
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
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pacientes.map((p: any) => {
                    const vinculo = p.cpf ? vinculoMap[p.cpf] : null
                    const totalConsultas = p.agendamentos?.[0]?.count ?? 0
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <Link
                                href={`/admin/pacientes/${p.id}`}
                                className="font-medium text-[#2E75B6] hover:underline"
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
                          {vinculo ? (
                            <div>
                              <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {(vinculo.empresas as any)?.nome ?? '—'}
                              </span>
                              {vinculo.cargo && <p className="text-xs text-gray-400 mt-0.5">{vinculo.cargo}</p>}
                            </div>
                          ) : <span className="text-xs text-gray-300">Particular</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            totalConsultas > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {totalConsultas > 0 && <CheckCircle2 className="w-3 h-3" />}
                            {totalConsultas} consulta{totalConsultas !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
