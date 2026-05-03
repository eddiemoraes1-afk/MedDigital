'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Loader2, Clock, Phone } from 'lucide-react'

export default function ConsultaPaciente() {
  const { id } = useParams()
  const router = useRouter()
  const [atendimento, setAtendimento] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarAtendimento()
    // Verificar status a cada 5 segundos
    const interval = setInterval(carregarAtendimento, 5000)
    return () => clearInterval(interval)
  }, [id])

  async function carregarAtendimento() {
    const supabase = createClient()
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

  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A3A2C] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-[#5BBD9B]" fill="currentColor" />
          <span className="text-white font-bold text-sm">RovarisMed</span>
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
        <iframe
          src={atendimento.sala_video}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 56px)' }}
        />
      </div>
    </div>
  )
}
