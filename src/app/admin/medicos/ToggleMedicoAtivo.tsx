'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Power, PowerOff } from 'lucide-react'
import { toggleMedicoAtivo } from '@/app/admin/actions'

interface Props {
  medicoId: string
  ativo: boolean
}

export default function ToggleMedicoAtivo({ medicoId, ativo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const confirmar = window.confirm(
      ativo
        ? 'Inativar este médico? Ele não aparecerá mais para agendamento pelos pacientes.'
        : 'Reativar este médico?'
    )
    if (!confirmar) return
    startTransition(async () => {
      await toggleMedicoAtivo(medicoId, !ativo)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1 disabled:opacity-50 transition-colors ${
        ativo
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-green-50 text-green-700 hover:bg-green-100'
      }`}
    >
      {isPending
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : ativo
          ? <PowerOff className="w-3 h-3" />
          : <Power className="w-3 h-3" />
      }
      {ativo ? 'Inativar' : 'Reativar'}
    </button>
  )
}
