'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, ArrowLeft, Clock, Save, Loader2, CheckCircle2, Trash2 } from 'lucide-react'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const HORAS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

interface Horario {
  id?: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  duracao_minutos: number
  ativo: boolean
}

export default function DisponibilidadePage() {
  const [medicoId, setMedicoId] = useState<string | null>(null)
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [novoHorario, setNovoHorario] = useState<Horario>({
    dia_semana: 1,
    hora_inicio: '08:00',
    hora_fim: '18:00',
    duracao_minutos: 30,
    ativo: true
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: medico } = await supabase
        .from('medicos')
        .select('id')
        .eq('usuario_id', user.id)
        .single()

      if (!medico) { router.push('/medico/dashboard'); return }
      setMedicoId(medico.id)

      const { data } = await supabase
        .from('horarios_medico')
        .select('*')
        .eq('medico_id', medico.id)
        .order('dia_semana')

      setHorarios(data || [])
      setCarregando(false)
    }
    carregar()
  }, [])

  async function adicionarHorario() {
    if (!medicoId) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('horarios_medico')
      .insert({ ...novoHorario, medico_id: medicoId })
      .select()
      .single()

    if (!error && data) {
      setHorarios(prev => [...prev, data])
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    }
    setSalvando(false)
  }

  async function removerHorario(id: string) {
    await supabase.from('horarios_medico').delete().eq('id', id)
    setHorarios(prev => prev.filter(h => h.id !== id))
  }

  async function toggleHorario(id: string, ativo: boolean) {
    await supabase.from('horarios_medico').update({ ativo }).eq('id', id)
    setHorarios(prev => prev.map(h => h.id === id ? { ...h, ativo } : h))
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#2E75B6]" />
    </div>
  )

  const horariosPorDia = DIAS.map((_, i) => horarios.filter(h => h.dia_semana === i))

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold">MedDigital</span>
          </div>
          <Link href="/medico/dashboard" className="text-sm text-blue-200 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A5C] flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Minha Disponibilidade
          </h1>
          <p className="text-gray-500 mt-1">Defina os dias e horários em que atende</p>
        </div>

        {/* Adicionar novo horário */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-[#1A3A5C] mb-4">Adicionar disponibilidade</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dia da semana</label>
              <select
                value={novoHorario.dia_semana}
                onChange={e => setNovoHorario(p => ({ ...p, dia_semana: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Início</label>
              <select
                value={novoHorario.hora_inicio}
                onChange={e => setNovoHorario(p => ({ ...p, hora_inicio: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {HORAS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fim</label>
              <select
                value={novoHorario.hora_fim}
                onChange={e => setNovoHorario(p => ({ ...p, hora_fim: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {HORAS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Duração da consulta</label>
              <select
                value={novoHorario.duracao_minutos}
                onChange={e => setNovoHorario(p => ({ ...p, duracao_minutos: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>
          <button
            onClick={adicionarHorario}
            disabled={salvando}
            className="flex items-center gap-2 bg-[#1A3A5C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2E75B6] disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {sucesso ? '✅ Salvo!' : 'Adicionar horário'}
          </button>
        </div>

        {/* Horários por dia */}
        <div className="space-y-4">
          {DIAS.map((dia, idx) => {
            const horariosDodia = horariosPorDia[idx]
            if (horariosDodia.length === 0) return null
            return (
              <div key={dia} className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A5C] mb-3">{dia}</h3>
                <div className="space-y-2">
                  {horariosDodia.map(h => (
                    <div key={h.id} className={`flex items-center justify-between p-3 rounded-xl border ${h.ativo ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-[#2E75B6]" />
                        <span className="text-sm font-medium text-gray-700">
                          {h.hora_inicio.slice(0, 5)} — {h.hora_fim.slice(0, 5)}
                        </span>
                        <span className="text-xs text-gray-400">({h.duracao_minutos} min/consulta)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleHorario(h.id!, !h.ativo)}
                          className={`text-xs px-3 py-1 rounded-full font-medium ${h.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                        >
                          {h.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                        <button
                          onClick={() => removerHorario(h.id!)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {horarios.length === 0 && (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum horário cadastrado ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Adicione seus horários de atendimento acima.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
