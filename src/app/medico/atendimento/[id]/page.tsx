'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Phone, FileText, CheckCircle2, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import AtestadoForm from '@/components/AtestadoForm'

export default function AtendimentoMedico() {
  const { id } = useParams()
  const router = useRouter()
  const [dados, setDados] = useState<any>(null)
  const [notas, setNotas] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [showAtestado, setShowAtestado] = useState(false)
  const [atestadoEmitido, setAtestadoEmitido] = useState(false)

  useEffect(() => {
    fetch(`/api/medico/atendimento/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/medico/dashboard'); return }
        setDados(d)
        setNotas(d.atendimento.notas_medico || '')
        setCarregando(false)
      })
      .catch(() => router.push('/medico/dashboard'))
  }, [id])

  async function finalizarConsulta() {
    setSalvando(true)
    await fetch('/api/medico/finalizar-atendimento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atendimento_id: id, notas_medico: notas }),
    })
    setSalvando(false)
    router.push('/medico/dashboard')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#1A3A2C] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
          <p>Entrando na sala...</p>
        </div>
      </div>
    )
  }

  const { atendimento, triagem, paciente, medico } = dados

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-yellow-100 text-yellow-700',
    laranja: 'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }

  // Adicionar nome do médico como parâmetro na URL da sala de vídeo
  const videoUrl = (() => {
    try {
      const url = new URL(atendimento.sala_video)
      url.searchParams.set('name', `Dr. ${medico.nome}`)
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
          <span className="text-green-300 text-xs">— Atendimento Virtual</span>
        </div>
        {paciente && (
          <div className="text-green-200 text-xs">
            Paciente: <strong className="text-white">{paciente.nome}</strong>
            {triagem?.classificacao_risco && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${corRisco[triagem.classificacao_risco] || ''}`}>
                {triagem.classificacao_risco}
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
            src={videoUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
          />
        </div>

        {/* Painel lateral */}
        <div className="w-80 bg-[#1A3A2C] flex flex-col shrink-0 overflow-y-auto">
          {/* Resumo da triagem */}
          {triagem?.resumo_ia && (
            <div className="p-4 border-b border-[#2A4A3C]">
              <p className="text-green-300 text-xs font-medium uppercase tracking-wide mb-2">Resumo da triagem</p>
              <p className="text-blue-100 text-sm leading-relaxed">{triagem.resumo_ia}</p>
            </div>
          )}

          {/* Botão de atestado */}
          <div className="p-4 border-b border-[#2A4A3C]">
            <button
              onClick={() => setShowAtestado(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                showAtestado
                  ? 'bg-[#5BBD9B] text-white'
                  : 'bg-[#0F1F33] text-green-200 hover:bg-[#5BBD9B] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                {atestadoEmitido ? 'Atestado emitido ✓' : 'Emitir Atestado'}
              </span>
              {showAtestado ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAtestado && paciente && (
              <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
                <AtestadoForm
                  atendimentoId={atendimento.id}
                  pacienteId={paciente.id}
                  paciente={{
                    nome: paciente.nome,
                    cpf: paciente.cpf,
                    data_nascimento: paciente.data_nascimento,
                    sexo: paciente.sexo,
                  }}
                  medico={{
                    nome: medico.nome,
                    crm: medico.crm,
                    crm_uf: medico.crm_uf,
                    especialidade: medico.especialidade,
                  }}
                  onFechar={() => setShowAtestado(false)}
                  onSalvo={() => {
                    setAtestadoEmitido(true)
                    setShowAtestado(false)
                  }}
                />
              </div>
            )}
          </div>

          {/* Notas médicas */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-green-300" />
              <p className="text-green-300 text-xs font-medium uppercase tracking-wide">Notas do atendimento</p>
            </div>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Anamnese, diagnóstico, prescrições, orientações..."
              className="flex-1 bg-[#0F1F33] text-blue-100 text-sm rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] placeholder-blue-700 min-h-[180px]"
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
