'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, UserCheck, Send, Search, Wifi, WifiOff,
  X, ChevronLeft, ChevronRight, Calendar, Clock,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MedicoDisponivel {
  id: string
  nome: string
  especialidade: string
  crm: string
  crm_uf: string
  sexo: string
  foto_url: string | null
  online: boolean
}

interface Props {
  pacienteId: string
  salaVideo: string | null
  onFechar: () => void
  onEncaminhado: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIAS_ABREV = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function drTitle(sexo: string) { return sexo === 'F' ? 'Dra.' : 'Dr.' }

/** Formata YYYY-MM-DD → "18 mai" */
function fmtData(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`
}

/** Gera objeto Date em fuso local (sem UTC shift) */
function localDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Data → string YYYY-MM-DD */
function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────

interface CalendarProps {
  diasComAgenda: Set<number>        // dias da semana (0–6)
  dataSelecionada: string | null    // YYYY-MM-DD
  onChange: (iso: string) => void
}

function MiniCalendar({ diasComAgenda, dataSelecionada, onChange }: CalendarProps) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [mesOffset, setMesOffset] = useState(0) // 0 = mês atual, 1 = próximo mês...

  const mesBase = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset, 1)
  const ano     = mesBase.getFullYear()
  const mes     = mesBase.getMonth()

  // Primeiro dia da grade (domingo da semana do dia 1)
  const primeiroDia = new Date(ano, mes, 1)
  const offsetInicio = primeiroDia.getDay() // 0=Dom
  const totalDias    = new Date(ano, mes + 1, 0).getDate()

  // Células: padding inicial + dias do mês
  const celulas: Array<Date | null> = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => new Date(ano, mes, i + 1)),
  ]
  // Pad to multiple of 7
  while (celulas.length % 7 !== 0) celulas.push(null)

  const podePrevious = mesOffset > 0 // não pode voltar antes do mês atual

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setMesOffset(o => Math.max(0, o - 1))}
          disabled={!podePrevious}
          className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <span className="text-xs font-semibold text-[#1A3A2C]">
          {MESES[mes]} {ano}
        </span>
        <button
          onClick={() => setMesOffset(o => Math.min(3, o + 1))}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_ABREV.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {celulas.map((d, i) => {
          if (!d) return <div key={i} />

          const isoStr   = toISO(d)
          const passado  = d < hoje
          const temAgenda = diasComAgenda.has(d.getDay())
          const disponivel = !passado && temAgenda
          const selecionado = isoStr === dataSelecionada
          const eHoje = toISO(d) === toISO(hoje)

          return (
            <button
              key={i}
              onClick={() => disponivel && onChange(isoStr)}
              disabled={!disponivel}
              className={`
                relative w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-all font-medium
                ${selecionado
                  ? 'bg-orange-500 text-white shadow-sm'
                  : disponivel
                    ? 'hover:bg-orange-50 hover:text-orange-700 text-[#1A3A2C] cursor-pointer'
                    : 'text-gray-200 cursor-not-allowed'
                }
              `}
            >
              {d.getDate()}
              {eHoje && !selecionado && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EncaminhamentoForm({ pacienteId, salaVideo, onFechar, onEncaminhado }: Props) {
  const [medicos, setMedicos]                   = useState<MedicoDisponivel[]>([])
  const [loading, setLoading]                   = useState(true)
  const [medicoSelecionado, setMedicoSelecionado] = useState<MedicoDisponivel | null>(null)
  const [modo, setModo]                         = useState<'imediato' | 'agendado'>('imediato')
  const [busca, setBusca]                       = useState('')
  const [observacoes, setObservacoes]           = useState('')

  // Scheduling state
  const [diasComAgenda, setDiasComAgenda]       = useState<Set<number>>(new Set())
  const [loadingDias, setLoadingDias]           = useState(false)
  const [dataSelecionada, setDataSelecionada]   = useState<string | null>(null)
  const [slots, setSlots]                       = useState<string[]>([])
  const [duracaoMin, setDuracaoMin]             = useState(30)
  const [loadingSlots, setLoadingSlots]         = useState(false)
  const [slotSelecionado, setSlotSelecionado]   = useState<string | null>(null)

  // Submission state
  const [enviando, setEnviando]   = useState(false)
  const [sucesso, setSucesso]     = useState(false)
  const [erro, setErro]           = useState('')

  // ── Load doctors ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/medico/medicos-para-encaminhar')
      .then(r => r.json())
      .then(d => { setMedicos(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // ── When doctor + agendado mode is active, fetch schedule days ─────────────
  const fetchDiasAgenda = useCallback(async (medicoId: string) => {
    setLoadingDias(true)
    setDiasComAgenda(new Set())
    setDataSelecionada(null)
    setSlots([])
    setSlotSelecionado(null)
    try {
      const res  = await fetch(`/api/medico/slots-disponiveis?medico_id=${medicoId}`)
      const data = await res.json()
      setDiasComAgenda(new Set(data.diasSemana ?? []))
    } catch { /* ignore */ }
    setLoadingDias(false)
  }, [])

  // ── When a date is selected, fetch available slots ─────────────────────────
  const fetchSlots = useCallback(async (medicoId: string, data: string) => {
    setLoadingSlots(true)
    setSlots([])
    setSlotSelecionado(null)
    try {
      const res  = await fetch(`/api/medico/slots-disponiveis?medico_id=${medicoId}&data=${data}`)
      const json = await res.json()
      setSlots(json.slots ?? [])
      setDuracaoMin(json.duracao_minutos ?? 30)
    } catch { /* ignore */ }
    setLoadingSlots(false)
  }, [])

  function selecionarMedico(m: MedicoDisponivel) {
    setMedicoSelecionado(m)
    const novoModo = m.online ? 'imediato' : 'agendado'
    setModo(novoModo)
    setBusca('')
    setDataSelecionada(null)
    setSlots([])
    setSlotSelecionado(null)
    if (!m.online) fetchDiasAgenda(m.id)
  }

  function handleModoChange(novoModo: 'imediato' | 'agendado') {
    setModo(novoModo)
    if (novoModo === 'agendado' && medicoSelecionado && diasComAgenda.size === 0 && !loadingDias) {
      fetchDiasAgenda(medicoSelecionado.id)
    }
  }

  function handleDataChange(iso: string) {
    setDataSelecionada(iso)
    setSlotSelecionado(null)
    if (medicoSelecionado) fetchSlots(medicoSelecionado.id, iso)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function enviar() {
    if (!medicoSelecionado) return
    if (modo === 'agendado' && (!dataSelecionada || !slotSelecionado)) {
      setErro('Selecione a data e o horário')
      return
    }

    setEnviando(true)
    setErro('')

    const dataHora = modo === 'agendado'
      ? `${dataSelecionada}T${slotSelecionado}:00`
      : null

    try {
      const res = await fetch('/api/medico/encaminhar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: modo,
          paciente_id: pacienteId,
          medico_destino_id: medicoSelecionado.id,
          sala_video: modo === 'imediato' ? salaVideo : null,
          observacoes: observacoes || null,
          data_hora: dataHora,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao encaminhar'); return }

      setSucesso(true)
      setTimeout(onEncaminhado, 1800)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const medicosFiltrados = medicos.filter(m => {
    const q = busca.toLowerCase()
    return m.nome.toLowerCase().includes(q) || m.especialidade.toLowerCase().includes(q)
  })

  // ── Success ────────────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="text-center py-6 px-2">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <UserCheck className="w-7 h-7 text-green-600" />
        </div>
        <p className="font-semibold text-[#1A3A2C] text-sm">Encaminhamento realizado!</p>
        <p className="text-xs text-gray-400 mt-1.5">
          {modo === 'imediato'
            ? `Paciente adicionado à fila de ${drTitle(medicoSelecionado!.sexo)} ${medicoSelecionado!.nome}`
            : `Consulta agendada: ${fmtData(dataSelecionada!)} às ${slotSelecionado} com ${drTitle(medicoSelecionado!.sexo)} ${medicoSelecionado!.nome}`}
        </p>
      </div>
    )
  }

  // ── Doctor search ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#1A3A2C] uppercase tracking-wide">
          Encaminhar para especialista
        </p>
        <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Step 1: Search ────────────────────────────────────────────────── */}
      {!medicoSelecionado ? (
        <div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou especialidade..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : medicosFiltrados.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              {busca ? 'Nenhum médico encontrado' : 'Nenhum outro médico cadastrado'}
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
              {medicosFiltrados.map(m => (
                <button
                  key={m.id}
                  onClick={() => selecionarMedico(m)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 text-left transition-colors"
                >
                  <div className="relative shrink-0">
                    {m.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.foto_url} alt={m.nome} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1A3A2C]/10 flex items-center justify-center text-xs font-bold text-[#1A3A2C]">
                        {m.nome.charAt(0)}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A3A2C] truncate">{drTitle(m.sexo)} {m.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{m.especialidade}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    m.online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {m.online ? 'Online' : 'Offline'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Step 2: Mode + scheduling ────────────────────────────────────── */
        <div className="space-y-3">
          {/* Selected doctor card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="relative shrink-0">
              {medicoSelecionado.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={medicoSelecionado.foto_url} alt={medicoSelecionado.nome} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#1A3A2C]/10 flex items-center justify-center text-sm font-bold text-[#1A3A2C]">
                  {medicoSelecionado.nome.charAt(0)}
                </div>
              )}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${medicoSelecionado.online ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A3A2C] truncate">
                {drTitle(medicoSelecionado.sexo)} {medicoSelecionado.nome}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {medicoSelecionado.especialidade} · CRM {medicoSelecionado.crm}/{medicoSelecionado.crm_uf}
              </p>
            </div>
            <button
              onClick={() => { setMedicoSelecionado(null); setDiasComAgenda(new Set()) }}
              className="text-xs text-[#5BBD9B] hover:text-[#1A3A2C] font-medium shrink-0 transition-colors"
            >
              Trocar
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => handleModoChange('imediato')}
              disabled={!medicoSelecionado.online}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                modo === 'imediato'
                  ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Wifi className="w-3.5 h-3.5" />
              Fila Virtual
            </button>
            <button
              onClick={() => handleModoChange('agendado')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                modo === 'agendado'
                  ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Agendar
            </button>
          </div>

          {/* Offline notice */}
          {!medicoSelecionado.online && modo === 'imediato' && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2.5 rounded-xl">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              Médico offline — use agendamento para reservar horário.
            </div>
          )}

          {/* ── Agendado: Calendar + slots ──────────────────────────────── */}
          {modo === 'agendado' && (
            <div className="space-y-3">
              {/* Calendar */}
              <div className="border border-gray-100 rounded-xl p-3 bg-white">
                {loadingDias ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                    <span className="text-xs text-gray-400 ml-2">Carregando agenda...</span>
                  </div>
                ) : diasComAgenda.size === 0 ? (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Este médico não tem horários cadastrados.</p>
                  </div>
                ) : (
                  <MiniCalendar
                    diasComAgenda={diasComAgenda}
                    dataSelecionada={dataSelecionada}
                    onChange={handleDataChange}
                  />
                )}
              </div>

              {/* Date selected label */}
              {dataSelecionada && (
                <p className="text-xs text-gray-500 text-center font-medium">
                  {localDate(dataSelecionada).toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                </p>
              )}

              {/* Time slots */}
              {dataSelecionada && (
                <div>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">
                      Nenhum horário disponível nesta data.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-400 font-medium">
                          Horários disponíveis ({duracaoMin} min/consulta)
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                        {slots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => setSlotSelecionado(slot)}
                            className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              slotSelecionado === slot
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white border-gray-200 text-[#1A3A2C] hover:border-orange-300 hover:bg-orange-50'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">
              Motivo / observações <span className="text-gray-300">(opcional)</span>
            </label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Ex: quadro depressivo, solicitar avaliação psiquiátrica..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none placeholder-gray-300"
            />
          </div>

          {/* Selected summary badge */}
          {modo === 'agendado' && dataSelecionada && slotSelecionado && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 py-2 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-xs text-orange-700 font-medium">
                {fmtData(dataSelecionada)} às {slotSelecionado}
                {' '}· {drTitle(medicoSelecionado.sexo)} {medicoSelecionado.nome.split(' ')[0]}
              </span>
            </div>
          )}

          {erro && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{erro}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onFechar}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={enviar}
              disabled={
                enviando ||
                (modo === 'agendado' && (!dataSelecionada || !slotSelecionado))
              }
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              {enviando
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              {modo === 'imediato' ? 'Encaminhar agora' : 'Confirmar agendamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
