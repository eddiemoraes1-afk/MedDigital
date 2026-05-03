'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, ArrowLeft, Clock, Save, Loader2, CheckCircle2, Trash2, Pencil, X } from 'lucide-react'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

interface Horario {
  id?: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  duracao_minutos: number
  ativo: boolean
}

async function registrarLog(supabase: any, userId: string, tipo: string, entidadeId: string, descricao: string, dadosAnteriores?: any, dadosNovos?: any) {
  await supabase.from('logs_sistema').insert({
    tipo,
    usuario_id: userId,
    entidade_tipo: 'horario_medico',
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores || null,
    dados_novos: dadosNovos || null,
    descricao,
  })
}

export default function DisponibilidadePage() {
  const [medicoId, setMedicoId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Horario>>({})
  const [novoHorario, setNovoHorario] = useState<Horario>({
    dia_semana: 1,
    hora_inicio: '08:00',
    hora_fim: '18:00',
    duracao_minutos: 30,
    ativo: true,
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      let { data: medico } = await supabase
        .from('medicos')
        .select('id')
        .eq('usuario_id', user.id)
        .single()

      // Admin pode gerenciar disponibilidade do primeiro médico cadastrado
      if (!medico) {
        const res = await fetch('/api/auth/perfil-sistema')
        const perfil = await res.json()
        if (perfil?.role === 'admin' && perfil?.medicoId) {
          medico = { id: perfil.medicoId }
        }
      }

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
    if (!medicoId || !userId) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('horarios_medico')
      .insert({ ...novoHorario, medico_id: medicoId })
      .select()
      .single()

    if (!error && data) {
      setHorarios(prev => [...prev, data])
      await registrarLog(supabase, userId, 'horario_adicionado', data.id,
        `Adicionado: ${DIAS[data.dia_semana]} ${data.hora_inicio.slice(0,5)}–${data.hora_fim.slice(0,5)} (${data.duracao_minutos}min)`,
        null, data
      )
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    }
    setSalvando(false)
  }

  async function removerHorario(id: string) {
    if (!userId) return
    const horario = horarios.find(h => h.id === id)
    if (!window.confirm(`Remover horário de ${DIAS[horario?.dia_semana || 0]}?`)) return
    await supabase.from('horarios_medico').delete().eq('id', id)
    if (horario) {
      await registrarLog(supabase, userId, 'horario_removido', id,
        `Removido: ${DIAS[horario.dia_semana]} ${horario.hora_inicio.slice(0,5)}–${horario.hora_fim.slice(0,5)}`,
        horario, null
      )
    }
    setHorarios(prev => prev.filter(h => h.id !== id))
  }

  async function toggleHorario(id: string, ativo: boolean) {
    if (!userId) return
    const horario = horarios.find(h => h.id === id)
    await supabase.from('horarios_medico').update({ ativo }).eq('id', id)
    await registrarLog(supabase, userId, ativo ? 'horario_ativado' : 'horario_inativado', id,
      `${ativo ? 'Ativado' : 'Inativado'}: ${DIAS[horario?.dia_semana || 0]} ${horario?.hora_inicio.slice(0,5)}–${horario?.hora_fim.slice(0,5)}`,
      { ativo: !ativo }, { ativo }
    )
    setHorarios(prev => prev.map(h => h.id === id ? { ...h, ativo } : h))
  }

  function iniciarEdicao(horario: Horario) {
    setEditandoId(horario.id!)
    setEditValues({
      hora_inicio: horario.hora_inicio.slice(0, 5),
      hora_fim: horario.hora_fim.slice(0, 5),
      duracao_minutos: horario.duracao_minutos,
    })
  }

  async function salvarEdicao(id: string) {
    if (!userId) return
    const horarioAtual = horarios.find(h => h.id === id)
    const novosValores = {
      hora_inicio: editValues.hora_inicio ?? horarioAtual?.hora_inicio ?? '08:00',
      hora_fim: editValues.hora_fim ?? horarioAtual?.hora_fim ?? '18:00',
      duracao_minutos: editValues.duracao_minutos ?? horarioAtual?.duracao_minutos ?? 30,
    }
    const { error } = await supabase.from('horarios_medico').update(novosValores).eq('id', id)
    if (!error) {
      await registrarLog(supabase, userId, 'horario_editado', id,
        `Editado: ${DIAS[horarioAtual?.dia_semana || 0]} → ${novosValores.hora_inicio}–${novosValores.hora_fim} (${novosValores.duracao_minutos}min)`,
        { hora_inicio: horarioAtual?.hora_inicio, hora_fim: horarioAtual?.hora_fim, duracao_minutos: horarioAtual?.duracao_minutos },
        novosValores
      )
      setHorarios(prev => prev.map(h => h.id === id ? { ...h, ...novosValores } : h))
      setEditandoId(null)
    }
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
    </div>
  )

  const horariosPorDia = DIAS.map((_, i) => horarios.filter(h => h.dia_semana === i))

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <header className="bg-[#1A3A2C] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#5BBD9B]" fill="currentColor" />
            <span className="font-bold">RovarisMed</span>
          </div>
          <Link href="/medico/dashboard" className="text-sm text-green-200 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A2C] flex items-center gap-2">
            <Clock className="w-6 h-6" /> Minha Disponibilidade
          </h1>
          <p className="text-gray-500 mt-1">Defina os dias e horários em que atende. Todas as alterações são registradas no log.</p>
        </div>

        {/* Adicionar novo horário */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-[#1A3A2C] mb-4">Adicionar disponibilidade</h2>
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
                <option value={15}>15 min</option>
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
            className="flex items-center gap-2 bg-[#1A3A2C] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#5BBD9B] disabled:opacity-50"
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
                <h3 className="font-semibold text-[#1A3A2C] mb-3">{dia}</h3>
                <div className="space-y-2">
                  {horariosDodia.map(h => (
                    <div key={h.id} className={`rounded-xl border transition-all ${h.ativo ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50 opacity-60'} ${editandoId === h.id ? 'border-[#5BBD9B] bg-white opacity-100' : ''}`}>
                      {editandoId === h.id ? (
                        /* Modo edição inline */
                        <div className="p-4">
                          <p className="text-xs font-semibold text-[#1A3A2C] mb-3">Editando horário de {dia}</p>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Início</label>
                              <select
                                value={editValues.hora_inicio}
                                onChange={e => setEditValues(p => ({ ...p, hora_inicio: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                              >
                                {HORAS.map(hr => <option key={hr}>{hr}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Fim</label>
                              <select
                                value={editValues.hora_fim}
                                onChange={e => setEditValues(p => ({ ...p, hora_fim: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                              >
                                {HORAS.map(hr => <option key={hr}>{hr}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Duração</label>
                              <select
                                value={editValues.duracao_minutos}
                                onChange={e => setEditValues(p => ({ ...p, duracao_minutos: Number(e.target.value) }))}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                              >
                                <option value={15}>15 min</option>
                                <option value={20}>20 min</option>
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>60 min</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => salvarEdicao(h.id!)}
                              className="flex items-center gap-1.5 bg-[#1A3A2C] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#5BBD9B]"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Salvar
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="flex items-center gap-1.5 text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
                            >
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Modo visualização */
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-[#5BBD9B]" />
                            <span className="text-sm font-medium text-gray-700">
                              {h.hora_inicio.slice(0, 5)} — {h.hora_fim.slice(0, 5)}
                            </span>
                            <span className="text-xs text-gray-400">({h.duracao_minutos} min/consulta)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleHorario(h.id!, !h.ativo)}
                              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${h.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                            >
                              {h.ativo ? 'Ativo' : 'Inativo'}
                            </button>
                            <button
                              onClick={() => iniciarEdicao(h)}
                              className="p-1.5 text-blue-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Editar horário"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removerHorario(h.id!)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Remover horário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
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
