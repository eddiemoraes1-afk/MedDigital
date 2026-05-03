import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  User, Phone, FileText, Building2, Calendar, Activity,
  Clock, CheckCircle2, Mail, Briefcase, MapPin, XCircle, AlertCircle
} from 'lucide-react'
import AdminHeader from '../../components/AdminHeader'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filtro?: string }>
}

export default async function FichaPacientePage({ params, searchParams }: Props) {
  const { id } = await params
  const { filtro } = await searchParams
  await requireAdmin()

  const adminSupabase = createAdminClient()

  // Buscar paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!paciente) redirect('/admin/pacientes')

  // Buscar vínculo com empresa pelo CPF
  const { data: vinculo } = paciente.cpf
    ? await adminSupabase
        .from('vinculos_empresa')
        .select('*, empresas(id, nome, cnpj)')
        .eq('cpf', paciente.cpf)
        .maybeSingle()
    : { data: null }

  // Buscar agendamentos do paciente
  const { data: agendamentos } = await adminSupabase
    .from('agendamentos')
    .select('id, data_hora, status, tipo_consulta, medico_id')
    .eq('paciente_id', id)
    .order('data_hora', { ascending: false })

  // IDs de médicos para buscar nomes
  const medicoIds = [...new Set(agendamentos?.map(a => a.medico_id).filter(Boolean) ?? [])]
  const { data: medicos } = medicoIds.length > 0
    ? await adminSupabase
        .from('medicos')
        .select('id, nome')
        .in('id', medicoIds)
    : { data: [] }

  const medicoMap: Record<string, string> = {}
  medicos?.forEach(m => { medicoMap[m.id] = m.nome })

  const totalConsultas = agendamentos?.length ?? 0
  const consultasRealizadas = agendamentos?.filter(a => a.status === 'concluido').length ?? 0
  const proximaConsulta = agendamentos?.find(a =>
    a.status !== 'cancelado' && new Date(a.data_hora) > new Date()
  )

  // Aplicar filtro de visualização
  const consultasExibidas = filtro === 'concluido'
    ? agendamentos?.filter(a => a.status === 'concluido') ?? []
    : agendamentos ?? []

  function formatDataHora(iso: string) {
    const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'))
    return {
      data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
      hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
    }
  }

  function statusBadge(status: string) {
    if (status === 'concluido') return 'bg-green-100 text-green-700'
    if (status === 'confirmado') return 'bg-blue-100 text-blue-700'
    if (status === 'cancelado') return 'bg-red-100 text-red-600'
    return 'bg-yellow-100 text-yellow-700'
  }

  function statusLabel(status: string) {
    if (status === 'concluido') return 'Concluída'
    if (status === 'confirmado') return 'Confirmada'
    if (status === 'cancelado') return 'Cancelada'
    return 'Pendente'
  }

  const empresa = vinculo?.empresas as any

  // Verificar se há dados cadastrais extras para mostrar
  const temDadosCadastrais = paciente.data_nascimento || paciente.sexo ||
    paciente.convenio || paciente.numero_convenio || paciente.email

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <AdminHeader ativo="pacientes" />

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Cabeçalho do paciente */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#1A3A5C]">{paciente.nome}</h1>
              <div className="flex flex-wrap gap-4 mt-2">
                {paciente.cpf && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    {paciente.cpf}
                  </span>
                )}
                {paciente.telefone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {paciente.telefone}
                  </span>
                )}
                {paciente.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {paciente.email}
                  </span>
                )}
                {paciente.convenio && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    {paciente.convenio}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Cadastrado em {new Date(paciente.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* KPIs clicáveis */}
            <div className="flex gap-3 shrink-0">
              <Link
                href={`/admin/pacientes/${id}#historico`}
                className="text-center bg-[#F4F7FB] hover:bg-blue-50 transition-colors rounded-xl px-4 py-3 cursor-pointer"
              >
                <p className="text-2xl font-bold text-[#1A3A5C]">{totalConsultas}</p>
                <p className="text-xs text-gray-400">consultas</p>
              </Link>
              <Link
                href={`/admin/pacientes/${id}?filtro=concluido#historico`}
                className="text-center bg-green-50 hover:bg-green-100 transition-colors rounded-xl px-4 py-3 cursor-pointer"
              >
                <p className="text-2xl font-bold text-green-600">{consultasRealizadas}</p>
                <p className="text-xs text-gray-400">realizadas</p>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Histórico de consultas — 2/3 */}
          <div className="md:col-span-2" id="historico">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2E75B6]" />
                  {filtro === 'concluido' ? 'Consultas Realizadas' : 'Histórico de Consultas'}
                  <span className="text-xs text-gray-400 font-normal">({consultasExibidas.length})</span>
                </h2>
                {filtro === 'concluido' && (
                  <Link
                    href={`/admin/pacientes/${id}#historico`}
                    className="text-xs text-[#2E75B6] hover:underline"
                  >
                    Ver todas
                  </Link>
                )}
              </div>

              {consultasExibidas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Médico</th>
                        <th className="px-5 py-3 text-left">Tipo</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {consultasExibidas.map(a => {
                        const { data, hora } = formatDataHora(a.data_hora)
                        return (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-800">{data}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {hora}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-gray-600 text-sm">
                              {medicoMap[a.medico_id] || <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs">
                              {a.tipo_consulta || '—'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge(a.status)}`}>
                                {statusLabel(a.status)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-14 text-center">
                  <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    {filtro === 'concluido'
                      ? 'Nenhuma consulta realizada ainda'
                      : 'Nenhuma consulta registrada'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral — 1/3 */}
          <div className="space-y-4">

            {/* Próxima consulta */}
            {proximaConsulta && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <h3 className="font-semibold text-blue-800 text-sm flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" /> Próxima consulta
                </h3>
                <p className="text-blue-900 font-medium">
                  {formatDataHora(proximaConsulta.data_hora).data}
                </p>
                <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatDataHora(proximaConsulta.data_hora).hora}
                </p>
                {proximaConsulta.medico_id && medicoMap[proximaConsulta.medico_id] && (
                  <p className="text-xs text-blue-500 mt-1">
                    {medicoMap[proximaConsulta.medico_id]}
                  </p>
                )}
              </div>
            )}

            {/* Vínculo empresarial */}
            {vinculo ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A5C] text-sm flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-purple-500" /> Empresa
                </h3>
                <Link
                  href={`/admin/empresas/${empresa?.id}`}
                  className="font-medium text-purple-700 hover:underline text-sm"
                >
                  {empresa?.nome}
                </Link>
                {empresa?.cnpj && (
                  <p className="text-xs text-gray-400 mt-0.5">{empresa.cnpj}</p>
                )}
                <div className="mt-3 space-y-1.5">
                  {vinculo.cargo && (
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-gray-400" /> {vinculo.cargo}
                    </p>
                  )}
                  {vinculo.departamento && (
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400" /> {vinculo.departamento}
                    </p>
                  )}
                  {vinculo.data_admissao && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      Admissão: {new Date(vinculo.data_admissao).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${vinculo.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {vinculo.ativo
                      ? <><CheckCircle2 className="w-3 h-3" /> Ativo</>
                      : <><XCircle className="w-3 h-3" /> Inativo</>
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A5C] text-sm flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-gray-400" /> Empresa
                </h3>
                <p className="text-xs text-gray-400">Paciente particular · sem vínculo empresarial</p>
              </div>
            )}

            {/* Dados cadastrais */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-[#1A3A5C] text-sm flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" /> Dados cadastrais
              </h3>
              {temDadosCadastrais ? (
                <div className="space-y-2">
                  {paciente.email && (
                    <div>
                      <p className="text-xs text-gray-400">E-mail</p>
                      <p className="text-sm text-gray-700">{paciente.email}</p>
                    </div>
                  )}
                  {paciente.data_nascimento && (
                    <div>
                      <p className="text-xs text-gray-400">Data de nascimento</p>
                      <p className="text-sm text-gray-700">
                        {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {paciente.sexo && (
                    <div>
                      <p className="text-xs text-gray-400">Sexo</p>
                      <p className="text-sm text-gray-700 capitalize">{paciente.sexo}</p>
                    </div>
                  )}
                  {paciente.convenio && (
                    <div>
                      <p className="text-xs text-gray-400">Convênio</p>
                      <p className="text-sm text-gray-700">{paciente.convenio}</p>
                    </div>
                  )}
                  {paciente.numero_convenio && (
                    <div>
                      <p className="text-xs text-gray-400">Nº convênio</p>
                      <p className="text-sm font-mono text-gray-700">{paciente.numero_convenio}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhum dado adicional cadastrado</p>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
