'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Wifi, WifiOff, Stethoscope, Clock, Users, Activity,
  RefreshCw, Building2, User, AlertCircle, Loader2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
interface FilaItem {
  id: string
  posicao: number
  paciente_id: string
  paciente_nome: string
  classificacao_risco: 'verde' | 'amarelo' | 'laranja' | 'vermelho' | null
  resumo_ia: string | null
  empresa_nome: string
  criado_em: string
  medico_id: string | null // não nulo = médico revisando prontuário
}

interface MedicoStatus {
  id: string
  nome: string
  especialidade: string
  foto_url: string | null
  status: 'online' | 'em_atendimento' | 'offline'
  ultimo_ping: string | null
}

interface ConsultaAtiva {
  id: string
  medico_id: string
  medico_nome: string
  medico_especialidade: string
  paciente_nome: string
  empresa_nome: string
  criado_em: string
  iniciado_em: string | null
  assumido: boolean // true = revisando prontuário; false = já entrou na sala
}

interface TempoRealData {
  fila: FilaItem[]
  medicos: MedicoStatus[]
  consultasAtivas: ConsultaAtiva[]
}

// ── Helpers ──────────────────────────────────────────────────
function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

const RISCO_CONFIG = {
  verde:    { label: 'Verde',   bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  amarelo:  { label: 'Amarelo', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  laranja:  { label: 'Laranja', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  vermelho: { label: 'Vermelho',bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
}

function RiscoBadge({ risco }: { risco: FilaItem['classificacao_risco'] }) {
  if (!risco) return <span className="text-xs text-gray-400">—</span>
  const c = RISCO_CONFIG[risco]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// ── Live Timer Hook ───────────────────────────────────────────
function useLiveMs(): number {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return Date.now()
}

// ── Main Component ────────────────────────────────────────────
export default function TempoRealClient() {
  const [data, setData] = useState<TempoRealData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState(false)
  const now = useLiveMs()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tempo-real')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carrega inicialmente e polling a cada 10s
  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 10_000)
    return () => clearInterval(id)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Conectando ao tempo real...</p>
      </div>
    )
  }

  const fila = data?.fila ?? []
  const medicos = data?.medicos ?? []
  const consultasAtivas = data?.consultasAtivas ?? []

  const medicosOnline = medicos.filter(m => m.status === 'online')
  const medicosAtendendo = medicos.filter(m => m.status === 'em_atendimento')
  const medicosOffline = medicos.filter(m => m.status === 'offline')

  return (
    <div className="space-y-6">

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-700">
              {medicosOnline.length + medicosAtendendo.length} médico{(medicosOnline.length + medicosAtendendo.length) !== 1 ? 's' : ''} online
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">
              {fila.length} na fila
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100">
            <Stethoscope className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-xs font-semibold text-gray-700">
              {consultasAtivas.length} em consulta
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {error && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Erro ao atualizar</span>}
          {lastRefresh && !error && (
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Atualizado {formatDuration(now - lastRefresh.getTime())} atrás · auto 10s
            </span>
          )}
          <button
            onClick={fetchData}
            className="ml-1 text-[#5BBD9B] hover:text-[#1A3A2C] transition-colors"
            title="Atualizar agora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Coluna esquerda: Médicos */}
        <div className="lg:col-span-1 space-y-4">

          {/* Médicos atendendo */}
          {medicosAtendendo.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="font-bold text-[#1A3A2C] text-sm">Em Consulta</h2>
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  {medicosAtendendo.length}
                </span>
              </div>
              <div className="space-y-2">
                {medicosAtendendo.map(m => {
                  const consulta = consultasAtivas.find(c => c.medico_id === m.id)
                  return (
                    <div key={m.id} className={`rounded-xl p-3 border ${consulta?.assumido ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          {m.foto_url
                            ? <img src={m.foto_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                            : <div className={`w-8 h-8 rounded-full flex items-center justify-center ${consulta?.assumido ? 'bg-amber-200' : 'bg-blue-200'}`}>
                                <Stethoscope className={`w-4 h-4 ${consulta?.assumido ? 'text-amber-600' : 'text-blue-600'}`} />
                              </div>
                          }
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${consulta?.assumido ? 'bg-amber-400' : 'bg-blue-500'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#1A3A2C] truncate">{m.nome}</p>
                          <p className={`text-[10px] font-medium ${consulta?.assumido ? 'text-amber-600' : 'text-blue-500'}`}>{m.especialidade}</p>
                        </div>
                        {consulta?.assumido && (
                          <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full shrink-0">
                            Prontuário
                          </span>
                        )}
                      </div>
                      {consulta && (
                        <div className={`mt-2 pt-2 border-t space-y-1 ${consulta.assumido ? 'border-amber-100' : 'border-blue-100'}`}>
                          <div className="flex items-center gap-1 text-[10px] text-gray-600">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="font-medium truncate">{consulta.paciente_nome}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span className="truncate">{consulta.empresa_nome}</span>
                          </div>
                          {consulta.assumido ? (
                            <div className="flex items-center justify-between text-[10px] mt-1">
                              <span className="text-gray-400">Status:</span>
                              <span className="font-bold text-amber-600 animate-pulse">Revisando prontuário...</span>
                            </div>
                          ) : (
                            <>
                              {consulta.iniciado_em && (
                                <div className="flex items-center justify-between text-[10px] mt-1">
                                  <span className="text-gray-400">Aguardou:</span>
                                  <span className="font-semibold text-amber-600">
                                    {formatDuration(
                                      new Date(consulta.iniciado_em).getTime() -
                                      new Date(consulta.criado_em).getTime()
                                    )}
                                  </span>
                                </div>
                              )}
                              {consulta.iniciado_em && (
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-gray-400">Em consulta:</span>
                                  <span className="font-bold text-blue-600 tabular-nums">
                                    {formatDuration(now - new Date(consulta.iniciado_em).getTime())}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Médicos online (disponíveis) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <Wifi className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="font-bold text-[#1A3A2C] text-sm">Online · Disponíveis</h2>
              <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                {medicosOnline.length}
              </span>
            </div>
            {medicosOnline.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum médico disponível no momento</p>
            ) : (
              <div className="space-y-2">
                {medicosOnline.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 bg-green-50 rounded-xl p-2.5 border border-green-100">
                    <div className="relative shrink-0">
                      {m.foto_url
                        ? <img src={m.foto_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-green-700" />
                          </div>
                      }
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1A3A2C] truncate">{m.nome}</p>
                      <p className="text-[10px] text-gray-400">{m.especialidade}</p>
                    </div>
                    <span className="text-[10px] text-green-600 font-semibold shrink-0">Livre</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Médicos offline */}
          {medicosOffline.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <WifiOff className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="font-bold text-gray-400 text-sm">Offline</h2>
                <span className="ml-auto text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                  {medicosOffline.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {medicosOffline.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400 truncate">{m.nome}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita: Fila Virtual */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 bg-[#1A3A2C] rounded-lg">
                <Activity className="w-4 h-4 text-[#5BBD9B]" />
              </div>
              <h2 className="font-bold text-[#1A3A2C] text-sm">Fila de Atendimento Virtual</h2>
              <span className="ml-auto text-xs bg-[#1A3A2C] text-[#5BBD9B] font-semibold px-2 py-0.5 rounded-full">
                {fila.length} {fila.length === 1 ? 'paciente' : 'pacientes'}
              </span>
            </div>

            {fila.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
                <Users className="w-12 h-12" />
                <p className="text-sm text-gray-400 font-medium">Fila vazia</p>
                <p className="text-xs text-gray-300">Nenhum paciente aguardando atendimento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fila.map((item) => {
                  const espera = now - new Date(item.criado_em).getTime()
                  const riscoAlto = item.classificacao_risco === 'vermelho' || item.classificacao_risco === 'laranja'
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition-all ${
                        riscoAlto
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Posição */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                          item.posicao === 1
                            ? 'bg-[#1A3A2C] text-[#5BBD9B]'
                            : 'bg-white text-gray-500 border border-gray-200'
                        }`}>
                          {item.posicao}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#1A3A2C] text-sm">{item.paciente_nome}</p>
                            <RiscoBadge risco={item.classificacao_risco} />
                            {item.medico_id && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full animate-pulse">
                                Médico revisando prontuário
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              {item.empresa_nome === 'Particular'
                                ? <><User className="w-3 h-3" /> Particular</>
                                : <><Building2 className="w-3 h-3" /> {item.empresa_nome}</>
                              }
                            </span>
                          </div>

                          {item.resumo_ia && (
                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 italic">
                              "{item.resumo_ia}"
                            </p>
                          )}
                        </div>

                        {/* Tempo de espera */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className={`w-3.5 h-3.5 ${espera > 15 * 60 * 1000 ? 'text-red-500' : espera > 5 * 60 * 1000 ? 'text-amber-500' : 'text-gray-400'}`} />
                            <span className={`font-bold tabular-nums text-sm ${
                              espera > 15 * 60 * 1000
                                ? 'text-red-500'
                                : espera > 5 * 60 * 1000
                                ? 'text-amber-500'
                                : 'text-gray-600'
                            }`}>
                              {formatDuration(espera)}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">aguardando</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Consultas em andamento — tabela completa */}
          {consultasAtivas.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-teal-100 rounded-lg">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                </div>
                <h2 className="font-bold text-[#1A3A2C] text-sm">Consultas em Andamento</h2>
                <span className="ml-auto text-xs bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">
                  {consultasAtivas.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">Médico</th>
                      <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">Paciente</th>
                      <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">Empresa</th>
                      <th className="text-center text-xs text-gray-400 font-medium pb-2 pr-4">Status</th>
                      <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-4">Aguardou</th>
                      <th className="text-right text-xs text-gray-400 font-medium pb-2">Consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultasAtivas.map(c => {
                      const tempoEspera = c.iniciado_em
                        ? new Date(c.iniciado_em).getTime() - new Date(c.criado_em).getTime()
                        : null
                      const tempoConsulta = c.iniciado_em
                        ? now - new Date(c.iniciado_em).getTime()
                        : null
                      return (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-[#1A3A2C] text-xs">{c.medico_nome}</p>
                            <p className="text-[10px] text-gray-400">{c.medico_especialidade}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-xs text-gray-700 font-medium">{c.paciente_nome}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-xs text-gray-500">{c.empresa_nome}</p>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            {c.assumido ? (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                                Revisando prontuário
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Na sala
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {tempoEspera !== null ? (
                              <span className="text-xs font-semibold text-amber-600">
                                {formatDuration(tempoEspera)}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="py-3 text-right">
                            {tempoConsulta !== null ? (
                              <span className="text-sm font-bold text-blue-600 tabular-nums">
                                {formatDuration(tempoConsulta)}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
