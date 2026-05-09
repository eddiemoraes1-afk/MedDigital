import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  User, Phone, FileText, Building2, Calendar, Activity,
  Clock, CheckCircle2, Mail, Briefcase, MapPin, XCircle,
  ArrowLeft, Brain, AlertTriangle, AlertCircle, Info,
  Pill, Stethoscope, ThumbsUp, ThumbsDown, Minus,
} from 'lucide-react'
import MedicoHeader from '../../MedicoHeader'
import AtestadosMedicoClient from './AtestadosMedicoClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MedicoPacientePage({ params }: Props) {
  const { id } = await params

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

  // Vínculo empresa
  const { data: vinculo } = paciente.cpf
    ? await adminSupabase
        .from('vinculos_empresa')
        .select('*, empresas(id, nome, cnpj)')
        .eq('cpf', paciente.cpf)
        .maybeSingle()
    : { data: null }

  // Buscar TODAS as triagens com dados completos (duas estratégias)
  const COLS = 'id, criado_em, classificacao_risco, direcionamento, resumo_ia, recomendacao_ia, status, dados_sintomas, dados_urgencia, consentimento_lgpd, consentimento_em, cpf_confirmado, telefone_contato'

  const { data: triagensDirectas } = await adminSupabase
    .from('triagens')
    .select(COLS)
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  // Path 2: via atendimentos
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
      .select(COLS)
      .in('id', idsViaAtend)
    triagemViaAtend = data ?? []
  }

  const triagens = [...(triagensDirectas ?? []), ...triagemViaAtend]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

  // Atendimentos concluídos — histórico de consultas + gasto total
  const { data: atendimentosConcluidos } = await adminSupabase
    .from('atendimentos')
    .select('id, valor_cobrado, criado_em, notas_medico, medico_id, medicos(nome)')
    .eq('paciente_id', id)
    .eq('status', 'concluido')
    .order('criado_em', { ascending: false })
    .limit(20)

  // Atestados do paciente (com dados completos do médico para PDF)
  const { data: atestados } = await adminSupabase
    .from('atestados')
    .select('id, data_emissao, data_inicio, data_fim, dias, cid, texto_complementar, medico_id, medicos(nome, crm, crm_uf, especialidade)')
    .eq('paciente_id', id)
    .order('data_emissao', { ascending: false })

  const totalGastoPaciente = (atendimentosConcluidos ?? []).reduce((s, a) => s + (a.valor_cobrado ?? 0), 0)
  const totalConsultasPaciente = atendimentosConcluidos?.length ?? 0

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

  function formatDataHora(iso: string | null | undefined) {
    if (!iso) return { data: '—', hora: '—' }
    // Garantir que o timestamp tenha timezone explícito
    const isoNorm = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
    const d = new Date(isoNorm)
    if (isNaN(d.getTime())) return { data: '—', hora: '—' }
    return {
      data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
      hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
    }
  }

  const corRisco: Record<string, string> = {
    verde:    'border-green-300 bg-green-50',
    amarelo:  'border-yellow-300 bg-yellow-50',
    laranja:  'border-orange-300 bg-orange-50',
    vermelho: 'border-red-300 bg-red-50',
  }

  const badgeRisco: Record<string, string> = {
    verde:    'bg-green-100 text-green-700',
    amarelo:  'bg-yellow-100 text-yellow-700',
    laranja:  'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }

  const labelRisco: Record<string, string> = {
    verde:    '🟢 Risco Baixo',
    amarelo:  '🟡 Risco Moderado',
    laranja:  '🟠 Risco Alto',
    vermelho: '🔴 Urgência',
  }

  const labelSexo: Record<string, string> = {
    masculino: 'Masculino', feminino: 'Feminino', outro: 'Outro', nao_informado: 'Não informado',
  }

  const sinaisUrgenciaLabels: Record<string, string> = {
    dorNoPeito:    'Dor no peito',
    faltaDeAr:     'Falta de ar intensa',
    sintomaNeuro:  'Sintoma neurológico',
    desmaio:       'Desmaio / perda de consciência',
    convulsao:     'Convulsão',
    sangramento:   'Sangramento intenso',
    trauma:        'Trauma / acidente',
    dorExtrema:    'Dor extrema',
    gravidez:      'Gravidez com complicação',
  }

  const idade = calcularIdade(paciente.data_nascimento ?? null)
  const empresa = (vinculo as any)?.empresas

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader titulo="Prontuário do Paciente" backHref="/medico/pacientes" />

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
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">{idade} anos</span>
                )}
                {paciente.sexo && paciente.sexo !== 'nao_informado' && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {labelSexo[paciente.sexo] ?? paciente.sexo}
                  </span>
                )}
                {paciente.cpf && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <FileText className="w-3.5 h-3.5 text-gray-400" /> {paciente.cpf}
                  </span>
                )}
                {paciente.telefone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {paciente.telefone}
                  </span>
                )}
                {paciente.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {paciente.email}
                  </span>
                )}
              </div>
              {vinculo ? (
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {empresa?.nome}{vinculo.cargo ? ` — ${vinculo.cargo}` : ''}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-2">Paciente particular</p>
              )}
            </div>

            <div className="flex gap-3 shrink-0 flex-wrap">
              <div className="text-center bg-[#F3FAF7] rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-[#1A3A2C]">{triagens.length}</p>
                <p className="text-xs text-gray-400">triagens</p>
              </div>
              <div className="text-center bg-green-50 rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-green-600">{totalConsultasPaciente}</p>
                <p className="text-xs text-gray-400">consultas</p>
              </div>
              <div className="text-center bg-blue-50 rounded-xl px-4 py-3">
                <p className={`text-2xl font-bold ${(atestados?.length ?? 0) > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                  {atestados?.length ?? 0}
                </p>
                <p className="text-xs text-gray-400">atestados</p>
              </div>
              <div className="text-center bg-purple-50 rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-gray-300">0</p>
                <p className="text-xs text-gray-400">exames</p>
              </div>
              <div className="text-center bg-orange-50 rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-gray-300">0</p>
                <p className="text-xs text-gray-400">receitas</p>
              </div>
              {totalGastoPaciente > 0 && (
                <div className="text-center bg-amber-50 rounded-xl px-4 py-3">
                  <p className="text-lg font-bold text-amber-700">
                    {totalGastoPaciente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-xs text-gray-400">gasto total</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Coluna principal — Prontuário completo */}
          <div className="md:col-span-2 space-y-4">

            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-[#5BBD9B]" />
              <h2 className="font-bold text-[#1A3A2C] text-lg">Histórico de Triagens</h2>
              <span className="text-sm text-gray-400">({triagens.length})</span>
            </div>

            {triagens.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <Brain className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Nenhuma triagem registrada</p>
                <p className="text-sm text-gray-300 mt-1">O paciente ainda não realizou nenhuma triagem</p>
              </div>
            ) : (
              triagens.map((t: any) => {
                const { data, hora } = formatDataHora(t.criado_em)
                const sintomas = t.dados_sintomas as any
                const urgencia = t.dados_urgencia as Record<string, boolean | null> | null
                const temUrgenciaPositiva = urgencia && Object.values(urgencia).some(v => v === true)

                return (
                  <div key={t.id} className={`rounded-2xl border-2 shadow-sm overflow-hidden ${corRisco[t.classificacao_risco] || 'border-gray-200 bg-white'}`}>

                    {/* Cabeçalho do card */}
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${badgeRisco[t.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                          {labelRisco[t.classificacao_risco] || t.classificacao_risco || 'Sem classificação'}
                        </span>
                        {temUrgenciaPositiva && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-600 text-white flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> URGÊNCIA
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{data}</p>
                        <p className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {hora}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 space-y-4">

                      {/* Análise da IA */}
                      {(t.resumo_ia || t.recomendacao_ia) && (
                        <div className="bg-white/80 rounded-xl p-4 border border-white">
                          <p className="text-xs font-bold text-[#1A3A2C] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-[#5BBD9B]" /> Análise da IA
                          </p>
                          {t.resumo_ia && (
                            <p className="text-sm text-gray-700 leading-relaxed mb-2">{t.resumo_ia}</p>
                          )}
                          {t.recomendacao_ia && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Recomendação:</p>
                              <p className="text-sm text-gray-700 italic">{t.recomendacao_ia}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sintomas detalhados */}
                      {sintomas && (
                        <div className="bg-white/80 rounded-xl p-4 border border-white">
                          <p className="text-xs font-bold text-[#1A3A2C] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-[#5BBD9B]" /> Sintomas Relatados
                          </p>

                          {/* Motivos principais */}
                          {sintomas.motivosPrincipais?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 font-medium mb-1.5">Motivo(s) do atendimento:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {sintomas.motivosPrincipais.map((m: string) => (
                                  <span key={m} className="text-xs bg-[#EAF7F2] text-[#1A3A2C] border border-green-200 px-2.5 py-1 rounded-full font-medium">{m}</span>
                                ))}
                                {sintomas.outroMotivo && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{sintomas.outroMotivo}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Localização da dor */}
                          {sintomas.locaisDor?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 font-medium mb-1.5">Localização da dor:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {sintomas.locaisDor.map((l: string) => (
                                  <span key={l} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">{l}</span>
                                ))}
                                {sintomas.outraLocalizacaoDor && (
                                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">{sintomas.outraLocalizacaoDor}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Intensidade da dor */}
                          {sintomas.intensidadeDor !== null && sintomas.intensidadeDor !== undefined && (
                            <div className="mb-3 flex items-center gap-3">
                              <p className="text-xs text-gray-500 font-medium">Intensidade da dor:</p>
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                sintomas.intensidadeDor <= 3 ? 'bg-green-100 text-green-700' :
                                sintomas.intensidadeDor <= 6 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {sintomas.intensidadeDor}/10
                              </span>
                              <span className="text-xs text-gray-400">
                                {sintomas.intensidadeDor <= 3 ? 'Leve' : sintomas.intensidadeDor <= 6 ? 'Moderada' : 'Intensa'}
                              </span>
                            </div>
                          )}

                          {/* Remédios */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {sintomas.tomouRemedio !== null && (
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <p className="text-gray-400 font-medium mb-1">Tomou remédio:</p>
                                <p className={`font-semibold ${sintomas.tomouRemedio ? 'text-[#1A3A2C]' : 'text-gray-500'}`}>
                                  {sintomas.tomouRemedio ? 'Sim' : 'Não'}
                                </p>
                                {sintomas.oQueTomou && (
                                  <p className="text-gray-600 mt-0.5 italic">{sintomas.oQueTomou}</p>
                                )}
                                {sintomas.remedioMelhorou && (
                                  <p className="text-gray-500 mt-0.5">
                                    Efeito: <span className="font-medium">{
                                      sintomas.remedioMelhorou === 'sim' ? 'Melhorou' :
                                      sintomas.remedioMelhorou === 'nao' ? 'Não melhorou' : 'Melhorou parcialmente'
                                    }</span>
                                  </p>
                                )}
                              </div>
                            )}
                            {sintomas.remedioContinuo !== null && (
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <p className="text-gray-400 font-medium mb-1">Uso contínuo:</p>
                                <p className={`font-semibold ${sintomas.remedioContinuo ? 'text-[#1A3A2C]' : 'text-gray-500'}`}>
                                  {sintomas.remedioContinuo ? 'Sim' : 'Não'}
                                </p>
                                {sintomas.remedioContinuoQuais && (
                                  <p className="text-gray-600 mt-0.5 italic">{sintomas.remedioContinuoQuais}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sinais de urgência — TODOS */}
                      {urgencia && (
                        <div className="bg-white/80 rounded-xl p-4 border border-white">
                          <p className="text-xs font-bold text-[#1A3A2C] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#5BBD9B]" /> Sinais de Urgência
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {Object.entries(sinaisUrgenciaLabels).map(([key, label]) => {
                              const valor = urgencia[key]
                              if (valor === null || valor === undefined) return null
                              return (
                                <div key={key} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                                  valor ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                                }`}>
                                  <span className={`font-medium ${valor ? 'text-red-700' : 'text-gray-500'}`}>{label}</span>
                                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                                    valor ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                                  }`}>
                                    {valor ? '⚠ SIM' : 'NÃO'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Consentimento LGPD */}
                      {t.consentimento_lgpd && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          Consentimento LGPD registrado
                          {t.consentimento_em && (
                            <span>em {new Date(t.consentimento_em).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Histórico de Atestados */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-[#5BBD9B]" />
                <h2 className="font-bold text-[#1A3A2C] text-lg">Atestados Médicos</h2>
                <span className="text-sm text-gray-400">({atestados?.length ?? 0})</span>
              </div>

              {atestados && atestados.length > 0 ? (
                <AtestadosMedicoClient
                  atestados={atestados as any}
                  paciente={{
                    nome: paciente.nome,
                    cpf: paciente.cpf ?? null,
                    data_nascimento: paciente.data_nascimento ?? null,
                    sexo: paciente.sexo ?? null,
                  }}
                  medicoId={medico.id}
                />
              ) : (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhum atestado emitido</p>
                </div>
              )}
            </div>

            {/* Histórico de consultas */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-[#5BBD9B]" />
                <h2 className="font-bold text-[#1A3A2C] text-lg">Histórico de Consultas</h2>
                <span className="text-sm text-gray-400">({totalConsultasPaciente})</span>
              </div>

              {atendimentosConcluidos && atendimentosConcluidos.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Médico</th>
                        <th className="px-5 py-3 text-left hidden md:table-cell">Notas</th>
                        <th className="px-5 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {atendimentosConcluidos.map((a: any) => {
                        const { data, hora } = formatDataHora(a.criado_em)
                        const medicoNome = a.medicos?.nome
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-800">{data}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {hora}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {medicoNome
                                ? <span className="text-sm">{medicoNome}</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell max-w-[200px]">
                              {a.notas_medico
                                ? <span className="line-clamp-2">{a.notas_medico}</span>
                                : <span className="italic">Sem notas</span>
                              }
                            </td>
                            <td className="px-5 py-3 text-right">
                              {a.valor_cobrado != null
                                ? <span className="text-sm font-medium text-gray-700">
                                    {Number(a.valor_cobrado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                : <span className="text-gray-300 text-xs">—</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">

            {/* Empresa */}
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
                    {vinculo.ativo ? <><CheckCircle2 className="w-3 h-3" /> Ativo</> : <><XCircle className="w-3 h-3" /> Inativo</>}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-gray-400" /> Empresa
                </h3>
                <p className="text-xs text-gray-400">Paciente particular · sem vínculo</p>
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
                    <p className="text-sm text-gray-700">{labelSexo[paciente.sexo] ?? paciente.sexo}</p>
                  </div>
                )}
                {paciente.convenio && (
                  <div>
                    <p className="text-xs text-gray-400">Convênio</p>
                    <p className="text-sm text-gray-700">{paciente.convenio}</p>
                  </div>
                )}
                {!paciente.data_nascimento && !paciente.sexo && !paciente.convenio && (
                  <p className="text-xs text-gray-400">Nenhum dado adicional</p>
                )}
              </div>
            </div>

            <Link
              href="/medico/pacientes"
              className="w-full flex items-center justify-center gap-2 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar à lista
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
