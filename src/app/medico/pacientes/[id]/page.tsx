import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  User, Phone, FileText, Building2, Calendar, Activity,
  Clock, CheckCircle2, Mail, Briefcase, MapPin, XCircle,
  ArrowLeft, Brain, AlertTriangle, AlertCircle, Info,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MedicoPacientePage({ params }: Props) {
  const { id } = await params

  // Verificar autenticação do médico
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('id, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') redirect('/medico/dashboard')

  // Buscar paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!paciente) redirect('/medico/dashboard')

  // Buscar vínculo com empresa
  const { data: vinculo } = paciente.cpf
    ? await adminSupabase
        .from('vinculos_empresa')
        .select('*, empresas(id, nome, cnpj)')
        .eq('cpf', paciente.cpf)
        .maybeSingle()
    : { data: null }

  // Buscar triagens recentes — duas estratégias:
  // 1) direto por paciente_id
  // 2) via atendimentos.triagem_id (para triagens salvas antes da correção de RLS)
  // Colunas seguras (existem em qualquer versão do banco)
  const COLS_TRIAGEM = 'id, criado_em, classificacao_risco, resumo_ia, status'

  // Path 1: triagens com paciente_id correto
  const { data: triagensDirectas } = await adminSupabase
    .from('triagens')
    .select(COLS_TRIAGEM)
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  // Path 2: triagens linkadas via atendimentos (salvas antes da correção de RLS)
  const { data: atendPaciente } = await adminSupabase
    .from('atendimentos')
    .select('triagem_id')
    .eq('paciente_id', id)
    .not('triagem_id', 'is', null)

  const idsJaBuscados = new Set((triagensDirectas ?? []).map((t: any) => t.id))
  const idsViaAtend = (atendPaciente ?? [])
    .map((a: any) => a.triagem_id)
    .filter((tid: string) => tid && !idsJaBuscados.has(tid))

  let triagemViaAtend: any[] = []
  if (idsViaAtend.length > 0) {
    const { data } = await adminSupabase
      .from('triagens')
      .select(COLS_TRIAGEM)
      .in('id', idsViaAtend)
    triagemViaAtend = data ?? []
  }

  // Também buscar dados_sintomas e dados_urgencia separadamente (colunas opcionais)
  const todosIds = [
    ...(triagensDirectas ?? []).map((t: any) => t.id),
    ...triagemViaAtend.map((t: any) => t.id),
  ]
  const dadosExtras: Record<string, any> = {}
  if (todosIds.length > 0) {
    const { data: extras } = await adminSupabase
      .from('triagens')
      .select('id, dados_sintomas, dados_urgencia')
      .in('id', todosIds)
    extras?.forEach((e: any) => { dadosExtras[e.id] = e })
  }

  const triagens = [...(triagensDirectas ?? []), ...triagemViaAtend]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 10)
    .map((t: any) => ({ ...t, ...(dadosExtras[t.id] ?? {}) }))

  // Buscar agendamentos
  const { data: agendamentos } = await adminSupabase
    .from('agendamentos')
    .select('id, data_hora, status, tipo_consulta, medico_id')
    .eq('paciente_id', id)
    .order('data_hora', { ascending: false })
    .limit(10)

  const medicoIds = [...new Set(agendamentos?.map(a => a.medico_id).filter(Boolean) ?? [])]
  const { data: medicos } = medicoIds.length > 0
    ? await adminSupabase.from('medicos').select('id, nome').in('id', medicoIds)
    : { data: [] }
  const medicoMap: Record<string, string> = {}
  medicos?.forEach(m => { medicoMap[m.id] = m.nome })

  // Helpers
  function calcularIdade(dataNasc: string | null): number | null {
    if (!dataNasc) return null
    const nasc = new Date(dataNasc)
    const hoje = new Date()
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  function formatDataHora(iso: string) {
    const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'))
    return {
      data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
      hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
    }
  }

  function statusBadge(status: string) {
    if (status === 'concluido' || status === 'confirmado') return 'bg-green-100 text-green-700'
    if (status === 'cancelado') return 'bg-red-100 text-red-600'
    return 'bg-yellow-100 text-yellow-700'
  }

  function statusLabel(status: string) {
    if (status === 'concluido') return 'Concluída'
    if (status === 'confirmado') return 'Confirmada'
    if (status === 'cancelado') return 'Cancelada'
    return 'Pendente'
  }

  const corRisco: Record<string, string> = {
    verde:    'bg-green-100 text-green-700',
    amarelo:  'bg-yellow-100 text-yellow-700',
    laranja:  'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }

  const labelRisco: Record<string, string> = {
    verde:    'Baixo',
    amarelo:  'Moderado',
    laranja:  'Alto',
    vermelho: 'Urgência',
  }

  const iconRisco: Record<string, any> = {
    verde:    CheckCircle2,
    amarelo:  Info,
    laranja:  AlertTriangle,
    vermelho: AlertCircle,
  }

  const idade = calcularIdade(paciente.data_nascimento ?? null)
  const empresa = vinculo?.empresas as any

  const labelSexo: Record<string, string> = {
    masculino: 'Masculino',
    feminino: 'Feminino',
    outro: 'Outro',
    nao_informado: 'Não informado',
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7]">

      {/* Header */}
      <header className="bg-[#1A3A2C] text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/medico/dashboard" className="text-green-200 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
          <span className="text-xs text-green-300 ml-1">Ficha do Paciente</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Cabeçalho do paciente */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#1A3A2C]">{paciente.nome}</h1>
              <div className="flex flex-wrap gap-3 mt-2">
                {idade !== null && (
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    {idade} anos
                  </span>
                )}
                {paciente.sexo && paciente.sexo !== 'nao_informado' && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {labelSexo[paciente.sexo] ?? paciente.sexo}
                  </span>
                )}
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
              {vinculo ? (
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {empresa?.nome} {vinculo.cargo ? `— ${vinculo.cargo}` : ''}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-2">Paciente particular</p>
              )}
            </div>

            {/* KPIs */}
            <div className="flex gap-3 shrink-0">
              <div className="text-center bg-[#F3FAF7] rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-[#1A3A2C]">{agendamentos?.length ?? 0}</p>
                <p className="text-xs text-gray-400">consultas</p>
              </div>
              <div className="text-center bg-green-50 rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-green-600">
                  {agendamentos?.filter(a => a.status === 'concluido').length ?? 0}
                </p>
                <p className="text-xs text-gray-400">realizadas</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Coluna principal */}
          <div className="md:col-span-2 space-y-6">

            {/* Triagens recentes */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#5BBD9B]" />
                <h2 className="font-bold text-[#1A3A2C]">Triagens recentes</h2>
                <span className="text-xs text-gray-400 font-normal">({triagens?.length ?? 0})</span>
              </div>

              {triagens && triagens.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {triagens.map((t: any) => {
                    const IconR = iconRisco[t.classificacao_risco] || Info
                    return (
                      <div key={t.id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${corRisco[t.classificacao_risco] || 'bg-gray-100'}`}>
                            <IconR className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${corRisco[t.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                                {labelRisco[t.classificacao_risco] || t.classificacao_risco || 'Sem classificação'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(t.criado_em).toLocaleDateString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo',
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })}
                                {' às '}
                                {new Date(t.criado_em).toLocaleTimeString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {t.resumo_ia ? (
                              <p className="text-sm text-gray-700 leading-relaxed">{t.resumo_ia}</p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">Sem resumo registrado</p>
                            )}

                            {/* Sintomas principais se disponíveis */}
                            {t.dados_sintomas?.motivosPrincipais?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {t.dados_sintomas.motivosPrincipais.map((m: string) => (
                                  <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m}</span>
                                ))}
                              </div>
                            )}

                            {/* Sinais de urgência positivos */}
                            {t.dados_urgencia && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {Object.entries(t.dados_urgencia as Record<string, boolean | null>)
                                  .filter(([, v]) => v === true)
                                  .map(([k]) => {
                                    const labels: Record<string, string> = {
                                      dorNoPeito: 'Dor no peito',
                                      faltaDeAr: 'Falta de ar',
                                      sintomaNeuro: 'Sintoma neurológico',
                                      desmaio: 'Desmaio',
                                      convulsao: 'Convulsão',
                                      sangramento: 'Sangramento',
                                      trauma: 'Trauma',
                                      dorExtrema: 'Dor extrema',
                                      gravidez: 'Gravidez com risco',
                                    }
                                    return (
                                      <span key={k} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                                        ⚠ {labels[k] || k}
                                      </span>
                                    )
                                  })
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Brain className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma triagem registrada</p>
                </div>
              )}
            </div>

            {/* Histórico de consultas */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5BBD9B]" />
                <h2 className="font-bold text-[#1A3A2C]">Histórico de consultas</h2>
                <span className="text-xs text-gray-400 font-normal">({agendamentos?.length ?? 0})</span>
              </div>

              {agendamentos && agendamentos.length > 0 ? (
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
                      {agendamentos.map(a => {
                        const { data, hora } = formatDataHora(a.data_hora)
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
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
                <div className="py-10 text-center">
                  <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">

            {/* Vínculo empresarial */}
            {vinculo ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-purple-500" /> Empresa
                </h3>
                <p className="font-medium text-purple-700 text-sm">{empresa?.nome}</p>
                {empresa?.cnpj && <p className="text-xs text-gray-400 mt-0.5">{empresa.cnpj}</p>}
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
                <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-gray-400" /> Empresa
                </h3>
                <p className="text-xs text-gray-400">Paciente particular · sem vínculo empresarial</p>
              </div>
            )}

            {/* Dados cadastrais */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" /> Dados cadastrais
              </h3>
              <div className="space-y-2">
                {paciente.data_nascimento && (
                  <div>
                    <p className="text-xs text-gray-400">Data de nascimento</p>
                    <p className="text-sm text-gray-700">
                      {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}
                      {idade !== null && <span className="text-gray-400 ml-1">({idade} anos)</span>}
                    </p>
                  </div>
                )}
                {paciente.sexo && (
                  <div>
                    <p className="text-xs text-gray-400">Sexo</p>
                    <p className="text-sm text-gray-700 capitalize">{labelSexo[paciente.sexo] ?? paciente.sexo}</p>
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
                {!paciente.data_nascimento && !paciente.sexo && !paciente.convenio && (
                  <p className="text-xs text-gray-400">Nenhum dado adicional cadastrado</p>
                )}
              </div>
            </div>

            {/* Ações */}
            <Link
              href="/medico/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar à fila
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
