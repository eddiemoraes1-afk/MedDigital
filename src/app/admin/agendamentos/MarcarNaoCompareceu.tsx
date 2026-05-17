'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserX } from 'lucide-react'

interface Props {
  agendamentoId: string
  dataHora: string
  status: string
}

export default function MarcarNaoCompareceu({ agendamentoId, dataHora, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const now = new Date()
  const appointmentDate = new Date(dataHora.endsWith('Z') ? dataHora : dataHora + 'Z')
  const isPast = appointmentDate <= now
  const canMark = isPast && ['agendado', 'confirmado', 'pendente'].includes(status)

  if (!canMark) return null

  async function marcar() {
    setLoading(true)
    try {
      await fetch(`/api/admin/agendamentos/${agendamentoId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'nao_compareceu' }),
      })
      router.refresh()
    } finally {
      setLoading(false)
      setConfirmando(false)
    }
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="text-xs text-gray-500">Confirmar não comparecimento?</span>
        <button
          onClick={marcar}
          disabled={loading}
          className="text-xs text-red-600 hover:text-red-700 font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          {loading ? 'Marcando…' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirmando(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="flex items-center gap-1 mt-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
    >
      <UserX className="w-3 h-3" />
      Não compareceu
    </button>
  )
}
