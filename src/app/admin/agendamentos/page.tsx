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
  searchParams: Promise<{ semana?: string; medico_id?: string; view?: string; mes?: string }>
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
  const offset     = parseInt(params.semana || '0')
  const mesOffset  = parseInt(params.mes    || '0')
  const view       = params.view === 'mes' ? 'mes' : 'semana'
  const modoTodos  = params.medico_id === 'todos'

  // Médico selecionado (só relevante fora do modo todos)
  const medicoId = (!modoTodos && params.medico_id) ? params.medico_id : medicos[0].id
  const medico   = medicos.find(m => m.id === medicoId) || medicos[0]

  // ─── Dados da semana ────────────────────────────────────────────────────────
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diaSemana     = hoje.getDay()
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - diasAteSegunda + offset * 7)
  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  domingo.setHours(23, 59, 59, 999)

  let agendamentos: any[] = []
  let pacienteMap: Record<string, any> = {}

  if (view === 'semana') {
    let agendamentosQuery = adminSupabase
      .from('agendamentos')
      .select('*')
      .gte('data_hora', segunda.toISOString())
      .lte('data_hora', domingo.toISOString())
      .order('data_hora', { ascending: true })
    if (!modoTodos) agendamentosQuery = agendamentosQuery.eq('medico_id', medico.id)
    const { data: ags } = await agendamentosQuery
    agendamentos = ags || []

    const pacienteIds = [...new Set(agendamentos.map((a: any) => a.paciente_id))]
    const { data: pacientes } = pacienteIds.length > 0
      ? await adminSupabase.from('pacientes').select('id, nome, telefone').in('id', pacienteIds)
      : { data: [] }
    ;(pacientes || []).forEach((p: any) => { pacienteMap[p.id] = p })
  }

  // ─── Dados do mês ───────────────────────────────────────────────────────────
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset, 1)
  const ultimoDiaMes   = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset + 1, 0)
  ultimoDiaMes.setHours(23, 59, 59, 999)

  let agendamentosMes: any[] = []
  let pacienteMapMes: Record<string, any> = {}

  if (view === 'mes') {
    let qMes = adminSupabase
      .from('agendamentos')
      .select('*')
      .gte('data_hora', primeiroDiaMes.toISOString())
      .lte('data_hora', ultimoDiaMes.toISOString())
      .order('data_hora', { ascending: true })
    if (!modoTodos) qMes = qMes.eq('medico_id', medico.id)
    const { data: ags } = await qMes
    agendamentosMes = ags || []

    const pacienteIds = [...new Set(agendamentosMes.map((a: any) => a.paciente_id))]
    const { data: pacientes } = pacienteIds.length > 0
      ? await adminSupabase.from('pacientes').select('id, nome, telefone').in('id', pacienteIds)
      : { data: [] }
    ;(pacientes || []).forEach((p: any) => { pacienteMapMes[p.id] = p })
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const DIAS     = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const DIAS_ABR = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    return d
  })

  const agendamentosPorDia: Record<string, any[]> = {}
  diasSemana.forEach(d => { agendamentosPorDia[d.toDateString()] = [] })
  agendamentos.forEach((a: any) => {
    const d     = new Date(a.data_hora)
    const spDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    spDate.setHours(0, 0, 0, 0)
    const key = spDate.toDateString()
    if (agendamentosPorDia[key]) agendamentosPorDia[key].push(a)
  })

  // Grade mensal — começa na Segunda da semana que contém o dia 1
  const diaPrimeiro = primeiroDiaMes.getDay()                      // 0=Dom
  const diasAntes   = diaPrimeiro === 0 ? 6 : diaPrimeiro - 1     // quantos dias antes do 1º
  const startGrid   = new Date(primeiroDiaMes)
  startGrid.setDate(1 - diasAntes)
  const totalCells  = Math.ceil((diasAntes + ultimoDiaMes.getDate()) / 7) * 7
  const gridDays    = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(startGrid)
    d.setDate(startGrid.getDate() + i)
    return d
  })

  // Agendamentos por dia no mês (chave: "ano-mes-dia")
  const agsPorDiaMes: Record<string, any[]> = {}
  agendamentosMes.forEach((a: any) => {
    const d      = new Date(a.data_hora)
    const spDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const key    = `${spDate.getFullYear()}-${spDate.getMonth()}-${spDate.getDate()}`
    if (!agsPorDiaMes[key]) agsPorDiaMes[key] = []
    agsPorDiaMes[key].push(a)
  })

  // Calcula offset de semana para um dia qualquer (para linkar a semana certa)
  function weekOffsetForDay(d: Date): number {
    const segundaBase = new Date(hoje)
    segundaBase.setDate(hoje.getDate() - diasAteSegunda)
    const dow         = d.getDay()
    const daw         = dow === 0 ? 6 : dow - 1
    const segundaDia  = new Date(d)
    segundaDia.setDate(d.getDate() - daw)
    return Math.round((segundaDia.getTime() - segundaBase.getTime()) / (7 * 24 * 60 * 60 * 1000))
  }

  const labelMes     = segunda.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const labelMesMes  = primeiroDiaMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const totalAtivos     = agendamentos.filter((a: any) => !['cancelado', 'reagendado'].includes(a.status)).length
  const totalCancelados = agendamentos.filter((a: any) => a.status === 'cancelado').length
  const totalAtivosMes  = agendamentosMes.filter((a: any) => !['cancelado', 'reagendado'].includes(a.status)).length

  const corStatus: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700 border-green-200',
    pendente:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    concluido:  'bg-gray-100 text-gray-500 border-gray-200',
    cancelado:  'bg-red-50 text-red-400 border-red-100',
    reagendado: 'bg-orange-50 text-orange-400 border-orange-100',
  }

  function navLink(novaSemana: number, novoMedico?: string) {
    const m = novoMedico ?? (modoTodos ? 'todos' : medico.id)
    return `/admin/agendamentos?medico_id=${m}&semana=${novaSemana}&view=semana`
  }

  function mesLink(novoMes: number, novoMedico?: string) {
    const m = novoMedico ?? (modoTodos ? 'todos' : medico.id)
    return `/admin/agendamentos?medico_id=${m}&mes=${novoMes}&view=mes`
  }

  function viewLink(novaView: string, novoMedico?: string) {
    const m = novoMedico ?? (modoTodos ? 'todos' : medico.id)
    if (novaView === 'mes') return `/admin/agendamentos?medico_id=${m}&mes=0&view=mes`
    return `/admin/agendamentos?medico_id=${m}&semana=0&view=semana`
  }

  function medicoLink(mId: string) {
    return view === 'mes'
      ? `/admin/agendamentos?medico_id=${mId}&mes=${mesOffset}&view=mes`
      : `/admin/agendamentos?medico_id=${mId}&semana=${offset}&view=semana`
  }

  function todosLink() {
    return view === 'mes'
      ? `/admin/agendamentos?medico_id=todos&mes=${mesOffset}&view=mes`
      : `/admin/agendamentos?medico_id=todos&semana=${offset}&view=semana`
  }

  function nomeAbrev(nome: string, palavras = 2) {
    return nome.split(' ').slice(0, palavras).join(' ')
  }

  const tituloHeader = modoTodos ? 'Todos os Médicos' : `Dr(a). ${medico.nome}`

  // URL desta página para o botão "Voltar" nas fichas de paciente
  const medicoParam = modoTodos ? 'todos' : medico.id
  const backUrl = view === 'mes'
    ? `/admin/agendamentos?medico_id=${medicoParam}&mes=${mesOffset}&view=mes`
    : `/admin/agendamentos?medico_id=${medicoParam}&semana=${offset}&view=semana`
  const backEncoded = encodeURIComponent(backUrl)

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
              href={todosLink()}
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
              const cor  = PALETA[i % PALETA.length]
              const ativo = !modoTodos && m.id === medico.id
              return (
                <Link
                  key={m.id}
                  href={medicoLink(m.id)}
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

        {/* ── Cabeçalho + toggle Semana / Mês ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1A3A2C] flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {tituloHeader}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5 capitalize">
              {view === 'mes'
                ? `${labelMesMes} — ${totalAtivosMes} consulta${totalAtivosMes !== 1 ? 's' : ''} ativa${totalAtivosMes !== 1 ? 's' : ''}`
                : `${labelMes} — ${totalAtivos} consulta${totalAtivos !== 1 ? 's' : ''} ativa${totalAtivos !== 1 ? 's' : ''}`
              }
              {view === 'semana' && totalCancelados > 0 && (
                <span className="text-red-400 ml-2">· {totalCancelados} cancelada{totalCancelados !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Semana / Mês */}
            <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <Link
                href={viewLink('semana')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  view === 'semana' ? 'bg-[#1A3A2C] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Semana
              </Link>
              <Link
                href={viewLink('mes')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  view === 'mes' ? 'bg-[#1A3A2C] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Mês
              </Link>
            </div>

            {/* Navegação */}
            {view === 'semana' ? (
              <>
                <Link href={navLink(offset - 1)} className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </Link>
                <span className="text-sm font-medium text-[#1A3A2C] min-w-[90px] text-center">
                  {offset === 0 ? 'Esta semana' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana passada' : `${offset > 0 ? '+' : ''}${offset} sem.`}
                </span>
                <Link href={navLink(offset + 1)} className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </Link>
              </>
            ) : (
              <>
                <Link href={mesLink(mesOffset - 1)} className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </Link>
                <span className="text-sm font-medium text-[#1A3A2C] min-w-[90px] text-center capitalize">
                  {mesOffset === 0 ? 'Este mês' : mesOffset === 1 ? 'Próximo mês' : mesOffset === -1 ? 'Mês passado' : primeiroDiaMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                </span>
                <Link href={mesLink(mesOffset + 1)} className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* VISTA SEMANA                                                          */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {view === 'semana' && (
          <>
            {/* Grade semanal */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-8">
              {diasSemana.map((dia, i) => {
                const isHoje    = dia.toDateString() === new Date().toDateString()
                const agsDia    = agendamentosPorDia[dia.toDateString()] || []
                const isPast    = dia < hoje && !isHoje
                const ativos    = agsDia.filter((a: any) => !['cancelado', 'reagendado'].includes(a.status))
                const cancelados= agsDia.filter((a: any) => a.status === 'cancelado')
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
                        const hora    = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                        const pac     = pacienteMap[a.paciente_id]
                        const nomePac = (pac?.nome || 'Paciente').split(' ')[0]
                        const isCancelado = a.status === 'cancelado'
                        const medInfo = medicoMap[a.medico_id]
                        const cardClass = modoTodos && !isCancelado
                          ? `${medInfo?.cor.bg} ${medInfo?.cor.text} border ${medInfo?.cor.border}`
                          : corStatus[a.status] || 'bg-green-50 text-green-700 border-green-100'
                        return (
                          <Link
                            href={pac ? `/admin/pacientes/${a.paciente_id}?back=${backEncoded}` : '#'}
                            key={a.id}
                            className={`block rounded-lg p-2 border text-xs hover:opacity-80 transition-opacity ${cardClass}`}
                          >
                            <div className={`flex items-center gap-1 font-semibold ${isCancelado ? 'line-through opacity-60' : ''}`}>
                              {isCancelado ? <XCircle className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
                              {hora}
                            </div>
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

            {/* Lista detalhada */}
            {agendamentos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-[#1A3A2C]">
                    Detalhes da semana — {tituloHeader}
                  </h2>
                  {modoTodos && (
                    <div className="flex flex-wrap gap-2">
                      {medicos.map((m: any, i: number) => {
                        const cor   = PALETA[i % PALETA.length]
                        const count = agendamentos.filter((a: any) => a.medico_id === m.id).length
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
                  {agendamentos.map((a: any) => {
                    const pac        = pacienteMap[a.paciente_id]
                    const dataHora   = new Date(a.data_hora)
                    const isCancelado = a.status === 'cancelado'
                    const medInfo    = medicoMap[a.medico_id]
                    const obs        = a.observacoes
                      ? a.observacoes.replace(/\[Encaminhado por .+?\]\n?/g, '').trim()
                      : null
                    return (
                      <div key={a.id} className={`px-6 py-4 flex items-start justify-between ${isCancelado ? 'opacity-70' : ''}`}>
                        <div className="flex items-start gap-4">
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
                              href={pac ? `/admin/pacientes/${a.paciente_id}?back=${backEncoded}` : '#'}
                              className={`font-medium hover:text-[#5BBD9B] hover:underline ${isCancelado ? 'line-through text-gray-400' : 'text-gray-800'}`}
                            >
                              {pac?.nome || 'Paciente'}
                            </Link>
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
                              const abreStr  = abreDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                              return (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Sala abre às {abreStr}
                                </p>
                              )
                            })()}
                            {pac && (
                              <Link href={`/admin/pacientes/${a.paciente_id}?back=${backEncoded}`} className="inline-flex items-center gap-1 mt-2 text-xs text-[#5BBD9B] hover:underline font-medium">
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

            {agendamentos.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">Nenhum agendamento nesta semana</p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* VISTA MÊS                                                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {view === 'mes' && (
          <>
            {/* Legenda (modo todos) */}
            {modoTodos && agendamentosMes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {medicos.map((m: any, i: number) => {
                  const cor   = PALETA[i % PALETA.length]
                  const count = agendamentosMes.filter((a: any) => a.medico_id === m.id && !['cancelado','reagendado'].includes(a.status)).length
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

            {/* Grade mensal */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DIAS_ABR.map(d => (
                  <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Células */}
              <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                {gridDays.map((dia, idx) => {
                  const isCurrentMonth = dia.getMonth() === primeiroDiaMes.getMonth()
                  const isHoje         = dia.toDateString() === new Date().toDateString()
                  const key            = `${dia.getFullYear()}-${dia.getMonth()}-${dia.getDate()}`
                  const agsDia         = agsPorDiaMes[key] || []
                  const ativos         = agsDia.filter((a: any) => !['cancelado','reagendado'].includes(a.status))
                  const cancelados     = agsDia.filter((a: any) => a.status === 'cancelado')
                  const wOffset        = weekOffsetForDay(dia)

                  // Doctors with appointments this day (for dots)
                  const medicosDia: string[] = [...new Set(ativos.map((a: any) => a.medico_id as string))]

                  return (
                    <Link
                      key={idx}
                      href={navLink(wOffset)}
                      className={`min-h-[100px] p-2 flex flex-col transition-colors hover:bg-[#F3FAF7] ${
                        !isCurrentMonth ? 'bg-gray-50/50' : ''
                      } ${isHoje ? 'bg-[#5BBD9B]/5' : ''}`}
                    >
                      {/* Número do dia */}
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1 self-start ${
                        isHoje
                          ? 'bg-[#1A3A2C] text-white'
                          : isCurrentMonth
                            ? 'text-[#1A3A2C]'
                            : 'text-gray-300'
                      }`}>
                        {dia.getDate()}
                      </span>

                      {/* Consultas */}
                      {ativos.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {modoTodos ? (
                            // Modo todos: dot por médico
                            <div className="flex flex-wrap gap-1 mb-0.5">
                              {medicosDia.slice(0, 4).map(mId => {
                                const mi = medicoMap[mId]
                                if (!mi) return null
                                return (
                                  <span key={mId} className={`w-2 h-2 rounded-full ${mi.cor.dot}`} />
                                )
                              })}
                              {medicosDia.length > 4 && (
                                <span className="text-[9px] text-gray-400">+{medicosDia.length - 4}</span>
                              )}
                            </div>
                          ) : null}

                          {/* Primeiras consultas (até 2) */}
                          {ativos.slice(0, 2).map((a: any) => {
                            const hora    = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                            const pac     = pacienteMapMes[a.paciente_id]
                            const nomePac = (pac?.nome || '').split(' ')[0] || '—'
                            const medInfo = medicoMap[a.medico_id]
                            return (
                              <div
                                key={a.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium ${
                                  modoTodos && medInfo
                                    ? `${medInfo.cor.bg} ${medInfo.cor.text}`
                                    : 'bg-[#5BBD9B]/10 text-[#1A6B4A]'
                                }`}
                              >
                                {hora} {nomePac}
                              </div>
                            )
                          })}

                          {/* Mais */}
                          {ativos.length > 2 && (
                            <span className="text-[10px] text-gray-400 font-medium pl-1">
                              +{ativos.length - 2} mais
                            </span>
                          )}
                        </div>
                      )}

                      {/* Cancelados */}
                      {cancelados.length > 0 && (
                        <span className="text-[10px] text-red-400 mt-auto pl-0.5">
                          -{cancelados.length} cancel.
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Lista completa do mês */}
            {agendamentosMes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-[#1A3A2C] capitalize">
                    Todos os agendamentos — {labelMesMes}
                  </h2>
                  <span className="text-sm text-gray-400">{agendamentosMes.length} total</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {agendamentosMes.map((a: any) => {
                    const pac         = pacienteMapMes[a.paciente_id]
                    const dataHora    = new Date(a.data_hora)
                    const isCancelado = a.status === 'cancelado'
                    const medInfo     = medicoMap[a.medico_id]
                    const obs         = a.observacoes
                      ? a.observacoes.replace(/\[Encaminhado por .+?\]\n?/g, '').trim()
                      : null
                    return (
                      <div key={a.id} className={`px-6 py-4 flex items-start justify-between ${isCancelado ? 'opacity-70' : ''}`}>
                        <div className="flex items-start gap-4">
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
                              href={pac ? `/admin/pacientes/${a.paciente_id}?back=${backEncoded}` : '#'}
                              className={`font-medium hover:text-[#5BBD9B] hover:underline ${isCancelado ? 'line-through text-gray-400' : 'text-gray-800'}`}
                            >
                              {pac?.nome || 'Paciente'}
                            </Link>
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
                            {pac && (
                              <Link href={`/admin/pacientes/${a.paciente_id}?back=${backEncoded}`} className="inline-flex items-center gap-1 mt-2 text-xs text-[#5BBD9B] hover:underline font-medium">
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

            {agendamentosMes.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">Nenhum agendamento neste mês</p>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}
