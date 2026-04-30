'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { aprovarMedico, reprovarMedico } from '../actions'

export default function BotoesAprovacao({ medicoId }: { medicoId: string }) {
  const [carregando, setCarregando] = useState<'aprovando' | 'reprovando' | null>(null)

  async function handleAprovar() {
    setCarregando('aprovando')
    try {
      await aprovarMedico(medicoId)
    } catch (e) {
      alert('Erro ao aprovar: ' + e)
    } finally {
      setCarregando(null)
    }
  }

  async function handleReprovar() {
    setCarregando('reprovando')
    try {
      await reprovarMedico(medicoId)
    } catch (e) {
      alert('Erro ao reprovar: ' + e)
    } finally {
      setCarregando(null)
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={handleAprovar}
        disabled={carregando !== null}
        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium"
      >
        {carregando === 'aprovando'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <CheckCircle2 className="w-4 h-4" />}
        Aprovar
      </button>
      <button
        onClick={handleReprovar}
        disabled={carregando !== null}
        className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-700 px-4 py-2 rounded-xl text-sm font-medium"
      >
        {carregando === 'reprovando'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <XCircle className="w-4 h-4" />}
        Reprovar
      </button>
    </div>
  )
}
