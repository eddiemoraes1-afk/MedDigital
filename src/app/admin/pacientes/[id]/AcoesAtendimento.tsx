'use client'

import { useState, useTransition } from 'react'
import { Trash2, UserPlus, Check, X, Loader2 } from 'lucide-react'
import { excluirAtendimento, atribuirMedicoAtendimento } from '../../actions'

interface Medico { id: string; nome: string; especialidade: string | null }

interface Props {
  atendimentoId: string
  pacienteId: string
  medicos: Medico[]
}

export default function AcoesAtendimento({ atendimentoId, pacienteId, medicos }: Props) {
  const [modo, setModo] = useState<'idle' | 'atribuir' | 'confirmarExcluir'>('idle')
  const [medicoSelecionado, setMedicoSelecionado] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleExcluir() {
    startTransition(async () => {
      await excluirAtendimento(atendimentoId, pacienteId)
    })
  }

  function handleAtribuir() {
    if (!medicoSelecionado) return
    startTransition(async () => {
      await atribuirMedicoAtendimento(atendimentoId, medicoSelecionado, pacienteId)
      setModo('idle')
      setMedicoSelecionado('')
    })
  }

  if (isPending) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguarde…
      </span>
    )
  }

  if (modo === 'confirmarExcluir') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-xs text-red-500 font-medium">Excluir?</span>
        <button
          onClick={handleExcluir}
          className="flex items-center gap-0.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-lg transition-colors font-medium"
        >
          <Check className="w-3 h-3" /> Sim
        </button>
        <button
          onClick={() => setModo('idle')}
          className="flex items-center gap-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors"
        >
          <X className="w-3 h-3" /> Não
        </button>
      </span>
    )
  }

  if (modo === 'atribuir') {
    return (
      <span className="flex items-center gap-1.5">
        <select
          value={medicoSelecionado}
          onChange={e => setMedicoSelecionado(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white max-w-[200px]"
          autoFocus
        >
          <option value="">Selecione…</option>
          {medicos.map(m => (
            <option key={m.id} value={m.id}>
              {m.nome}{m.especialidade ? ` — ${m.especialidade}` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={handleAtribuir}
          disabled={!medicoSelecionado}
          className="flex items-center gap-0.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-40"
        >
          <Check className="w-3 h-3" /> OK
        </button>
        <button
          onClick={() => { setModo('idle'); setMedicoSelecionado('') }}
          className="flex items-center gap-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        onClick={() => setModo('atribuir')}
        title="Atribuir médico"
        className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg transition-colors font-medium"
      >
        <UserPlus className="w-3 h-3" /> Atribuir
      </button>
      <button
        onClick={() => setModo('confirmarExcluir')}
        title="Excluir consulta"
        className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </span>
  )
}
