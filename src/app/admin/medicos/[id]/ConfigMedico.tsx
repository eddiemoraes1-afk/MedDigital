'use client'

import { useState } from 'react'
import { Settings2, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  medicoId: string
  custoConsultaAtual: number
  custoReceitaAtual: number
}

export default function ConfigMedico({ medicoId, custoConsultaAtual, custoReceitaAtual }: Props) {
  const [custoConsulta, setCustoConsulta] = useState(custoConsultaAtual > 0 ? String(custoConsultaAtual) : '')
  const [custoReceita, setCustoReceita] = useState(custoReceitaAtual > 0 ? String(custoReceitaAtual) : '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSalvar() {
    const vc = parseFloat(custoConsulta.replace(',', '.') || '0')
    const vr = parseFloat(custoReceita.replace(',', '.') || '0')
    if (isNaN(vc) || vc < 0 || isNaN(vr) || vr < 0) {
      setError('Valor inválido')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/medico/${medicoId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custo_consulta: vc, custo_receita: vr }),
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

  function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div>
        <label className="text-xs text-gray-400 font-medium mb-1 block">{label}</label>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-400 font-medium">R$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={value}
            onChange={e => { onChange(e.target.value); setSaved(false) }}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-1">
        <Settings2 className="w-4 h-4 text-gray-400" />
        Remuneração do Médico
      </h3>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Valores pagos ao médico por serviço prestado. Usados nos relatórios de custo e margem.
      </p>

      <div className="space-y-3">
        <Field label="Por consulta concluída" value={custoConsulta} onChange={setCustoConsulta} />
        <Field label="Por renovação de receita" value={custoReceita} onChange={setCustoReceita} />

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
            'Salvar valores'
          )}
        </button>

        {(custoConsultaAtual > 0 || custoReceitaAtual > 0) && (
          <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-gray-100">
            {custoConsultaAtual > 0 && (
              <p>Consulta atual: R$ {custoConsultaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            )}
            {custoReceitaAtual > 0 && (
              <p>Receita atual: R$ {custoReceitaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
