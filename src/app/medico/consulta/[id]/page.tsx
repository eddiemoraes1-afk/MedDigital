'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, User, Calendar, Clock } from 'lucide-react'

export default function ConsultaMedico() {
  const { id } = useParams()
  const router = useRouter()
  const [atendimento, setAtendimento] = useState<any>(null)
  const [paciente, setPaciente] = useState<any>(null)
  const [agendamento, setAgendamento] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [id])

  async function carregarDados() {
    const supabase = createClient()
    const { data } = await supabase
      .from('atendimentos')
      .select('*, medicos(nome, especialidade)')
      .eq('id', id)
      .single()

    if (data) {
      setAtendimento(data)

      // Buscar dados do paciente
      const { data: pac } = await supabase
        .from('pacientes')
        .select('nome, telefone, data_nascimento')
        .eq('id', data.paciente_id)
        .single()
      setPaciente(pac)

      // Buscar agendamento se houver
      if (data.agendamento_id) {
        const { data: ag } = await supabase
          .from('agendamentos')
          .select('data_hora, observacoes')
          .eq('id', data.agendamento_id)
          .single()
        setAgendamento(ag)
      }

      setCarregando(false)
    }
  }

  async function concluirConsulta() {
    const supabase = createClient()
    await supabase
      .from('atendimentos')
      .update({ status: 'concluido', finalizado_em: new Date().toISOString() })
      .eq('id', id)

    // Marcar agendamento como concluído
    if (atendimento?.agendamento_id) {
      await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('id', atendimento.agendamento_id)
    }

    router.push('/medico/agendamentos')
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
          <button onClick={() => router.push('/medico/agendamentos')} className="mt-4 text-[#5BBD9B]">
            Voltar à agenda
          </button>
        </div>
      </div>
    )
  }

  const dataHora = agendamento?.data_hora ? new Date(agendamento.data_hora) : null

  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A3A2C] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
          <span className="text-green-300 text-xs">— Consulta Virtual</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Info do paciente */}
          {paciente && (
            <div className="hidden md:flex items-center gap-3 bg-white/10 rounded-xl px-3 py-1.5">
              <User className="w-4 h-4 text-green-200" />
              <div className="text-xs">
                <p className="text-white font-medium">{paciente.nome}</p>
                {dataHora && (
                  <p className="text-green-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })}
                    <Clock className="w-3 h-3 ml-1" />
                    {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={concluirConsulta}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
          >
            <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
            Concluir consulta
          </button>
        </div>
      </div>

      {/* Painel lateral com info + vídeo */}
      <div className="flex-1 flex overflow-hidden">
        {/* Info do paciente (lateral) */}
        {paciente && (
          <div className="w-64 bg-[#1A3A2C] p-4 shrink-0 overflow-y-auto hidden md:block">
            <h3 className="text-green-200 text-xs font-semibold uppercase tracking-wider mb-3">Paciente</h3>
            <div className="bg-white/10 rounded-xl p-3 mb-4">
              <div className="w-10 h-10 bg-[#5BBD9B] rounded-full flex items-center justify-center mb-2">
                <User className="w-5 h-5 text-white" />
              </div>
              <p className="text-white font-semibold text-sm">{paciente.nome}</p>
              {paciente.data_nascimento && (
                <p className="text-green-300 text-xs mt-1">
                  Nasc.: {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}
                </p>
              )}
              {paciente.telefone && (
                <p className="text-green-300 text-xs mt-0.5">{paciente.telefone}</p>
              )}
            </div>

            {agendamento?.observacoes && (
              <div>
                <h3 className="text-green-200 text-xs font-semibold uppercase tracking-wider mb-2">Queixa</h3>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-blue-100 text-xs leading-relaxed italic">"{agendamento.observacoes}"</p>
                </div>
              </div>
            )}

            {dataHora && (
              <div className="mt-4">
                <h3 className="text-green-200 text-xs font-semibold uppercase tracking-wider mb-2">Horário</h3>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-white text-xs font-medium">
                    {dataHora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })}
                  </p>
                  <p className="text-green-300 text-xs mt-1">
                    {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vídeo */}
        <div className="flex-1 relative">
          <iframe
            src={atendimento.sala_video}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            style={{ minHeight: 'calc(100vh - 56px)' }}
          />
        </div>
      </div>
    </div>
  )
}
