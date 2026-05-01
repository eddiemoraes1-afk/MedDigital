'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, RefreshCw, Loader2 } from 'lucide-react'

interface Props {
  agendamentoId: string
  medicoId: string
  medicoNome: string
}

export default function BotoesAgendamento({ agendamentoId, medicoId, medicoNome }: Props) {
  const [cancelando, setCancelando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const router = useRouter()

  async function cancelar() {
    setCancelando(true)
    const res = await fetch('/api/agendamento/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendamento_id: agendamentoId }),
    })
    setCancelando(false)
    setConfirmar(false)
    if (res.ok) router.refresh()
  }

  function reagendar() {
    router.push(`/paciente/agendar?reagendar=${agendamentoId}&medico_id=${medicoId}`)
  }

  if (confirmar) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-500">Cancelar consulta com Dr(a). {medicoNome}?</span>
        <button
          onClick={cancelar}
          disabled={cancelando}
          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
        >
          {cancelando ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Confirmar
        </button>
        <button
          onClick={() => setConfirmar(false)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
        >
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        onClick={reagendar}
        className="flex items-center gap-1.5 text-xs text-[#2E75B6] border border-[#2E75B6] px-3 py-1.5 rounded-lg hover:bg-blue-50 font-medium"
      >
        <RefreshCw className="w-3 h-3" />
        Reagendar
      </button>
      <button
        onClick={() => setConfirmar(true)}
        className="flex items-center gap-1.5 text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium"
      >
        <X className="w-3 h-3" />
        Cancelar
      </button>
    </div>
  )
}
