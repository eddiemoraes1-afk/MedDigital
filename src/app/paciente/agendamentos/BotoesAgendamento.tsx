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
  const [justificativa, setJustificativa] = useState('')
  const router = useRouter()

  async function cancelar() {
    setCancelando(true)
    const res = await fetch('/api/agendamento/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agendamento_id: agendamentoId,
        motivo_cancelamento: justificativa.trim() || null,
      }),
    })
    setCancelando(false)
    setConfirmar(false)
    setJustificativa('')
    if (res.ok) router.refresh()
  }

  function reagendar() {
    router.push(`/paciente/agendar?reagendar=${agendamentoId}&medico_id=${medicoId}`)
  }

  if (confirmar) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs text-gray-500">Cancelar consulta com Dr(a). {medicoNome}?</p>
        <textarea
          value={justificativa}
          onChange={e => setJustificativa(e.target.value)}
          placeholder="Motivo do cancelamento (opcional)"
          rows={2}
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-700 placeholder-gray-300"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={cancelar}
            disabled={cancelando}
            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
          >
            {cancelando ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Confirmar cancelamento
          </button>
          <button
            onClick={() => { setConfirmar(false); setJustificativa('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        onClick={reagendar}
        className="flex items-center gap-1.5 text-xs text-[#5BBD9B] border border-[#5BBD9B] px-3 py-1.5 rounded-lg hover:bg-green-50 font-medium"
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
