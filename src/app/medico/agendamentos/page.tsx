import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Clock, User, ChevronLeft, ChevronRight, XCircle, LayoutGrid, List } from 'lucide-react'
import BotaoEntrarConsultaMedico from './BotaoEntrarConsultaMedico'
import MedicoHeader from '../MedicoHeader'

// ── helpers ────────────────────────────────────────────────────────────────────

const COR_STATUS: Record<string, string> = {
  confirmado: 'bg-green-100 text-green-700 border-green-200',
  pendente:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  concluido:  'bg-gray-100 text-gray-500 border-gray-200',
  cancelado:  'bg-red-50 text-red-400 border-red-100',
  reagendado: 'bg-orange-50 text-orange-400 border-orange-100',
}
const LABEL_STATUS: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente:   'Pendente',
  concluido:  'Concluído',
  cancelado:  'Cancelado',
  reagendado: 'Reagendado',
}

function isAtivo(status: string) {
  return !['cancelado', 'reagendado'].includes(status)
}

// ── página ─────────────────────────────────────────────────────────────────────

export default async function MedicoAgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; mes?: string; vista?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  let { data: medico } = await adminSupabase
    .from('medicos')
    .select('id, nome, especialidade, sexo, foto_url')
    .eq('usuario_id', user.id)
    .single()

  if (!medico) {
    const { data: perfilAdmin } = await adminSupabase
      .from('perfis_sistema')
      .select('role')
      .eq('usuario_id', user.id)
      .single()
    if (perfilAdmin?.role === 'admin') {
      const { data: primMedico } = await adminSupabase
        .from('medicos')
        .select('id, nome, especialidade, sexo, foto_url')
        .order('criado_em', { ascending: true })
        .limit(1)
        .single()
      medico = primMedico
    }
  }

  if (!medico) redirect('/login')

  const params = await searchParams
  const vista    = params.vista === 'mes' ? 'mes' : 'semana'
  const semanaOff = parseInt(params.semana || '0')
  const mesOff    = parseInt(params.mes    || '0')

  // ── Datas base ──────────────────────────────────────────────────────────────

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Semana atual (segunda → domingo)
  const diaSemana    = hoje.getDay()
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1
  const segunda      = new Date(hoje)
  segunda.setDate(hoje.getDate() - diasAteSegunda + semanaOff * 7)
  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  domingo.setHours(23, 59, 59, 999)

  // Mês corrente + offset
  const refMes  = new Date(hoje.getFullYear(), hoje.getMonth() + mesOff, 1)
  const primeiroDiaMes = new Date(refMes.getFullYear(), refMes.getMonth(), 1)
  const ultimoDiaMes   = new Date(refMes.getFullYear(), refMes.getMonth() + 1, 0, 23, 59, 59, 999)

  // ── Fetch agendamentos ──────────────────────────────────────────────────────

  const inicio = vista === 'mes' ? primeiroDiaMes.toISOString() : segunda.toISOString()
  const fim    = vista === 'mes' ? ultimoDiaMes.toISOString()   : domingo.toISOString()

  const { data: agendamentos } = await adminSupabase
    .from('agendamentos')
    .select('*')
    .eq('medico_id', medico.id)
    .gte('data_hora', inicio)
    .lte('data_hora', fim)
    .order('data_hora', { ascending: true })

  const pacienteIds = [...new Set((agendamentos || []).map((a: any) => a.paciente_id))]
  const { data: pacientes } = pacienteIds.length > 0
    ? await adminSupabase.from('pacientes').select('id, nome, telefone').in('id', pacienteIds)
    : { data: [] }

  const pacienteMap: Record<string, any> = {}
  ;(pacientes || []).forEach((p: any) => { pacienteMap[p.id] = p })

  const totalAtivos     = (agendamentos || []).filter((a: any) => isAtivo(a.status)).length
  const totalCancelados = (agendamentos || []).filter((a: any) => a.status === 'cancelado').length

  // ── Semana ──────────────────────────────────────────────────────────────────

  const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    return d
  })
  const agsPorDiaSemana: Record<string, any[]> = {}
  diasSemana.forEach(d => { agsPorDiaSemana[d.toDateString()] = [] })
  ;(agendamentos || []).forEach((a: any) => {
    const spDate = new Date(new Date(a.data_hora).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    spDate.setHours(0, 0, 0, 0)
    const key = spDate.toDateString()
    if (agsPorDiaSemana[key]) agsPorDiaSemana[key].push(a)
  })

  const labelSemana = semanaOff === 0
    ? 'Esta semana'
    : semanaOff === 1 ? 'Próxima semana'
    : semanaOff === -1 ? 'Semana passada'
    : `${semanaOff > 0 ? '+' : ''}${semanaOff} sem.`

  // ── Mês ─────────────────────────────────────────────────────────────────────

  const DIAS_ABREV = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const labelMes   = refMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Gera grid do mês: linha 0 = primeira semana (segunda → domingo)
  // primeiroDiaMes.getDay(): 0=dom,1=seg,...,6=sab → converter para índice seg=0
  const priDow    = primeiroDiaMes.getDay() // 0=Dom
  const offsetGrid = priDow === 0 ? 6 : priDow - 1 // deslocamento para segunda
  const ultimoDia  = ultimoDiaMes.getDate()
  // total de células: preenche até completar semanas
  const totalCelulas = Math.ceil((offsetGrid + ultimoDia) / 7) * 7

  const agsPorDiaMes: Record<string, any[]> = {}
  ;(agendamentos || []).forEach((a: any) => {
    const spDate = new Date(new Date(a.data_hora).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const key = `${spDate.getFullYear()}-${spDate.getMonth()}-${spDate.getDate()}`
    if (!agsPorDiaMes[key]) agsPorDiaMes[key] = []
    agsPorDiaMes[key].push(a)
  })

  function celulaDia(idx: number): Date | null {
    const dayNum = idx - offsetGrid + 1
    if (dayNum < 1 || dayNum > ultimoDia) return null
    return new Date(refMes.getFullYear(), refMes.getMonth(), dayNum)
  }

  // ── Labels navegação mês ─────────────────────────────────────────────────────
  const labelNavMes = mesOff === 0
    ? 'Este mês'
    : mesOff === 1 ? 'Próximo mês'
    : mesOff === -1 ? 'Mês passado'
    : `${mesOff > 0 ? '+' : ''}${mesOff} m.`

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader
        titulo="Minha Agenda"
        backHref="/medico/dashboard"
        medicoNome={medico.nome}
        medicoSexo={medico.sexo}
        medicoFotoUrl={medico.foto_url}
      />

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Cabeçalho ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1A3A2C] flex items-center gap-2">
              <Calendar className="w-6 h-6" /> Minha Agenda
            </h1>
            <p className="text-gray-500 mt-1 capitalize">
              {vista === 'mes' ? labelMes : labelMes} —{' '}
              {totalAtivos} consulta{totalAtivos !== 1 ? 's' : ''} ativa{totalAtivos !== 1 ? 's' : ''}
              {totalCancelados > 0 && (
                <span className="text-red-400 ml-2">
                  · {totalCancelados} cancelada{totalCancelados !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle semana / mês */}
            <div className="flex bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <Link
                href={`/medico/agendamentos?vista=semana&semana=${semanaOff}`}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors ${
                  vista === 'semana'
                    ? 'bg-[#1A3A2C] text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Semana
              </Link>
              <Link
                href={`/medico/agendamentos?vista=mes&mes=${mesOff}`}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors ${
                  vista === 'mes'
                    ? 'bg-[#1A3A2C] text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Mês
              </Link>
            </div>

            {/* Navegação */}
            {vista === 'semana' ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/medico/agendamentos?vista=semana&semana=${semanaOff - 1}`}
                  className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </Link>
                <span className="text-sm font-medium text-[#1A3A2C] min-w-[96px] text-center">
                  {labelSemana}
                </span>
                <Link
                  href={`/medico/agendamentos?vista=semana&semana=${semanaOff + 1}`}
                  className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/medico/agendamentos?vista=mes&mes=${mesOff - 1}`}
                  className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </Link>
                <span className="text-sm font-medium text-[#1A3A2C] min-w-[96px] text-center">
                  {labelNavMes}
                </span>
                <Link
                  href={`/medico/agendamentos?vista=mes&mes=${mesOff + 1}`}
                  className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* VISTA SEMANA                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {vista === 'semana' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {diasSemana.map((dia, i) => {
                const isHoje    = dia.toDateString() === new Date().toDateString()
                const agsDia    = agsPorDiaSemana[dia.toDateString()] || []
                const isPast    = dia < hoje && !isHoje
                const ativos    = agsDia.filter((a: any) => isAtivo(a.status))
                const cancelados = agsDia.filter((a: any) => a.status === 'cancelado')

                return (
                  <div
                    key={dia.toISOString()}
                    className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isPast ? 'opacity-60' : ''} ${isHoje ? 'ring-2 ring-[#5BBD9B]' : ''}`}
                  >
                    <div className={`px-3 py-3 text-center ${isHoje ? 'bg-[#1A3A2C]' : 'bg-gray-50 border-b border-gray-100'}`}>
                      <p className={`text-xs font-medium ${isHoje ? 'text-green-200' : 'text-gray-400'}`}>{DIAS_SEMANA[i]}</p>
                      <p className={`text-xl font-bold mt-0.5 ${isHoje ? 'text-white' : 'text-[#1A3A2C]'}`}>{dia.getDate()}</p>
                      {agsDia.length > 0 && (
                        <div className="flex justify-center gap-1 mt-1">
                          {ativos.length > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              isHoje ? 'bg-white/20 text-white' : 'bg-[#5BBD9B]/10 text-[#5BBD9B]'
                            }`}>
                              {ativos.length}
                            </span>
                          )}
                          {cancelados.length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-400">
                              -{cancelados.length}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-2 space-y-1.5 min-h-[80px]">
                      {agsDia.length === 0 ? (
                        <p className="text-center text-xs text-gray-300 py-4">—</p>
                      ) : (
                        agsDia.map((a: any) => {
                          const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                          const paciente = pacienteMap[a.paciente_id]
                          const primeiroNome = (paciente?.nome || 'Paciente').split(' ')[0]
                          const isCancelado  = a.status === 'cancelado'
                          return (
                            <div key={a.id} className={`rounded-lg p-2 border text-xs ${COR_STATUS[a.status] || 'bg-green-50 text-green-700 border-green-100'}`}>
                              <div className={`flex items-center gap-1 font-semibold ${isCancelado ? 'line-through opacity-60' : ''}`}>
                                {isCancelado ? <XCircle className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
                                {hora}
                              </div>
                              <Link href={`/medico/agendamento/${a.id}`} className={`flex items-center gap-1 mt-0.5 truncate hover:underline ${isCancelado ? 'opacity-60 text-gray-400' : 'text-gray-600'}`}>
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{primeiroNome}</span>
                              </Link>
                              {!isCancelado && (
                                <BotaoEntrarConsultaMedico agendamentoId={a.id} dataHora={a.data_hora} />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Lista detalhada semana */}
            {(agendamentos || []).length > 0 ? (
              <ListaDetalhada agendamentos={agendamentos || []} pacienteMap={pacienteMap} />
            ) : (
              <EmptyState />
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* VISTA MÊS                                                           */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {vista === 'mes' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DIAS_ABREV.map(d => (
                  <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                {Array.from({ length: totalCelulas }, (_, idx) => {
                  const dia = celulaDia(idx)
                  if (!dia) {
                    return <div key={`empty-${idx}`} className="min-h-[100px] bg-gray-50/50" />
                  }

                  const key       = `${dia.getFullYear()}-${dia.getMonth()}-${dia.getDate()}`
                  const agsDia    = agsPorDiaMes[key] || []
                  const isHoje    = dia.toDateString() === new Date().toDateString()
                  const isPast    = dia < hoje && !isHoje
                  const ativos    = agsDia.filter((a: any) => isAtivo(a.status))
                  const cancelados = agsDia.filter((a: any) => a.status === 'cancelado')
                  const MAX_SHOW  = 3
                  const hidden    = ativos.length - MAX_SHOW

                  return (
                    <div key={key} className={`min-h-[100px] p-2 ${isPast ? 'bg-gray-50/40' : ''}`}>
                      {/* Número do dia */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isHoje ? 'bg-[#1A3A2C] text-white' : isPast ? 'text-gray-300' : 'text-[#1A3A2C]'
                        }`}>
                          {dia.getDate()}
                        </span>
                        {agsDia.length > 0 && (
                          <div className="flex gap-0.5">
                            {ativos.length > 0 && (
                              <span className="text-[10px] bg-[#5BBD9B]/10 text-[#5BBD9B] px-1 rounded font-semibold">
                                {ativos.length}
                              </span>
                            )}
                            {cancelados.length > 0 && (
                              <span className="text-[10px] bg-red-50 text-red-400 px-1 rounded font-semibold">
                                -{cancelados.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pílulas de agendamento */}
                      <div className="space-y-0.5">
                        {ativos.slice(0, MAX_SHOW).map((a: any) => {
                          const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                          const pac  = pacienteMap[a.paciente_id]
                          const primeiroNome = (pac?.nome || '').split(' ')[0]
                          return (
                            <Link
                              key={a.id}
                              href={`/medico/agendamento/${a.id}`}
                              className={`block text-[10px] rounded px-1.5 py-0.5 truncate font-medium hover:opacity-80 transition-opacity ${
                                a.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                                a.status === 'pendente'   ? 'bg-yellow-100 text-yellow-700' :
                                a.status === 'concluido'  ? 'bg-gray-100 text-gray-500' :
                                'bg-green-100 text-green-700'
                              }`}
                            >
                              {hora} {primeiroNome}
                            </Link>
                          )
                        })}
                        {hidden > 0 && (
                          <p className="text-[10px] text-gray-400 pl-1">+{hidden} mais</p>
                        )}
                        {cancelados.length > 0 && ativos.length === 0 && (
                          <p className="text-[10px] text-red-300 pl-1 line-through">
                            {cancelados.length} cancelada{cancelados.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lista detalhada mês */}
            {(agendamentos || []).length > 0 ? (
              <ListaDetalhada agendamentos={agendamentos || []} pacienteMap={pacienteMap} />
            ) : (
              <EmptyState />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function ListaDetalhada({
  agendamentos,
  pacienteMap,
}: {
  agendamentos: any[]
  pacienteMap: Record<string, any>
}) {
  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-[#1A3A2C]">
          Lista detalhada
          <span className="ml-2 text-xs text-gray-400 font-normal">({agendamentos.length} no período)</span>
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {agendamentos.map((a: any) => {
          const paciente   = pacienteMap[a.paciente_id]
          const dataHora   = new Date(a.data_hora)
          const isCancelado = a.status === 'cancelado'
          return (
            <div key={a.id} className={`px-6 py-4 flex items-start justify-between ${isCancelado ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCancelado ? 'bg-red-50' : 'bg-green-50'}`}>
                  {isCancelado
                    ? <XCircle className="w-5 h-5 text-red-300" />
                    : <User className="w-5 h-5 text-[#5BBD9B]" />
                  }
                </div>
                <div>
                  <Link
                    href={`/medico/agendamento/${a.id}`}
                    className={`font-medium hover:text-[#5BBD9B] hover:underline ${isCancelado ? 'line-through text-gray-400' : 'text-gray-800'}`}
                  >
                    {paciente?.nome || 'Paciente'}
                  </Link>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {dataHora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                    </span>
                  </div>
                  {a.observacoes && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">"{a.observacoes}"</p>
                  )}
                  {isCancelado && a.motivo_cancelamento && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Motivo: <span className="italic">"{a.motivo_cancelamento}"</span>
                    </p>
                  )}
                  {isCancelado && !a.motivo_cancelamento && (
                    <p className="text-xs text-red-300 mt-1 italic">Cancelado sem motivo informado</p>
                  )}
                  {!isCancelado && (() => {
                    const dataConsulta = new Date(a.data_hora.endsWith('Z') ? a.data_hora : a.data_hora + 'Z')
                    const isFutura = dataConsulta > new Date()
                    if (!isFutura) return null
                    const abreDate = new Date(dataConsulta.getTime() - 10 * 60 * 1000)
                    const abreStr  = abreDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                    return (
                      <p className="text-xs text-[#5BBD9B] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sala abre às {abreStr}
                      </p>
                    )
                  })()}
                  {!isCancelado && (
                    <BotaoEntrarConsultaMedico agendamentoId={a.id} dataHora={a.data_hora} />
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${COR_STATUS[a.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {LABEL_STATUS[a.status] || a.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-8 bg-white rounded-2xl p-12 shadow-sm text-center">
      <Calendar className="w-14 h-14 text-gray-200 mx-auto mb-4" />
      <p className="text-gray-400 font-medium">Nenhuma consulta no período</p>
      <p className="text-sm text-gray-300 mt-1">Quando pacientes agendarem, aparecerão aqui</p>
    </div>
  )
}
