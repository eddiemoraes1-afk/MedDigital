'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Loader2 } from 'lucide-react'

interface Props {
  agendamentoId: string
  dataHora: string
}

// Força interpretação UTC: sem Z, o browser trata como hora local (SP = UTC-3),
// adicionando 3h indevidas ao timestamp.
function parsearUTC(str: string): Date {
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) return new Date(str)
  return new Date(str + 'Z')
}

export default function BotaoEntrarConsultaMedico({ agendamentoId, dataHora }: Props) {
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  // Janela: 30 min antes até 3h depois (comparação em UTC puro)
  const agora = new Date()
  const consulta = parsearUTC(dataHora)
  const diffMin = (consulta.getTime() - agora.getTime()) / 60000
  const dentroJanela = diffMin <= 30 && diffMin > -180

  if (!dentroJanela) return null

  async function entrar() {
    setCarregando(true)
    const res = await fetch('/api/consulta/sala-agendada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendamento_id: agendamentoId }),
    })
    const data = await res.json()
    if (data.atendimentoId) {
      router.push(`/medico/consulta/${data.atendimentoId}`)
    } else {
      alert('Erro ao entrar na consulta: ' + (data.error || 'tente novamente'))
      setCarregando(false)
    }
  }

  return (
    <button
      onClick={entrar}
      disabled={carregando}
      className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50 mt-1.5 w-full justify-center"
    >
      {carregando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
      {carregando ? 'Abrindo...' : 'Entrar'}
    </button>
  )
}
