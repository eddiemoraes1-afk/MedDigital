'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Loader2 } from 'lucide-react'

interface Props {
  agendamentoId: string
  dataHora: string // string do banco — pode não ter suffix de timezone
}

// Força interpretação UTC: Supabase retorna "2026-05-03T13:00:00" sem Z,
// mas o valor está em UTC. O browser sem Z trata como hora local (SP = UTC-3),
// adicionando 3h a mais. Adicionamos Z para forçar UTC em qualquer ambiente.
function parsearUTC(str: string): Date {
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) return new Date(str)
  return new Date(str + 'Z')
}

// São Paulo é sempre UTC-3 (horário de verão abolido em 2019)
function horarySP(utcDate: Date): string {
  const sp = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000)
  const h = String(sp.getUTCHours()).padStart(2, '0')
  const m = String(sp.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export default function BotaoEntrarConsulta({ agendamentoId, dataHora }: Props) {
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  const agora = new Date()
  const consulta = parsearUTC(dataHora)       // ← interpreta sempre como UTC
  const diffMin = (consulta.getTime() - agora.getTime()) / 60000

  // Janela: 60 min antes até 2h depois
  const dentroJanela = diffMin <= 60 && diffMin > -120

  if (!dentroJanela) {
    if (diffMin > 60) {
      const abreUTC = new Date(consulta.getTime() - 60 * 60 * 1000)
      return (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Video className="w-3 h-3" />
          Sala abre às {horarySP(abreUTC)}
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
