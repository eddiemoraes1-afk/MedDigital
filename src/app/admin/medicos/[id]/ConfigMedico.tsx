'use client'

import { useState } from 'react'
import { Settings2, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  medicoId: string
  custoAtual: number
}

export default function ConfigMedico({ medicoId, custoAtual }: Props) {
  const [custo, setCusto] = useState(custoAtual > 0 ? String(custoAtual) : '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSalvar() {
    const val = parseFloat(custo.replace(',', '.'))
    if (isNaN(val) || val < 0) {
      setError('Valor inválido')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/medico/${medicoId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custo_consulta: val }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao salvar')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-4">
        <Settings2 className="w-4 h-4 text-gray-400" />
        Remuneração por Consulta
      </h3>

      <p className="text-xs text-gray-400 mb-3 leading-relaxed">
        Valor pago ao médico por consulta concluída. Usado para calcular custo e margem nos relatórios de produção.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">R$ / consulta</label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-400 font-medium pl-1">R$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={custo}
              onChange={e => { setCusto(e.target.value); setSaved(false) }}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSalvar}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 bg-[#1A3A2C] hover:bg-[#122a1f] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-[#5BBD9B]" /> Salvo!</>
          ) : (
            'Salvar valor'
          )}
        </button>

        {custoAtual > 0 && (
          <p className="text-xs text-gray-400 text-center">
            Atual: R$ {custoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    </div>
  )
}
