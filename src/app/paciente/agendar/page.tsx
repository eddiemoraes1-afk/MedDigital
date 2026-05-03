'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, ArrowLeft, Calendar, Clock, User, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'

interface Medico {
  id: string
  nome: string
  especialidade: string
  crm: string
  crm_uf: string
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

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
  const reagendarId = searchParams.get('reagendar')   // id do agendamento a cancelar
  const medicoIdParam = searchParams.get('medico_id') // pré-selecionar médico

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
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function carregarMedicos() {
      const { data } = await supabase
        .from('medicos')
        .select('id, nome, especialidade, crm, crm_uf')
        .eq('status', 'aprovado')
        .order('nome')
      setMedicos(data || [])

      // Se vier parâmetro de reagendamento, pré-selecionar médico e pular para passo 2
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
      // Construir datetime com offset de Brasília para evitar conversão UTC errada
      const dataStr = dataSelecionada.toLocaleDateString('en-CA') // YYYY-MM-DD
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

      // Se for reagendamento, marca o antigo como 'reagendado'
      if (reagendarId) {
        await fetch('/api/agendamento/cancelar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agendamento_id: reagendarId, status: 'reagendado' })
        })
      }

      setConfirmado(true)
    } catch (err: any) {
      setErroConfirmacao('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const diasParaExibir = medicoSelecionado ? gerarDias(diasDisponiveis) : []

  if (confirmado) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-10 shadow-sm text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1A3A5C] mb-2">Consulta agendada!</h2>
          <p className="text-gray-500 mb-2">
            Dr(a). {medicoSelecionado?.nome}
          </p>
          <p className="text-[#2E75B6] font-semibold mb-6">
            {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {slotSelecionado}
          </p>
          <p className="text-sm text-gray-400 mb-6">Você receberá uma confirmação por email e WhatsApp.</p>
          <Link href="/paciente/agendamentos"
            className="block w-full bg-[#1A3A5C] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#2E75B6] text-center">
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
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold">MedDigital</span>
          </div>
          <Link href="/paciente/dashboard" className="text-sm text-blue-200 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A5C]">
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
                passo === i + 1 ? 'bg-[#1A3A5C] text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {passo > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${passo === i + 1 ? 'text-[#1A3A5C]' : 'text-gray-400'}`}>{label}</span>
              {i < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Passo 1: Escolher médico */}
        {passo >= 1 && (
          <div className={`bg-white rounded-2xl p-6 shadow-sm mb-4 ${passo !== 1 && 'opacity-60'}`}>
            <h2 className="font-bold text-[#1A3A5C] mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Escolha o médico
            </h2>
            {passo === 1 ? (
              <div className="space-y-3">
                {medicos.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhum médico disponível no momento.</p>
                ) : medicos.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selecionarMedico(m)}
                    disabled={carregando}
                    className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-[#2E75B6] hover:bg-blue-50 text-left transition-all"
                  >
                    <div>
                      <p className="font-semibold text-[#1A3A5C]">Dr(a). {m.nome}</p>
                      <p className="text-sm text-gray-400">{m.especialidade} • CRM {m.crm}/{m.crm_uf}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A3A5C]">Dr(a). {medicoSelecionado?.nome}</p>
                  <p className="text-sm text-gray-400">{medicoSelecionado?.especialidade}</p>
                </div>
                <button onClick={() => { setPasso(1); setDataSelecionada(null); setSlotSelecionado(null) }}
                  className="text-xs text-[#2E75B6] hover:underline">Alterar</button>
              </div>
            )}
          </div>
        )}

        {/* Passo 2: Escolher data */}
        {passo >= 2 && (
          <div className={`bg-white rounded-2xl p-6 shadow-sm mb-4 ${passo !== 2 && 'opacity-60'}`}>
            <h2 className="font-bold text-[#1A3A5C] mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Escolha a data
            </h2>
            {passo === 2 ? (
              diasParaExibir.length === 0 ? (
                <p className="text-gray-400 text-sm">Este médico ainda não configurou a disponibilidade.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {diasParaExibir.map(d => (
                    <button
                      key={d.toISOString()}
                      onClick={() => selecionarData(d)}
                      className="p-3 border border-gray-100 rounded-xl hover:border-[#2E75B6] hover:bg-blue-50 text-center transition-all"
                    >
                      <p className="text-xs text-gray-400">{DIAS_SEMANA[d.getDay()]}</p>
                      <p className="text-lg font-bold text-[#1A3A5C]">{d.getDate()}</p>
                      <p className="text-xs text-gray-400">{MESES[d.getMonth()].slice(0, 3)}</p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#1A3A5C]">
                  {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
                <button onClick={() => { setPasso(2); setSlotSelecionado(null) }}
                  className="text-xs text-[#2E75B6] hover:underline">Alterar</button>
              </div>
            )}
          </div>
        )}

        {/* Passo 3: Escolher horário */}
        {passo >= 3 && (
          <div className={`bg-white rounded-2xl p-6 shadow-sm mb-4 ${passo !== 3 && 'opacity-60'}`}>
            <h2 className="font-bold text-[#1A3A5C] mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Escolha o horário
            </h2>
            {passo === 3 ? (
              carregandoSlots ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2E75B6]" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum horário disponível neste dia.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => { setSlotSelecionado(slot); setPasso(4) }}
                      className="py-2.5 border border-gray-100 rounded-xl hover:border-[#2E75B6] hover:bg-blue-50 text-sm font-medium text-[#1A3A5C] transition-all"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#1A3A5C]">{slotSelecionado}</p>
                <button onClick={() => { setPasso(3); setSlotSelecionado(null) }}
                  className="text-xs text-[#2E75B6] hover:underline">Alterar</button>
              </div>
            )}
          </div>
        )}

        {/* Passo 4: Confirmar */}
        {passo >= 4 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A5C] mb-4">Confirmar agendamento</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600"><span className="font-medium">Médico:</span> Dr(a). {medicoSelecionado?.nome}</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Data:</span> {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Horário:</span> {slotSelecionado}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Descreva brevemente o motivo da consulta..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
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
              className="w-full bg-[#1A3A5C] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#2E75B6] disabled:opacity-50"
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
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E75B6]" />
      </div>
    }>
      <AgendarConteudo />
    </Suspense>
  )
}
