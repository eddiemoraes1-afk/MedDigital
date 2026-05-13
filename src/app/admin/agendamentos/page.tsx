import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Calendar, Clock, ChevronLeft, ChevronRight, User, XCircle, Users, ExternalLink, LayoutGrid,
} from 'lucide-react'
import AdminHeader from '../components/AdminHeader'

// Paleta de cores por médico no modo "todos"
const PALETA = [
  { bg: 'bg-[#5BBD9B]/10', text: 'text-[#1A6B4A]', border: 'border-[#5BBD9B]/30', dot: 'bg-[#5BBD9B]' },
  { bg: 'bg-blue-50',      text: 'text-blue-700',   border: 'border-blue-200',      dot: 'bg-blue-400' },
  { bg: 'bg-purple-50',    text: 'text-purple-700',  border: 'border-purple-200',    dot: 'bg-purple-400' },
  { bg: 'bg-orange-50',    text: 'text-orange-700',  border: 'border-orange-200',    dot: 'bg-orange-400' },
  { bg: 'bg-pink-50',      text: 'text-pink-700',    border: 'border-pink-200',      dot: 'bg-pink-400' },
  { bg: 'bg-amber-50',     text: 'text-amber-700',   border: 'border-amber-200',     dot: 'bg-amber-400' },
  { bg: 'bg-cyan-50',      text: 'text-cyan-700',    border: 'border-cyan-200',      dot: 'bg-cyan-400' },
  { bg: 'bg-rose-50',      text: 'text-rose-700',    border: 'border-rose-200',      dot: 'bg-rose-400' },
]

