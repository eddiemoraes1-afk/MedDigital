'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, CheckCircle2, FileText, Video, Loader2,
  RefreshCw, Lock, AlertTriangle, Clock, PhoneCall,
} from 'lucide-react'

interface AtendimentoFila {
  id: string
  criado_em: string
  medico_id: string | null
  paciente_id: string
  notas_medico: string | null
  urgente: boolean
  pacientes: { id: string; nome: string; cpf: string } | null
  triagens: { id: string; classificacao_risco: string | null; resumo_ia: string | null } | null
}

// Protocolo de Manchester
const COR_RISCO: Record<string, string> = {
  azul:     'bg-blue-100 text-blue-700',
  verde:    'bg-green-100 text-green-700',
  amarelo:  'bg-yellow-100 text-yellow-700',
  laranja:  'bg-orange-100 text-orange-700',
  vermelho: 'bg-red-100 text-red-700',
}
const LABEL_RISCO: Record<string, string> = {
  azul:     'Não Urgente',
  verde:    'Pouco Urgente',
  amarelo:  'Urgente',
  laranja:  'Muito Urgente',
  vermelho: 'Emergência',
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarUltimaAtt(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function minutosEspera(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
}

function estiloEspera(minutos: number): { classe: string; label: string } {
  if (minutos < 5)  return { classe: 'text-green-500 font-bold', label: `${minutos} min` }
  if (minutos < 10) return { classe: 'text-orange-500 font-bold', label: `${minutos} min` }
  return               { classe: 'text-red-600 font-bold fila-pisca', label: `${minutos} min` }
}

const INTERVALO_MS = 10_000

// ── Componente de item de fila (reutilizado nas duas seções) ─────────────────

function FilaItem({
  atendimento, index, estado, urgente,
  encaminhadoPorMatch, assumindo,
  onNomeClick, onAtenderClick,
}: {
  atendimento: AtendimentoFila
  index: number
  estado: 'meu' | 'ativo' | 'travado'
  urgente: boolean
  encaminhadoPorMatch: (a: AtendimentoFila) => RegExpMatchArray | null
  assumindo: boolean
  onNomeClick: (e: React.MouseEvent, a: AtendimentoFila) => void
  onAtenderClick: (e: React.MouseEvent, a: AtendimentoFila) => void
}) {
  const risco      = atendimento.triagens?.classificacao_risco ?? null
  const pacienteId = atendimento.pacientes?.id ?? atendimento.paciente_id
  const resumo     = atendimento.triagens?.resumo_ia
  const encMatch   = encaminhadoPorMatch(atendimento)
  const encPor     = encMatch ? encMatch[1] : null
  const travado    = estado === 'travado'
  const isMeu      = estado === 'meu'

  if (travado) {
    return (
      <div className="px-6 py-4 flex items-center gap-4 bg-gray-50/70 opacity-60 select-none">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-400 truncate">
              {atendimento.pacientes?.nome || 'Paciente'}
            </span>
            {risco && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 opacity-70 ${COR_RISCO[risco] || 'bg-gray-100 text-gray-600'}`}>
                {LABEL_RISCO[risco] || risco}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-semibold shrink-0">
              #{index + 1} na fila
            </span>
          </div>
          {(() => {
            const mins = minutosEspera(atendimento.criado_em)
            const { classe, label } = estiloEspera(mins)
            return (
              <p className={`text-xs mt-1 opacity-80 ${classe}`}>
                Aguardando desde {formatarHora(atendimento.criado_em)}
                <span className="ml-1">({label})</span>
              </p>
            )
          })()}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
          <Lock className="w-3.5 h-3.5" />
          Aguardando vez
        </div>
      </div>
    )
  }

  const borderColor = isMeu ? 'border-orange-400' : urgente ? 'border-orange-300' : 'border-[#5BBD9B]'
  const bgColor     = isMeu ? 'bg-orange-50' : urgente ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-gray-50'

  return (
    <div className={`px-6 py-5 flex items-center gap-4 transition-colors border-l-4 ${bgColor} ${borderColor}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
        isMeu ? 'bg-orange-100 text-orange-700' : urgente ? 'bg-orange-100/60 text-orange-700' : 'bg-[#5BBD9B]/20 text-[#1A3A2C]'
      }`}>
        {isMeu ? '★' : index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/medico/pacientes/${pacienteId}?back=${encodeURIComponent('/medico/dashboard')}`}
            onClick={e => onNomeClick(e, atendimento)}
            className={`font-semibold transition-colors hover:underline ${
              isMeu ? 'text-orange-700 hover:text-orange-900'
                    : urgente ? 'text-orange-800 hover:text-orange-600'
                    : 'text-[#1A3A2C] hover:text-[#5BBD9B]'
            } ${assumindo ? 'pointer-events-none opacity-60' : ''}`}
            title={isMeu ? 'Ver prontuário' : 'Clique para assumir este paciente e ver o prontuário'}
          >
            {atendimento.pacientes?.nome || 'Paciente'}
          </a>

          {isMeu && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-200 text-orange-800 shrink-0">
              {encPor ? `Encaminhado por ${encPor}` : 'Você assumiu'}
            </span>
          )}
          {!isMeu && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
              urgente ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
            }`}>
              Próximo
            </span>
          )}

          {risco && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${COR_RISCO[risco] || 'bg-gray-100 text-gray-600'}`}>
              {LABEL_RISCO[risco] || risco}
            </span>
          )}
        </div>

        {resumo ? (
          <div className="flex items-start gap-1.5 mt-1">
            <FileText className="w-3.5 h-3.5 text-[#5BBD9B] shrink-0 mt-0.5" />
            <p className="text-sm text-gray-500 line-clamp-2">{resumo}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-300 mt-0.5 italic">Sem resumo de triagem</p>
        )}

        {(() => {
          const mins = minutosEspera(atendimento.criado_em)
          const { classe, label } = estiloEspera(mins)
          return (
            <p className={`text-sm mt-1.5 ${classe}`}>
              Aguardando desde {formatarHora(atendimento.criado_em)}
              <span className="ml-1.5 text-base">({label})</span>
            </p>
          )
        })()}

        {!isMeu && (
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Ao clicar no nome ou em Atender, você assume este paciente e não poderá desistir.
          </p>
        )}
      </div>

      <button
        onClick={e => onAtenderClick(e, atendimento)}
        disabled={assumindo}
        className={`text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 transition-colors disabled:opacity-60 ${
          isMeu    ? 'bg-orange-500 hover:bg-orange-600'
          : urgente ? 'bg-orange-600 hover:bg-orange-700'
          : 'bg-[#1A3A2C] hover:bg-[#5BBD9B]'
        }`}
      >
        {assumindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
        {isMeu ? 'Entrar na consulta' : 'Atender'}
      </button>
    </div>
  )
}

