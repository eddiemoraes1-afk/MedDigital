'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { aprovarMedico, reprovarMedico } from '../actions'

interface Props {
  medicoId: string
  modoReprovacao?: boolean  // só mostra reprovar (médico já aprovado)
  modoAprovacao?: boolean   // só mostra reativar (médico reprovado)
}

export default function BotoesAprovacao({ medicoId, modoReprovacao, modoAprovacao }: Props) {
  const [carregando, setCarregando] = useState<'aprovando' | 'reprovando' | null>(null)

  async function handleAprovar() {
    setCarregando('aprovando')
    try { await aprovarMedico(medicoId) }
    catch (e) { alert('Erro ao aprovar: ' + e) }
    finally { setCarregando(null) }
  }

  async function handleReprovar() {
    setCarregando('reprovando')
    try { await reprovarMedico(medicoId) }
    catch (e) { alert('Erro ao reprovar: ' + e) }
    finally { setCarregando(null) }
  }

  // Médico já aprovado — só botão de reprovar
  if (modoReprovacao) {
    return (
      <button
        onClick={handleReprovar}
        disabled={carregando !== null}
        className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 px-3 py-1.5 rounded-lg font-medium mx-auto"
      >
        {carregando === 'reprovando' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
        Reprovar
      </button>
    )
  }

  // Médico reprovado — só botão de reativar
  if (modoAprovacao) {
    return (
      <button
        onClick={handleAprovar}
        disabled={carregando !== null}
        className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 disabled:opacity-60 text-green-700 px-3 py-1.5 rounded-lg font-medium mx-auto"
      >
        {carregando === 'aprovando' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Reativar
      </button>
    )
  }

  // Médico pendente — ambos os botões
  return (
    <div className="flex gap-2 justify-center">
      <button
        onClick={handleAprovar}
        disabled={carregando !== null}
        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
      >
        {carregando === 'aprovando' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Aprovar
      </button>
      <button
        onClick={handleReprovar}
        disabled={carregando !== null}
        className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium"
      >
        {carregando === 'reprovando' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
        Reprovar
      </button>
    </div>
  )
}
