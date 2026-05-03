'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  empresaId: string
  ativo: boolean
}

export default function ToggleEmpresaAtivo({ empresaId, ativo }: Props) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)

  async function toggle() {
    const confirmar = window.confirm(
      ativo
        ? 'Desativar esta empresa? O portal RH ficará inacessível.'
        : 'Reativar esta empresa?'
    )
    if (!confirmar) return
    setSalvando(true)
    await fetch(`/api/admin/empresas/${empresaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    router.refresh()
    setSalvando(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={salvando}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 disabled:opacity-50 transition-colors ${
        ativo
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-green-50 text-green-700 hover:bg-green-100'
      }`}
    >
      {salvando && <Loader2 className="w-3 h-3 animate-spin" />}
      {ativo ? 'Desativar' : 'Reativar'}
    </button>
  )
}
