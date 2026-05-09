'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Clock, Phone, Video } from 'lucide-react'

export default function ConsultaPaciente() {
  const { id } = useParams()
  const router = useRouter()
  const [atendimento, setAtendimento] = useState<any>(null)
  const [pacienteNome, setPacienteNome] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [entrou, setEntrou] = useState(false)

  useEffect(() => {
    carregarDados()
    const interval = setInterval(carregarDados, 5000)
    return () => clearInterval(interval)
  }, [id])

  async function carregarDados() {
    const supabase = createClient()

    // Buscar paciente logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (!pacienteNome) {
      const { data: pac } = await supabase
        .from('pacientes')
        .select('nome')
        .eq('usuario_id', user.id)
        .single()
      if (pac?.nome) setPacienteNome(pac.nome)
    }

    const { data } = await supabase
      .from('atendimentos')
      .select('*, medicos(nome, especialidade)')
      .eq('id', id)
      .single()
    if (data) {
      setAtendimento(data)
      setCarregando(false)
    }
  }

  async function encerrarConsulta() {
    const supabase = createClient()
    await supabase
      .from('atendimentos')
      .update({ status: 'concluido', finalizado_em: new Date().toISOString() })
      .eq('id', id)
    router.push('/paciente/dashboard')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#1A3A2C] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
          <p>Carregando sala de consulta...</p>
        </div>
      </div>
    )
  }

  if (!atendimento?.sala_video) {
    return (
      <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Sala não encontrada.</p>
          <button onClick={() => router.push('/paciente/dashboard')} className="mt-4 text-[#5BBD9B]">
            Voltar ao painel
          </button>
        </div>
      </div>
    )
  }

  // Montar URL do vídeo com nome e sem pre-join do Daily
  const videoUrl = (() => {
    try {
      const url = new URL(atendimento.sala_video)
      if (pacienteNome) url.searchParams.set('name', pacienteNome)
      url.searchParams.set('prejoin', 'false')
      return url.toString()
    } catch {
      return atendimento.sala_video
    }
  })()

  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A3A2C] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
          <span className="text-green-300 text-xs">— Consulta Virtual</span>
        </div>

        <div className="flex items-center gap-4">
          {atendimento.status === 'aguardando' && (
            <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-full text-xs">
              <Clock className="w-3.5 h-3.5" />
              Aguardando médico...
            </div>
          )}
          {atendimento.status === 'em_andamento' && atendimento.medicos && (
            <div className="text-green-200 text-xs">
              Dr(a). {atendimento.medicos.nome} — {atendimento.medicos.especialidade}
            </div>
          )}
          <button
            onClick={encerrarConsulta}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
          >
            <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
            Encerrar
          </button>
        </div>
      </div>

      {/* Vídeo */}
      <div className="flex-1 relative">
        {/* Tela de espera enquanto status = aguardando */}
        {atendimento.status === 'aguardando' && (
          <div className="absolute inset-0 bg-[#0F1F33] flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center text-white">
              <div className="w-20 h-20 bg-[#1A3A2C] rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-green-300" />
              </div>
              <h2 className="text-xl font-bold mb-2">Aguardando médico</h2>
              <p className="text-green-300 text-sm">Um médico entrará na sala em instantes.</p>
              <p className="text-blue-400 text-xs mt-4">A câmera vai abrir assim que o médico entrar.</p>
            </div>
          </div>
        )}

        {/* Tela de pré-consulta personalizada em português */}
        {!entrou && atendimento.status !== 'aguardando' && (
          <div className="absolute inset-0 bg-[#0F1F33] flex items-center justify-center z-10">
            <div className="text-center text-white max-w-sm px-6">
              <div className="w-24 h-24 bg-[#1A3A2C] rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-[#5BBD9B]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Pronto(a) para começar a consulta?</h2>
              {atendimento.medicos && (
                <p className="text-green-300 text-sm mb-6">
                  Dr(a). {atendimento.medicos.nome} está na sala.
                </p>
              )}
              <p className="text-blue-300 text-xs mb-8">
                Verifique se sua câmera e microfone estão funcionando antes de entrar.
              </p>
              <button
                onClick={() => setEntrou(true)}
                className="w-full bg-[#5BBD9B] hover:bg-green-400 text-white font-bold py-3.5 px-8 rounded-2xl text-base transition-colors"
              >
                Entrar na Consulta
              </button>
            </div>
          </div>
        )}

        <iframe
          src={videoUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 56px)' }}
        />
      </div>
    </div>
  )
}
