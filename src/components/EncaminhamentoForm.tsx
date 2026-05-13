'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserCheck, Calendar, Send, Search, Wifi, WifiOff, X } from 'lucide-react'

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

function drTitle(sexo: string) {
  return sexo === 'F' ? 'Dra.' : 'Dr.'
}

export default function EncaminhamentoForm({ pacienteId, salaVideo, onFechar, onEncaminhado }: Props) {
  const [medicos, setMedicos] = useState<MedicoDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [medicoSelecionado, setMedicoSelecionado] = useState<MedicoDisponivel | null>(null)
  const [modo, setModo] = useState<'imediato' | 'agendado'>('imediato')
  const [busca, setBusca] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/medico/medicos-para-encaminhar')
      .then(r => r.json())
      .then(d => {
        setMedicos(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function selecionarMedico(m: MedicoDisponivel) {
    setMedicoSelecionado(m)
    // auto-suggest mode based on online status
    setModo(m.online ? 'imediato' : 'agendado')
    setBusca('')
  }

  const medicosFiltrados = medicos.filter(m => {
    const q = busca.toLowerCase()
    return (
      m.nome.toLowerCase().includes(q) ||
      m.especialidade.toLowerCase().includes(q)
    )
  })

  async function enviar() {
    if (!medicoSelecionado) return
    if (modo === 'agendado' && !dataHora) {
      setErro('Selecione a data e hora para o agendamento')
      return
    }
    setEnviando(true)
    setErro('')

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
          data_hora: modo === 'agendado' ? dataHora : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao encaminhar')
        return
      }

      setSucesso(true)
      setTimeout(onEncaminhado, 1800)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="text-center py-6 px-2">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <UserCheck className="w-7 h-7 text-green-600" />
        </div>
        <p className="font-semibold text-[#1A3A2C] text-sm">Encaminhamento realizado!</p>
        <p className="text-xs text-gray-400 mt-1.5">
          {modo === 'imediato'
            ? `Paciente adicionado à fila do ${drTitle(medicoSelecionado!.sexo)} ${medicoSelecionado!.nome}`
            : `Consulta agendada com ${drTitle(medicoSelecionado!.sexo)} ${medicoSelecionado!.nome}`}
        </p>
      </div>
    )
  }

  // ── Header ─────────────────────────────────────────────────────────────────
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

      {/* ── Step 1: Doctor search ────────────────────────────────────────────── */}
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
                  {/* Avatar */}
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
                    <p className="text-sm font-medium text-[#1A3A2C] truncate">
                      {drTitle(m.sexo)} {m.nome}
                    </p>
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
        /* ── Step 2: Mode + details ───────────────────────────────────────── */
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
              onClick={() => setMedicoSelecionado(null)}
              className="text-xs text-[#5BBD9B] hover:text-[#1A3A2C] font-medium shrink-0 transition-colors"
            >
              Trocar
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setModo('imediato')}
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
              onClick={() => setModo('agendado')}
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

          {/* Offline warning when trying immediate */}
          {!medicoSelecionado.online && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2.5 rounded-xl">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              Médico offline — use agendamento para reservar horário na agenda dele.
            </div>
          )}

          {/* Date/time picker for scheduled mode */}
          {modo === 'agendado' && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">
                Data e hora da consulta
              </label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={e => setDataHora(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
              />
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
              placeholder="Ex: paciente com quadro depressivo, solicitar avaliação psiquiátrica..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none placeholder-gray-300"
            />
          </div>

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
              disabled={enviando || (modo === 'agendado' && !dataHora)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-1.5"
            >
              {enviando
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              {modo === 'imediato' ? 'Encaminhar agora' : 'Criar agendamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
