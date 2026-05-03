'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Loader2 } from 'lucide-react'

interface Props {
  agendamentoId: string
  dataHora: string // ISO UTC string do banco
}

function formatarHoraSP(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
    hour12: false,
  }).format(date)
}

export default function BotaoEntrarConsulta({ agendamentoId, dataHora }: Props) {
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  const agora = new Date()
  const consulta = new Date(dataHora)
  const diffMin = (consulta.getTime() - agora.getTime()) / 60000

  // Janela: 60 min antes até 2h depois
  const dentroJanela = diffMin <= 60 && diffMin > -120

  if (!dentroJanela) {
    if (diffMin > 60) {
      // Mostrar quando a sala abre (60 min antes do horário SP)
      const abreUTC = new Date(consulta.getTime() - 60 * 60000)
      return (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Video className="w-3 h-3" />
          Sala abre às {formatarHoraSP(abreUTC)}
        </p>
      )
    }
    return null
  }

  async function entrar() {
    setCarregando(true)
    const res = await fetch('/api/consulta/sala-agendada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendamento_id: agendamentoId }),
    })
    const data = await res.json()
    if (data.atendimentoId) {
      router.push(`/paciente/consulta/${data.atendimentoId}`)
    } else {
      alert('Erro ao entrar na consulta: ' + (data.error || 'tente novamente'))
      setCarregando(false)
    }
  }

  return (
    <button
      onClick={entrar}
      disabled={carregando}
      className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 mt-2"
    >
      {carregando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
      {carregando ? 'Abrindo sala...' : 'Entrar na consulta'}
    </button>
  )
}