export default async function AdminAgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; medico_id?: string }>
}) {
  await requireAdmin()
  const adminSupabase = createAdminClient()

  // Todos os médicos aprovados
  const { data: medicos } = await adminSupabase
    .from('medicos')
    .select('id, nome, especialidade')
    .eq('status', 'aprovado')
    .order('nome', { ascending: true })

  if (!medicos || medicos.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum médico aprovado</p>
          <Link href="/admin" className="text-sm text-[#5BBD9B] hover:underline mt-2 inline-block">← Voltar ao painel</Link>
        </div>
      </div>
    )
  }

  // Mapa médico id → { nome, cor }
  const medicoMap: Record<string, { nome: string; cor: typeof PALETA[0] }> = {}
  medicos.forEach((m, i) => {
    medicoMap[m.id] = { nome: m.nome, cor: PALETA[i % PALETA.length] }
  })

  const params = await searchParams
  const offset = parseInt(params.semana || '0')
  const modoTodos = params.medico_id === 'todos'

  // Médico selecionado (só relevante fora do modo todos)
  const medicoId = (!modoTodos && params.medico_id) ? params.medico_id : medicos[0].id
  const medico   = medicos.find(m => m.id === medicoId) || medicos[0]

  // Calcular semana
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diaSemana = hoje.getDay()
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - diasAteSegunda + offset * 7)
  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  domingo.setHours(23, 59, 59, 999)

  // Buscar agendamentos
  let agendamentosQuery = adminSupabase
    .from('agendamentos')
    .select('*')
    .gte('data_hora', segunda.toISOString())
    .lte('data_hora', domingo.toISOString())
    .order('data_hora', { ascending: true })

  if (!modoTodos) {
    agendamentosQuery = agendamentosQuery.eq('medico_id', medico.id)
  }

  const { data: agendamentos } = await agendamentosQuery

  // Pacientes
  const pacienteIds = [...new Set((agendamentos || []).map((a: any) => a.paciente_id))]
  const { data: pacientes } = pacienteIds.length > 0
    ? await adminSupabase.from('pacientes').select('id, nome, telefone').in('id', pacienteIds)
    : { data: [] }
  const pacienteMap: Record<string, any> = {}
  ;(pacientes || []).forEach((p: any) => { pacienteMap[p.id] = p })

  const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    return d
  })

  const agendamentosPorDia: Record<string, any[]> = {}
  diasSemana.forEach(d => { agendamentosPorDia[d.toDateString()] = [] })
  ;(agendamentos || []).forEach((a: any) => {
    const d = new Date(a.data_hora)
    const spDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    spDate.setHours(0, 0, 0, 0)
    const key = spDate.toDateString()
    if (agendamentosPorDia[key]) agendamentosPorDia[key].push(a)
  })

  const labelMes = segunda.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const totalAtivos     = (agendamentos || []).filter((a: any) => !['cancelado', 'reagendado'].includes(a.status)).length
  const totalCancelados = (agendamentos || []).filter((a: any) => a.status === 'cancelado').length

  const corStatus: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700 border-green-200',
    pendente:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    concluido:  'bg-gray-100 text-gray-500 border-gray-200',
    cancelado:  'bg-red-50 text-red-400 border-red-100',
    reagendado: 'bg-orange-50 text-orange-400 border-orange-100',
  }

  function navLink(novaSemana: number, novoMedico?: string) {
    const m = novoMedico ?? (modoTodos ? 'todos' : medico.id)
    return `/admin/agendamentos?medico_id=${m}&semana=${novaSemana}`
  }

  // Helper: abreviação do nome do médico
  function nomeAbrev(nome: string, palavras = 2) {
    return nome.split(' ').slice(0, palavras).join(' ')
  }

  // Título do cabeçalho
  const tituloHeader = modoTodos ? 'Todos os Médicos' : `Dr(a). ${medico.nome}`

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader ativo="agendamentos" />

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Seletor de médico ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Médico:
          </span>
          <div className="flex flex-wrap gap-2">

            {/* Botão "Todos" */}
            <Link
              href={`/admin/agendamentos?medico_id=todos&semana=${offset}`}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                modoTodos
                  ? 'bg-[#1A3A2C] text-white'
                  : 'bg-[#5BBD9B]/10 text-[#1A3A2C] hover:bg-[#5BBD9B]/20 border border-[#5BBD9B]/30'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Todos
            </Link>

            {/* Divider */}
            <div className="w-px h-7 bg-gray-200 self-center" />

            {/* Médicos individuais */}
            {medicos.map((m: any, i: number) => {
              const cor = PALETA[i % PALETA.length]
              const ativo = !modoTodos && m.id === medico.id
              return (
                <Link
                  key={m.id}
                  href={navLink(offset, m.id)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    ativo ? 'bg-[#1A3A2C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {modoTodos && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cor.dot}`} />
                  )}
                  Dr(a). {nomeAbrev(m.nome)}
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Cabeçalho semana ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1A3A2C] flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {tituloHeader}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5 capitalize">
              {labelMes} — {totalAtivos} consulta{totalAtivos !== 1 ? 's' : ''} ativa{totalAtivos !== 1 ? 's' : ''}
              {totalCancelados > 0 && (
                <span className="text-red-400 ml-2">· {totalCancelados} cancelada{totalCancelados !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={navLink(offset - 1)} className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </Link>
            <span className="text-sm font-medium text-[#1A3A2C] min-w-[90px] text-center">
              {offset === 0 ? 'Esta semana' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana passada' : `${offset > 0 ? '+' : ''}${offset} sem.`}
            </span>
            <Link href={navLink(offset + 1)} className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </Link>
          </div>
        </div>

        {/* ── Grade semanal ── */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-8">
          {diasSemana.map((dia, i) => {
            const isHoje = dia.toDateString() === new Date().toDateString()
            const agsDia = agendamentosPorDia[dia.toDateString()] || []
            const isPast = dia < hoje && !isHoje
            const ativos     = agsDia.filter((a: any) => !['cancelado', 'reagendado'].includes(a.status))
            const cancelados = agsDia.filter((a: any) => a.status === 'cancelado')
            return (
              <div
                key={dia.toISOString()}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isPast ? 'opacity-60' : ''} ${isHoje ? 'ring-2 ring-[#5BBD9B]' : ''}`}
              >
                <div className={`px-3 py-3 text-center ${isHoje ? 'bg-[#1A3A2C]' : 'bg-gray-50 border-b border-gray-100'}`}>
                  <p className={`text-xs font-medium ${isHoje ? 'text-green-200' : 'text-gray-400'}`}>{DIAS[i]}</p>
                  <p className={`text-xl font-bold mt-0.5 ${isHoje ? 'text-white' : 'text-[#1A3A2C]'}`}>{dia.getDate()}</p>
                  {agsDia.length > 0 && (
                    <div className="flex justify-center gap-1 mt-1">
                      {ativos.length > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isHoje ? 'bg-white/20 text-white' : 'bg-[#5BBD9B]/10 text-[#5BBD9B]'}`}>
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
                  ) : agsDia.map((a: any) => {
                    const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                    const pac  = pacienteMap[a.paciente_id]
                    const nomePac = (pac?.nome || 'Paciente').split(' ')[0]
                    const isCancelado = a.status === 'cancelado'
                    const medInfo = medicoMap[a.medico_id]

                    // Cor do card: no modo todos usa paleta do médico; no modo individual usa corStatus
                    const cardClass = modoTodos && !isCancelado
                      ? `${medInfo?.cor.bg} ${medInfo?.cor.text} border ${medInfo?.cor.border}`
                      : corStatus[a.status] || 'bg-green-50 text-green-700 border-green-100'

                    return (
                      <Link
                        href={pac ? `/admin/pacientes/${a.paciente_id}` : '#'}
                        key={a.id}
                        className={`block rounded-lg p-2 border text-xs hover:opacity-80 transition-opacity ${cardClass}`}
                      >
                        <div className={`flex items-center gap-1 font-semibold ${isCancelado ? 'line-through opacity-60' : ''}`}>
                          {isCancelado ? <XCircle className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
                          {hora}
                        </div>
                        {/* No modo todos: mostra nome do médico com ponto colorido */}
                        {modoTodos && medInfo ? (
                          <p className="text-[10px] opacity-80 truncate mt-0.5 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${medInfo.cor.dot}`} />
                            Dr(a). {nomeAbrev(medInfo.nome)}
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            Dr(a). {nomeAbrev(modoTodos ? (medInfo?.nome || '') : medico.nome)}
                          </p>
                        )}
                        <div className={`flex items-center gap-1 mt-0.5 truncate ${isCancelado ? 'opacity-60 text-gray-400' : 'text-gray-600'}`}>
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{nomePac}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Lista detalhada ── */}
        {(agendamentos || []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-[#1A3A2C]">
                Detalhes da semana — {tituloHeader}
              </h2>
              {modoTodos && (
                <div className="flex flex-wrap gap-2">
                  {medicos.map((m: any, i: number) => {
                    const cor = PALETA[i % PALETA.length]
                    const count = (agendamentos || []).filter((a: any) => a.medico_id === m.id).length
                    if (count === 0) return null
                    return (
                      <span key={m.id} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cor.bg} ${cor.text} ${cor.border}`}>
                        <span className={`w-2 h-2 rounded-full ${cor.dot}`} />
                        Dr(a). {nomeAbrev(m.nome)} · {count}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {(agendamentos || []).map((a: any) => {
                const pac = pacienteMap[a.paciente_id]
                const dataHora = new Date(a.data_hora)
                const isCancelado = a.status === 'cancelado'
                const medInfo = medicoMap[a.medico_id]
                // Strip referral marker from observacoes
                const obs = a.observacoes
                  ? a.observacoes.replace(/\[Encaminhado por .+?\]\n?/g, '').trim()
                  : null

                return (
                  <div key={a.id} className={`px-6 py-4 flex items-start justify-between ${isCancelado ? 'opacity-70' : ''}`}>
                    <div className="flex items-start gap-4">
                      {/* Ícone colorido por médico no modo todos */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCancelado ? 'bg-red-50' :
                        modoTodos && medInfo ? `${medInfo.cor.bg} border ${medInfo.cor.border}` : 'bg-green-50'
                      }`}>
                        {isCancelado
                          ? <XCircle className="w-5 h-5 text-red-300" />
                          : <User className={`w-5 h-5 ${modoTodos && medInfo ? medInfo.cor.text : 'text-[#5BBD9B]'}`} />
                        }
                      </div>
                      <div>
                        <Link
                          href={pac ? `/admin/pacientes/${a.paciente_id}` : '#'}
                          className={`font-medium hover:text-[#5BBD9B] hover:underline ${isCancelado ? 'line-through text-gray-400' : 'text-gray-800'}`}
                        >
                          {pac?.nome || 'Paciente'}
                        </Link>

                        {/* Nome do médico — sempre visível */}
                        <p className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${modoTodos && medInfo ? medInfo.cor.text : 'text-[#5BBD9B]'}`}>
                          {modoTodos && medInfo && <span className={`w-2 h-2 rounded-full ${medInfo.cor.dot}`} />}
                          Dr(a). {medInfo?.nome || medico.nome}
                        </p>

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
                        {obs && <p className="text-xs text-gray-400 mt-0.5 italic">"{obs}"</p>}
                        {isCancelado && a.motivo_cancelamento && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Motivo: <span className="italic">"{a.motivo_cancelamento}"</span>
                          </p>
                        )}
                        {!isCancelado && (() => {
                          const dataConsulta = new Date(a.data_hora.endsWith('Z') ? a.data_hora : a.data_hora + 'Z')
                          if (dataConsulta <= new Date()) return null
                          const abreDate = new Date(dataConsulta.getTime() - 10 * 60 * 1000)
                          const abreStr = abreDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                          return (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Sala abre às {abreStr}
                            </p>
                          )
                        })()}
                        {pac && (
                          <Link href={`/admin/pacientes/${a.paciente_id}`} className="inline-flex items-center gap-1 mt-2 text-xs text-[#5BBD9B] hover:underline font-medium">
                            <ExternalLink className="w-3 h-3" /> Ver detalhes do paciente
                          </Link>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-4 ${
                      corStatus[a.status]?.replace('border-', '') || 'bg-gray-100 text-gray-500'
                    }`}>
                      {a.status === 'confirmado' ? 'Confirmado' : a.status === 'cancelado' ? 'Cancelado' :
                       a.status === 'reagendado' ? 'Reagendado' : a.status === 'concluido' ? 'Concluído' :
                       a.status === 'agendado' ? 'Agendado' : a.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(agendamentos || []).length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">Nenhum agendamento nesta semana</p>
          </div>
        )}

      </main>
    </div>
  )
}
