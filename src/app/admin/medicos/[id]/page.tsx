import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Stethoscope, CheckCircle2, XCircle, Clock, Calendar,
  CreditCard, MapPin, Activity, User, Mail, Phone, ArrowLeft
} from 'lucide-react'
import AdminHeader from '../../components/AdminHeader'
import BotoesAprovacao from '../../components/BotoesAprovacao'
import ToggleMedicoAtivo from '../ToggleMedicoAtivo'

export default async function FichaMedicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const adminSupabase = createAdminClient()

  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('*')
    .eq('id', id)
    .single()

  if (!medico) redirect('/admin/medicos')

  // Agendamentos do médico (últimos 20)
  const { data: agendamentos } = await adminSupabase
    .from('agendamentos')
    .select('id, data_hora, status, tipo_consulta, paciente_id')
    .eq('medico_id', id)
    .order('data_hora', { ascending: false })
    .limit(20)

  // Pacientes para mostrar nome
  const pacienteIds = [...new Set(agendamentos?.map(a => a.paciente_id).filter(Boolean) ?? [])]
  const { data: pacientes } = pacienteIds.length > 0
    ? await adminSupabase.from('pacientes').select('id, nome').in('id', pacienteIds)
    : { data: [] }

  const pacienteMap: Record<string, string> = {}
  pacientes?.forEach(p => { pacienteMap[p.id] = p.nome })

  const totalConsultas = agendamentos?.length ?? 0
  const realizadas = agendamentos?.filter(a => a.status === 'concluido').length ?? 0
  const proximaConsulta = agendamentos?.find(
    a => a.status !== 'cancelado' && new Date(a.data_hora) > new Date()
  )

  const ativo = medico.ativo !== false

  function statusConfig(s: string) {
    if (s === 'aprovado') return { label: 'Aprovado', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> }
    if (s === 'reprovado') return { label: 'Reprovado', cls: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> }
    return { label: 'Aguardando aprovação', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-4 h-4" /> }
  }

  function statusConsultaBadge(s: string) {
    if (s === 'concluido') return 'bg-green-100 text-green-700'
    if (s === 'confirmado') return 'bg-blue-100 text-blue-700'
    if (s === 'cancelado') return 'bg-red-100 text-red-600'
    return 'bg-yellow-100 text-yellow-700'
  }

  function statusConsultaLabel(s: string) {
    if (s === 'concluido') return 'Concluída'
    if (s === 'confirmado') return 'Confirmada'
    if (s === 'cancelado') return 'Cancelada'
    return 'Pendente'
  }

  function formatDataHora(iso: string) {
    const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'))
    return {
      data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
      hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
    }
  }

  const sc = statusConfig(medico.status)

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <AdminHeader ativo="medicos" />

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/medicos" className="text-sm text-gray-400 hover:text-[#2E75B6] flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Médicos
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 font-medium">{medico.nome}</span>
        </div>

        {/* Cabeçalho do médico */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${ativo ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Stethoscope className={`w-8 h-8 ${ativo ? 'text-[#2E75B6]' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#1A3A5C]">{medico.nome}</h1>
              <div className="flex flex-wrap gap-4 mt-2">
                {medico.especialidade && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                    {medico.especialidade}
                  </span>
                )}
                {medico.crm && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    CRM {medico.crm}/{medico.crm_uf}
                  </span>
                )}
                {medico.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {medico.email}
                  </span>
                )}
                {medico.telefone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {medico.telefone}
                  </span>
                )}
                {medico.cidade && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {medico.cidade}{medico.estado ? ` / ${medico.estado}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Cadastrado em {new Date(medico.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Status + toggle */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${sc.cls}`}>
                {sc.icon} {sc.label}
              </span>
              {!ativo && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                  Inativo — oculto para pacientes
                </span>
              )}
              <ToggleMedicoAtivo medicoId={medico.id} ativo={ativo} />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Histórico de consultas — 2/3 */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2E75B6]" /> Histórico de Consultas
                  <span className="text-xs text-gray-400 font-normal">({totalConsultas})</span>
                </h2>
              </div>

              {agendamentos && agendamentos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Paciente</th>
                        <th className="px-5 py-3 text-left">Tipo</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {agendamentos.map(a => {
                        const { data, hora } = formatDataHora(a.data_hora)
                        return (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-800">{data}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {hora}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              {a.paciente_id && pacienteMap[a.paciente_id] ? (
                                <Link
                                  href={`/admin/pacientes/${a.paciente_id}`}
                                  className="text-sm text-[#2E75B6] hover:underline"
                                >
                                  {pacienteMap[a.paciente_id]}
                                </Link>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs">
                              {a.tipo_consulta || '—'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConsultaBadge(a.status)}`}>
                                {statusConsultaLabel(a.status)}
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
                  <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">

            {/* KPIs */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#1A3A5C]">{totalConsultas}</p>
                  <p className="text-xs text-gray-400 mt-0.5">consultas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{realizadas}</p>
                  <p className="text-xs text-gray-400 mt-0.5">realizadas</p>
                </div>
              </div>
            </div>

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
                {proximaConsulta.paciente_id && pacienteMap[proximaConsulta.paciente_id] && (
                  <p className="text-xs text-blue-500 mt-1">
                    {pacienteMap[proximaConsulta.paciente_id]}
                  </p>
                )}
              </div>
            )}

            {/* Ações de aprovação */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-[#1A3A5C] text-sm flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" /> Aprovação
              </h3>
              <div className="flex justify-center">
                {medico.status === 'em_analise' ? (
                  <BotoesAprovacao medicoId={medico.id} />
                ) : medico.status === 'aprovado' ? (
                  <BotoesAprovacao medicoId={medico.id} modoReprovacao />
                ) : (
                  <BotoesAprovacao medicoId={medico.id} modoAprovacao />
                )}
              </div>
            </div>

            {/* Dados cadastrais extras */}
            {(medico.bio || medico.valor_consulta) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A5C] text-sm mb-3">Perfil</h3>
                <div className="space-y-2">
                  {medico.valor_consulta && (
                    <div>
                      <p className="text-xs text-gray-400">Valor da consulta</p>
                      <p className="text-sm text-gray-700">
                        R$ {Number(medico.valor_consulta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {medico.bio && (
                    <div>
                      <p className="text-xs text-gray-400">Bio</p>
                      <p className="text-sm text-gray-700">{medico.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
