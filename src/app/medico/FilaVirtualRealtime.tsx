'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Users, CheckCircle2, FileText, Video, Loader2, RefreshCw } from 'lucide-react'

interface AtendimentoFila {
  id: string
  criado_em: string
  medico_id: string | null
  paciente_id: string
  notas_medico: string | null
  pacientes: { id: string; nome: string; cpf: string } | null
  triagens: { id: string; classificacao_risco: string | null; resumo_ia: string | null } | null
}

const COR_RISCO: Record<string, string> = {
  verde:    'bg-green-100 text-green-700',
  amarelo:  'bg-yellow-100 text-yellow-700',
  laranja:  'bg-orange-100 text-orange-700',
  vermelho: 'bg-red-100 text-red-700',
}
const LABEL_RISCO: Record<string, string> = {
  verde: 'Baixo', amarelo: 'Moderado', laranja: 'Alto', vermelho: 'Urgência',
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarUltimaAtt(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const INTERVALO_MS = 10_000

export default function FilaVirtualRealtime() {
  const [fila, setFila]         = useState<AtendimentoFila[]>([])
  const [medicoId, setMedicoId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [ultimaAtt, setUltimaAtt]     = useState<Date | null>(null)
  const [erro, setErro]               = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchFila = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    else setAtualizando(true)

    try {
      const res  = await fetch('/api/medico/fila', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) { setErro(true); return }
      setFila(data.fila ?? [])
      setMedicoId(data.medicoId ?? null)
      setUltimaAtt(new Date())
      setErro(false)
    } catch {
      setErro(true)
    } finally {
      setLoading(false)
      setAtualizando(false)
    }
  }, [])

  // Carga inicial + polling a cada 10s
  useEffect(() => {
    fetchFila(false)

    intervalRef.current = setInterval(() => {
      fetchFila(true)
    }, INTERVALO_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchFila])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#5BBD9B]" />
          <h2 className="font-bold text-[#1A3A2C]">Fila de Atendimento Virtual</h2>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5" title={`Última atualização: ${formatarUltimaAtt(ultimaAtt)}`}>
            {atualizando ? (
              <RefreshCw className="w-3 h-3 text-[#5BBD9B] animate-spin" />
            ) : (
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
          {fila.length > 0 && (
            <span className="bg-[#5BBD9B] text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {fila.length} aguardando
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
          <p className="text-sm text-gray-400">Carregando fila...</p>
        </div>
      ) : erro ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-400">Erro ao carregar a fila.</p>
          <button
            onClick={() => fetchFila(false)}
            className="mt-2 text-xs text-[#5BBD9B] hover:underline"
          >
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
        <div className="divide-y divide-gray-50">
          {fila.map((atendimento, index) => {
            const risco = atendimento.triagens?.classificacao_risco || null
            const pacienteId = atendimento.pacientes?.id || atendimento.paciente_id
            const resumo = atendimento.triagens?.resumo_ia
            const isEncaminhado = medicoId !== null && atendimento.medico_id === medicoId
            const encaminhadoPorMatch = isEncaminhado && atendimento.notas_medico
              ? atendimento.notas_medico.match(/\[Encaminhado por (.+?)\]/)
              : null
            const encaminhadoPor = encaminhadoPorMatch ? encaminhadoPorMatch[1] : null

            return (
              <div
                key={atendimento.id}
                className={`px-6 py-5 flex items-center gap-4 transition-colors ${
                  isEncaminhado
                    ? 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Position number */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  isEncaminhado ? 'bg-orange-100 text-orange-700' : 'bg-[#1A3A2C]/10 text-[#1A3A2C]'
                }`}>
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/medico/pacientes/${pacienteId}?back=${encodeURIComponent('/medico/dashboard')}`}
                      className="font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                    >
                      {atendimento.pacientes?.nome || 'Paciente'}
                    </Link>
                    {isEncaminhado && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-200 text-orange-800 shrink-0">
                        Encaminhado para você
                      </span>
                    )}
                    {risco && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${COR_RISCO[risco] || 'bg-gray-100 text-gray-600'}`}>
                        {LABEL_RISCO[risco] || risco}
                      </span>
                    )}
                  </div>
                  {encaminhadoPor && (
                    <p className="text-xs text-orange-600 font-medium mt-0.5">
                      Encaminhado por {encaminhadoPor}
                    </p>
                  )}
                  {resumo ? (
                    <Link
                      href={`/medico/pacientes/${pacienteId}?back=${encodeURIComponent('/medico/dashboard')}`}
                      className="flex items-start gap-1.5 mt-1 group"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#5BBD9B] shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-500 group-hover:text-[#1A3A2C] transition-colors line-clamp-2">
                        {resumo}
                      </p>
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-300 mt-0.5 italic">Sem resumo de triagem</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">
                    Aguardando desde {formatarHora(atendimento.criado_em)}
                  </p>
                </div>

                <Link
                  href={`/medico/atendimento/${atendimento.id}`}
                  className={`text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
                    isEncaminhado
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-[#1A3A2C] hover:bg-[#5BBD9B]'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Atender
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