export default function FilaVirtualRealtime() {
  const router = useRouter()

  const [fila, setFila]               = useState<AtendimentoFila[]>([])
  const [filaUrgente, setFilaUrgente] = useState<AtendimentoFila[]>([])
  const [filaNormal, setFilaNormal]   = useState<AtendimentoFila[]>([])
  const [medicoId, setMedicoId]       = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [ultimaAtt, setUltimaAtt]     = useState<Date | null>(null)
  const [erro, setErro]               = useState(false)
  const [, setAgora]                  = useState(0)
  const [assumindo, setAssumindo]     = useState(false)
  const [erroAssumir, setErroAssumir] = useState('')
  const [consultaAtiva, setConsultaAtiva] = useState<{ id: string; pacienteNome: string } | null>(null)

  const intervalRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const clockRef          = useRef<ReturnType<typeof setInterval> | null>(null)
  // IDs urgentes conhecidos (para detectar novos e tocar alerta)
  const idsUrgenteRef     = useRef<Set<string>>(new Set())

  // ── Alerta sonoro para paciente urgente novo ─────────────────────────────────
  function tocarAlertaUrgente() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const seq = [
        { freq: 880, start: 0,    dur: 0.18 },
        { freq: 660, start: 0.22, dur: 0.18 },
        { freq: 880, start: 0.44, dur: 0.18 },
        { freq: 440, start: 0.66, dur: 0.35 },
      ]
      seq.forEach(({ freq, start, dur }) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.45, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur + 0.05)
      })
      // Mensagem de voz
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const msg = new SpeechSynthesisUtterance('Atenção! Paciente urgente na fila preferencial.')
          msg.lang = 'pt-BR'
          msg.rate = 0.95
          window.speechSynthesis.speak(msg)
        }, 1200)
      }
    } catch { /* silencioso se AudioContext não disponível */ }
  }

  const fetchFila = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    else setAtualizando(true)
    try {
      const res  = await fetch('/api/medico/fila', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) { setErro(true); return }

      const novaFilaUrgente: AtendimentoFila[] = data.filaUrgente ?? []
      const novaFilaNormal:  AtendimentoFila[] = data.filaNormal  ?? []

      // Detectar novos pacientes urgentes (sem médico ainda) → alerta sonoro
      if (silencioso) {
        const novosUrgentes = novaFilaUrgente.filter(
          a => !a.medico_id && !idsUrgenteRef.current.has(a.id)
        )
        if (novosUrgentes.length > 0) tocarAlertaUrgente()
      }
      // Atualizar IDs conhecidos
      idsUrgenteRef.current = new Set(novaFilaUrgente.map(a => a.id))

      setFilaUrgente(novaFilaUrgente)
      setFilaNormal(novaFilaNormal)
      setFila(data.fila ?? [...novaFilaUrgente, ...novaFilaNormal])
      setMedicoId(data.medicoId ?? null)
      setConsultaAtiva(data.consultaAtiva ?? null)
      setUltimaAtt(new Date())
      setErro(false)
    } catch {
      setErro(true)
    } finally {
      setLoading(false)
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFila(false)
    intervalRef.current = setInterval(() => fetchFila(true), INTERVALO_MS)
    clockRef.current    = setInterval(() => setAgora(Date.now()), 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (clockRef.current)    clearInterval(clockRef.current)
    }
  }, [fetchFila])

  // ── Assumir paciente (atômico no servidor) ────────────────────────────────

  async function assumirPaciente(atendimentoId: string): Promise<boolean> {
    setAssumindo(true)
    setErroAssumir('')
    try {
      const res = await fetch('/api/medico/assumir-paciente', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ atendimento_id: atendimentoId }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErroAssumir(d.error || 'Paciente já foi assumido por outro médico.')
        await fetchFila(false)
        return false
      }
      return true
    } catch {
      setErroAssumir('Erro de conexão. Tente novamente.')
      return false
    } finally {
      setAssumindo(false)
    }
  }

  async function handleNomeClick(e: React.MouseEvent, atendimento: AtendimentoFila) {
    e.preventDefault()
    if (assumindo) return
    const pacienteId = atendimento.pacientes?.id ?? atendimento.paciente_id
    const ok = await assumirPaciente(atendimento.id)
    if (ok) {
      router.push(`/medico/pacientes/${pacienteId}?back=${encodeURIComponent('/medico/dashboard')}`)
    }
  }

  async function handleAtenderClick(e: React.MouseEvent, atendimento: AtendimentoFila) {
    e.preventDefault()
    if (assumindo) return
    const ok = await assumirPaciente(atendimento.id)
    if (ok) {
      router.push(`/medico/atendimento/${atendimento.id}`)
    }
  }

  // ── Determinar estado de cada posição da fila ─────────────────────────────

  // TODOS os atendimentos atribuídos a este médico (encaminhados + assumidos)
  const meusAtendimentos = medicoId ? fila.filter(a => a.medico_id === medicoId) : []
  const meuAssumido      = meusAtendimentos[0] ?? null
  const estouOcupado     = meusAtendimentos.length > 0

  // Por fila (urgente e normal têm seus próprios "primeiros desbloqueados")
  const ativoUrgenteId = estouOcupado ? null : (filaUrgente.find(a => !a.medico_id)?.id ?? null)
  const ativoNormalId  = estouOcupado ? null : (filaNormal.find(a => !a.medico_id)?.id ?? null)

  function estadoPosicao(a: AtendimentoFila): 'meu' | 'ativo' | 'travado' {
    if (a.medico_id === medicoId && medicoId) return 'meu'
    if (a.id === ativoUrgenteId || a.id === ativoNormalId) return 'ativo'
    return 'travado'
  }

  // Detecta se é encaminhamento e quem encaminhou
  const encaminhadoPorMatch = (a: AtendimentoFila) =>
    a.notas_medico ? a.notas_medico.match(/\[Encaminhado por (.+?)\]/) : null

  // Mensagem do banner de ocupação
  function mensagemBanner(): string {
    if (!meuAssumido) return ''
    const enc = encaminhadoPorMatch(meuAssumido)
    const nome = meuAssumido.pacientes?.nome || 'um paciente'
    if (enc) {
      return `Você recebeu um encaminhamento de ${enc[1]}: atenda "${nome}" antes de assumir qualquer outro paciente da fila.`
    }
    return `Você assumiu "${nome}". Encerre essa consulta para liberar o próximo da fila.`
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <style>{`
        @keyframes fila-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .fila-pisca { animation: fila-blink 0.9s step-start infinite; }
      `}</style>

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#5BBD9B]" />
          <h2 className="font-bold text-[#1A3A2C]">Fila de Atendimento Virtual</h2>
          <div className="flex items-center gap-1.5" title={`Última atualização: ${formatarUltimaAtt(ultimaAtt)}`}>
            {atualizando
              ? <RefreshCw className="w-3 h-3 text-[#5BBD9B] animate-spin" />
              : (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5BBD9B] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5BBD9B]" />
                </span>
              )}
            <span className="text-[10px] text-gray-400 hidden sm:inline">ao vivo</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {ultimaAtt && (
            <span className="text-[10px] text-gray-300 hidden md:inline">
              atualizado {formatarUltimaAtt(ultimaAtt)}
            </span>
          )}
          {filaUrgente.length > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {filaUrgente.length} urgente{filaUrgente.length > 1 ? 's' : ''}
            </span>
          )}
          {fila.length > 0 && (
            <span className="bg-[#5BBD9B] text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {fila.length} aguardando
            </span>
          )}
        </div>
      </div>

      {/* Erro ao assumir */}
      {erroAssumir && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{erroAssumir}</p>
          <button onClick={() => setErroAssumir('')} className="ml-auto text-xs text-red-400 hover:text-red-600">
            fechar
          </button>
        </div>
      )}

      {/* ── Consulta em andamento travada (saiu sem finalizar) ── */}
      {consultaAtiva && (
        <div className="px-6 py-4 bg-red-50 border-b-2 border-red-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <PhoneCall className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-700 leading-tight">
                Consulta em andamento com {consultaAtiva.pacienteNome}
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                Você saiu da sala sem finalizar. O paciente pode ainda estar aguardando.
              </p>
            </div>
          </div>
          <a
            href={`/medico/atendimento/${consultaAtiva.id}`}
            className="shrink-0 flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <Video className="w-3.5 h-3.5" />
            Retomar consulta
          </a>
        </div>
      )}

      {/* Aviso: médico ocupado com paciente aguardando (assumido mas ainda não entrou) */}
      {estouOcupado && !consultaAtiva && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            {mensagemBanner()}
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
          <p className="text-sm text-gray-400">Carregando fila...</p>
        </div>
      ) : erro ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-400">Erro ao carregar a fila.</p>
          <button onClick={() => fetchFila(false)} className="mt-2 text-xs text-[#5BBD9B] hover:underline">
            Tentar novamente
          </button>
        </div>
      ) : fila.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Fila vazia</p>
          <p className="text-gray-300 text-sm mt-1">Nenhum paciente aguardando no momento</p>
        </div>
      ) : (
        <div>
          {/* ── Fila Preferencial (urgente) ── */}
          {filaUrgente.length > 0 && (
            <>
              <div className="px-6 py-2.5 bg-orange-50 border-y border-orange-100 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                  Fila Preferencial 🟠 — Muito Urgente
                </p>
                <span className="ml-auto text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {filaUrgente.length} paciente{filaUrgente.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-orange-50">
                {filaUrgente.map((atendimento, index) =>
                  <FilaItem key={atendimento.id} atendimento={atendimento} index={index}
                    estado={estadoPosicao(atendimento)} encaminhadoPorMatch={encaminhadoPorMatch}
                    assumindo={assumindo} onNomeClick={handleNomeClick} onAtenderClick={handleAtenderClick}
                    urgente={true} />
                )}
              </div>
            </>
          )}

          {/* ── Fila Normal ── */}
          {filaNormal.length > 0 && (
            <>
              {filaUrgente.length > 0 && (
                <div className="px-6 py-2.5 bg-gray-50 border-y border-gray-100 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fila Normal</p>
                  <span className="ml-auto text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {filaNormal.length} paciente{filaNormal.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="divide-y divide-gray-50">
                {filaNormal.map((atendimento, index) =>
                  <FilaItem key={atendimento.id} atendimento={atendimento} index={index}
                    estado={estadoPosicao(atendimento)} encaminhadoPorMatch={encaminhadoPorMatch}
                    assumindo={assumindo} onNomeClick={handleNomeClick} onAtenderClick={handleAtenderClick}
                    urgente={false} />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
