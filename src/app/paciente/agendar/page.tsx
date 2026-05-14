'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, User, ChevronRight, Loader2, CheckCircle2, User2, Search, X, ArrowLeft } from 'lucide-react'
import PacienteHeader from '../PacienteHeader'

interface Medico {
  id: string
  nome: string
  especialidade: string
  crm: string
  crm_uf: string
  foto_url: string | null
  sexo?: string | null
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function drTitle(sexo?: string | null) {
  return sexo === 'feminino' ? 'Dra.' : 'Dr.'
}

function gerarDias(diasComDisponibilidade: number[]) {
  const dias = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (let i = 1; i <= 30; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    if (diasComDisponibilidade.includes(d.getDay())) {
      dias.push(d)
    }
  }
  return dias
}

function AgendarConteudo() {
  const searchParams = useSearchParams()
  const reagendarId = searchParams.get('reagendar')
  const medicoIdParam = searchParams.get('medico_id')

  const [passo, setPasso] = useState(1)
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null)
  const [diasDisponiveis, setDiasDisponiveis] = useState<number[]>([])
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotSelecionado, setSlotSelecionado] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoSlots, setCarregandoSlots] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [erroConfirmacao, setErroConfirmacao] = useState('')

  // Filtros de busca
  const [busca, setBusca] = useState('')
  const [especialidadeFiltro, setEspecialidadeFiltro] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function carregarMedicos() {
      const { data } = await supabase
        .from('medicos')
        .select('id, nome, especialidade, crm, crm_uf, foto_url, sexo')
        .eq('status', 'aprovado')
        .order('nome')
      setMedicos(data || [])

      if (medicoIdParam && data) {
        const medico = data.find((m: Medico) => m.id === medicoIdParam)
        if (medico) {
          const { data: horarios } = await supabase
            .from('horarios_medico')
            .select('dia_semana')
            .eq('medico_id', medico.id)
            .eq('ativo', true)
          const dias = [...new Set((horarios || []).map((h: any) => h.dia_semana))]
          setMedicoSelecionado(medico)
          setDiasDisponiveis(dias)
          setPasso(2)
        }
      }
    }
    carregarMedicos()
  }, [])

  // Especialidades únicas para o filtro
  const especialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))].sort()

  // Médicos filtrados
  const medicosFiltrados = medicos.filter(m => {
    const matchBusca = busca.trim() === '' ||
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.especialidade?.toLowerCase().includes(busca.toLowerCase())
    const matchEsp = especialidadeFiltro === '' || m.especialidade === especialidadeFiltro
    return matchBusca && matchEsp
  })

  async function selecionarMedico(medico: Medico) {
    setMedicoSelecionado(medico)
    setCarregando(true)
    const { data } = await supabase
      .from('horarios_medico')
      .select('dia_semana')
      .eq('medico_id', medico.id)
      .eq('ativo', true)
    const dias = [...new Set((data || []).map((h: any) => h.dia_semana))]
    setDiasDisponiveis(dias)
    setCarregando(false)
    setPasso(2)
  }

  async function selecionarData(data: Date) {
    setDataSelecionada(data)
    setSlotSelecionado(null)
    setCarregandoSlots(true)
    const dataStr = data.toISOString().split('T')[0]
    const res = await fetch(`/api/agendamento/slots?medico_id=${medicoSelecionado!.id}&data=${dataStr}`)
    const json = await res.json()
    setSlots(json.slots || [])
    setCarregandoSlots(false)
    setPasso(3)
  }

  async function confirmarAgendamento() {
    if (!medicoSelecionado || !dataSelecionada || !slotSelecionado) return
    setCarregando(true)
    setErroConfirmacao('')

    try {
      const dataStr = dataSelecionada.toLocaleDateString('en-CA')
      const dataHoraBrasilia = `${dataStr}T${slotSelecionado}:00-03:00`

      const res = await fetch('/api/agendamento/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medico_id: medicoSelecionado.id,
          data_hora: dataHoraBrasilia,
          observacoes,
          reagendado_de: reagendarId || null,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setErroConfirmacao(data.erro || data.error || `Erro ${res.status}: não foi possível agendar`)
        setCarregando(false)
        return
      }

      if (reagendarId) {
        await fetch('/api/agendamento/cancelar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agendamento_id: reagendarId, status: 'reagendado' })
        })
      }

      setConfirmado(true)
    } catch {
      setErroConfirmacao('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const diasParaExibir = medicoSelecionado ? gerarDias(diasDisponiveis) : []

  if (confirmado) {
    return (
      <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-10 shadow-sm text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1A3A2C] mb-2">Consulta agendada!</h2>
          <p className="text-gray-500 mb-2">
            {drTitle(medicoSelecionado?.sexo)} {medicoSelecionado?.nome}
          </p>
          <p className="text-[#5BBD9B] font-semibold mb-6">
            {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {slotSelecionado}
          </p>
          <p className="text-sm text-gray-400 mb-6">Você receberá uma confirmação por email e WhatsApp.</p>
          <Link href="/paciente/agendamentos"
            className="block w-full bg-[#1A3A2C] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#5BBD9B] text-center">
            Ver meus agendamentos
          </Link>
          <Link href="/paciente/dashboard"
            className="block w-full mt-3 text-sm text-gray-400 hover:text-gray-600 text-center">
            Voltar ao painel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cor-empresa-bg)' }}>
      <PacienteHeader titulo="Agendar Consulta" />

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* Voltar + título */}
        <div className="mb-8">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1A3A2C] mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-2xl font-bold text-[#1A3A2C]">
            {reagendarId ? 'Reagendar consulta' : 'Agendar consulta'}
          </h1>
          <p className="text-gray-500 mt-1">
            {reagendarId
              ? 'Escolha uma nova data e horário — o agendamento anterior será cancelado automaticamente'
              : 'Escolha o médico, data e horário'}
          </p>
        </div>

        {/* Indicador de passos */}
        <div className="flex items-center gap-2 mb-8">
          {['Médico', 'Data', 'Horário', 'Confirmar'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                passo > i + 1 ? 'bg-green-500 text-white' :
                passo === i + 1 ? 'bg-[#1A3A2C] text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {passo > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${passo === i + 1 ? 'text-[#1A3A2C]' : 'text-gray-400'}`}>{label}</span>
              {i < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Passo 1: Escolher médico */}
        {passo >= 1 && (
          <div className={`bg-white rounded-2xl p-6 shadow-sm mb-4 ${passo !== 1 && 'opacity-60'}`}>
            <h2 className="font-bold text-[#1A3A2C] mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Escolha o médico
            </h2>
            {passo === 1 ? (
              <>
                {/* ── Filtros ── */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                  {/* Busca por nome */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      placeholder="Buscar por nome ou especialidade..."
                      className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
                    />
                    {busca && (
                      <button onClick={() => setBusca('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Filtro por especialidade */}
                  <select
                    value={especialidadeFiltro}
                    onChange={e => setEspecialidadeFiltro(e.target.value)}
                    className="py-2.5 px-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white min-w-[180px]"
                  >
                    <option value="">Todas as especialidades</option>
                    {especialidades.map(esp => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>

                {/* Lista de médicos */}
                <div className="space-y-3">
                  {medicosFiltrados.length === 0 ? (
                    <div className="text-center py-8">
                      <User2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Nenhum médico encontrado para esses filtros.</p>
                      {(busca || especialidadeFiltro) && (
                        <button onClick={() => { setBusca(''); setEspecialidadeFiltro('') }}
                          className="text-sm text-[#5BBD9B] hover:underline mt-2">
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  ) : medicosFiltrados.map(m => (
                    <button
                      key={m.id}
                      onClick={() => selecionarMedico(m)}
                      disabled={carregando}
                      className="w-full flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-[#5BBD9B] hover:bg-green-50 text-left transition-all"
                    >
                      <div className="relative w-11 h-11 rounded-full overflow-hidden bg-green-100 shrink-0 flex items-center justify-center">
                        {m.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover" />
                        ) : (
                          <User2 className="w-6 h-6 text-[#5BBD9B]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1A3A2C]">{drTitle(m.sexo)} {m.nome}</p>
                        <p className="text-sm text-gray-400">{m.especialidade} • CRM {m.crm}/{m.crm_uf}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden bg-green-100 shrink-0 flex items-center justify-center">
                    {medicoSelecionado?.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={medicoSelecionado.foto_url} alt={medicoSelecionado.nome} className="w-full h-full object-cover" />
                    ) : (
                      <User2 className="w-5 h-5 text-[#5BBD9B]" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A3A2C]">{drTitle(medicoSelecionado?.sexo)} {medicoSelecionado?.nome}</p>
                    <p className="text-sm text-gray-400">{medicoSelecionado?.especialidade}</p>
                  </div>
                </div>
                <button onClick={() => { setPasso(1); setDataSelecionada(null); setSlotSelecionado(null) }}
                  className="text-xs text-[#5BBD9B] hover:underline shrink-0">Alterar</button>
              </div>
            )}
          </div>
        )}

        {/* Passo 2: Escolher data */}
        {passo >= 2 && (
          <div className={`bg-white rounded-2xl p-6 shadow-sm mb-4 ${passo !== 2 && 'opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Escolha a data
              </h2>
              {passo === 2 && (
                <button onClick={() => setPasso(1)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1A3A2C] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
              )}
            </div>
            {passo === 2 ? (
              diasParaExibir.length === 0 ? (
                <p className="text-gray-400 text-sm">Este médico ainda não configurou a disponibilidade.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {diasParaExibir.map(d => (
                    <button
                      key={d.toISOString()}
                      onClick={() => selecionarData(d)}
                      className="p-3 border border-gray-100 rounded-xl hover:border-[#5BBD9B] hover:bg-green-50 text-center transition-all"
                    >
                      <p className="text-xs text-gray-400">{DIAS_SEMANA[d.getDay()]}</p>
                      <p className="text-lg font-bold text-[#1A3A2C]">{d.getDate()}</p>
                      <p className="text-xs text-gray-400">{MESES[d.getMonth()].slice(0, 3)}</p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#1A3A2C]">
                  {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
                <button onClick={() => { setPasso(2); setSlotSelecionado(null) }}
                  className="text-xs text-[#5BBD9B] hover:underline">Alterar</button>
              </div>
            )}
          </div>
        )}

        {/* Passo 3: Escolher horário */}
        {passo >= 3 && (
          <div className={`bg-white rounded-2xl p-6 shadow-sm mb-4 ${passo !== 3 && 'opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
                <Clock className="w-4 h-4" /> Escolha o horário
              </h2>
              {passo === 3 && (
                <button onClick={() => setPasso(2)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1A3A2C] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
              )}
            </div>
            {passo === 3 ? (
              carregandoSlots ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-[#5BBD9B]" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum horário disponível neste dia.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => { setSlotSelecionado(slot); setPasso(4) }}
                      className="py-2.5 border border-gray-100 rounded-xl hover:border-[#5BBD9B] hover:bg-green-50 text-sm font-medium text-[#1A3A2C] transition-all"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#1A3A2C]">{slotSelecionado}</p>
                <button onClick={() => { setPasso(3); setSlotSelecionado(null) }}
                  className="text-xs text-[#5BBD9B] hover:underline">Alterar</button>
              </div>
            )}
          </div>
        )}

        {/* Passo 4: Confirmar */}
        {passo >= 4 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1A3A2C]">Confirmar agendamento</h2>
              <button onClick={() => setPasso(3)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1A3A2C] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600"><span className="font-medium">Médico:</span> {drTitle(medicoSelecionado?.sexo)} {medicoSelecionado?.nome}</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Data:</span> {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Horário:</span> {slotSelecionado}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Descreva brevemente o motivo da consulta..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
                rows={3}
              />
            </div>
            {erroConfirmacao && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {erroConfirmacao}
              </div>
            )}
            <button
              onClick={confirmarAgendamento}
              disabled={carregando}
              className="w-full bg-[#1A3A2C] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#5BBD9B] disabled:opacity-50"
            >
              {carregando ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</> : 'Confirmar agendamento'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AgendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cor-empresa-bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
      </div>
    }>
      <AgendarConteudo />
    </Suspense>
  )
}
