import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Heart, ArrowLeft, Shield, Activity, Search,
  User, Phone, FileText, Building2, Calendar, CheckCircle2
} from 'lucide-react'

export default async function AdminPacientesPage() {
  await requireAdmin()
  const adminSupabase = createAdminClient()

  const { data: pacientes } = await adminSupabase
    .from('pacientes')
    .select(`
      id, nome, cpf, telefone, convenio, criado_em,
      agendamentos(count)
    `)
    .order('criado_em', { ascending: false })

  // Para cada paciente, buscar empresa vinculada (via vinculos_empresa.cpf)
  const cpfs = pacientes?.map(p => p.cpf).filter(Boolean) ?? []
  const { data: vinculos } = cpfs.length > 0
    ? await adminSupabase
        .from('vinculos_empresa')
        .select('cpf, empresa_id, cargo, departamento, empresas(nome)')
        .in('cpf', cpfs)
    : { data: [] }

  // Mapear cpf → vínculo
  const vinculoMap: Record<string, any> = {}
  vinculos?.forEach(v => {
    if (v.cpf) vinculoMap[v.cpf] = v
  })

  const total = pacientes?.length ?? 0
  const comEmpresa = pacientes?.filter(p => p.cpf && vinculoMap[p.cpf]).length ?? 0
  const comAgendamento = pacientes?.filter(p => (p.agendamentos?.[0]?.count ?? 0) > 0).length ?? 0

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Header */}
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold text-lg">MedDigital</span>
            <span className="text-xs bg-blue-700 text-blue-100 px-2 py-0.5 rounded-full ml-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </span>
          </div>
          <Link href="/admin" className="text-sm text-blue-200 hover:text-white flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A3A5C] flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" /> Pacientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">{total} paciente(s) cadastrado(s) na plataforma</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-[#1A3A5C]">{total}</p>
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

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-[#1A3A5C]">Lista de pacientes</h2>
          </div>

          {!pacientes || pacientes.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Nenhum paciente cadastrado</p>
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
                        {/* Nome */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{p.nome}</p>
                              {p.convenio && (
                                <p className="text-xs text-gray-400">{p.convenio}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CPF */}
                        <td className="px-6 py-4">
                          {p.cpf ? (
                            <span className="font-mono text-xs text-gray-600 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-gray-400" />
                              {p.cpf}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Contato */}
                        <td className="px-6 py-4">
                          {p.telefone ? (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {p.telefone}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Empresa */}
                        <td className="px-6 py-4">
                          {vinculo ? (
                            <div>
                              <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {(vinculo.empresas as any)?.nome ?? '—'}
                              </span>
                              {vinculo.cargo && (
                                <p className="text-xs text-gray-400 mt-0.5">{vinculo.cargo}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">Particular</span>
                          )}
                        </td>

                        {/* Consultas */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            totalConsultas > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {totalConsultas > 0 && <CheckCircle2 className="w-3 h-3" />}
                            {totalConsultas} consulta{totalConsultas !== 1 ? 's' : ''}
                          </span>
                        </td>

                        {/* Cadastro */}
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.criado_em).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
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
