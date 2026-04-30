'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Loader2, Phone, FileText, CheckCircle2 } from 'lucide-react'

export default function AtendimentoMedico() {
  const { id } = useParams()
  const router = useRouter()
  const [atendimento, setAtendimento] = useState<any>(null)
  const [medico, setMedico] = useState<any>(null)
  const [notas, setNotas] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [iniciado, setIniciado] = useState(false)

  useEffect(() => {
    iniciarAtendimento()
  }, [id])

  async function iniciarAtendimento() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Buscar médico
    const { data: med } = await supabase
      .from('medicos').select('id').eq('usuario_id', user.id).single()
    if (!med) { router.push('/login'); return }
    setMedico(med)

    // Buscar atendimento
    const { data: at } = await supabase
      .from('atendimentos')
      .select('*, pacientes(nome, cpf, data_nascimento), triagens(classificacao_risco, resumo_ia)')
      .eq('id', id)
      .single()

    if (!at) { router.push('/medico/dashboard'); return }
    setAtendimento(at)
    setNotas(at.notas_medico || '')

    // Marcar como em andamento se ainda aguardando
    if (at.status === 'aguardando') {
      await supabase
        .from('atendimentos')
        .update({
          status: 'em_andamento',
          medico_id: med.id,
          iniciado_em: new Date().toISOString(),
        })
        .eq('id', id)
      setIniciado(true)
    }

    setCarregando(false)
  }

  async function finalizarConsulta() {
    setSalvando(true)
    const supabase = createClient()
    await supabase
      .from('atendimentos')
      .update({
        status: 'concluido',
        notas_medico: notas,
        finalizado_em: new Date().toISOString(),
      })
      .eq('id', id)
    setSalvando(false)
    router.push('/medico/dashboard')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#1A3A5C] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
          <p>Entrando na sala...</p>
        </div>
      </div>
    )
  }

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-yellow-100 text-yellow-700',
    laranja: 'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A3A5C] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-[#2E75B6]" fill="currentColor" />
          <span className="text-white font-bold text-sm">MedDigital</span>
          <span className="text-blue-300 text-xs">— Atendimento Virtual</span>
        </div>
        {atendimento?.pacientes && (
          <div className="text-blue-200 text-xs">
            Paciente: <strong className="text-white">{atendimento.pacientes.nome}</strong>
            {atendimento.triagens?.classificacao_risco && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${corRisco[atendimento.triagens.classificacao_risco] || ''}`}>
                {atendimento.triagens.classificacao_risco}
              </span>
            )}
          </div>
        )}
        <button
          onClick={finalizarConsulta}
          disabled={salvando}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5 rotate-[135deg]" />}
          Finalizar consulta
        </button>
      </div>

      {/* Layout: vídeo + painel lateral */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Vídeo */}
        <div className="flex-1">
          <iframe
            src={atendimento.sala_video}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
          />
        </div>

        {/* Painel lateral */}
        <div className="w-80 bg-[#1A3A5C] flex flex-col shrink-0 overflow-y-auto">
          {/* Info do paciente */}
          {atendimento.triagens?.resumo_ia && (
            <div className="p-4 border-b border-blue-900">
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wide mb-2">Resumo da triagem</p>
              <p className="text-blue-100 text-sm leading-relaxed">{atendimento.triagens.resumo_ia}</p>
            </div>
          )}

          {/* Notas médicas */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-300" />
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Notas do atendimento</p>
            </div>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Anamnese, diagnóstico, prescrições, orientações..."
              className="flex-1 bg-[#0F1F33] text-blue-100 text-sm rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#2E75B6] placeholder-blue-700 min-h-[200px]"
            />
            <button
              onClick={finalizarConsulta}
              disabled={salvando}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Salvar e encerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
