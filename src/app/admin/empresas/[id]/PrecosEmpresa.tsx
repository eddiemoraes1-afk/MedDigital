'use client'

import { useState } from 'react'
import { DollarSign, Save, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  empresaId: string
  precoMensalidadeAtual: number
  precoConsultaAtual: number
  percentualCoparticipacaoAtual: number
}

export default function PrecosEmpresa({ empresaId, precoMensalidadeAtual, precoConsultaAtual, percentualCoparticipacaoAtual }: Props) {
  const [mensalidade, setMensalidade] = useState(precoMensalidadeAtual.toFixed(2))
  const [consulta, setConsulta] = useState(precoConsultaAtual.toFixed(2))
  const [coparticipacao, setCoparticipacao] = useState(percentualCoparticipacaoAtual.toString())
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const pct = parseFloat(coparticipacao) || 0
    if (pct < 0 || pct > 100) {
      setErro('O percentual de co-participação deve ser entre 0 e 100.')
      setSalvando(false)
      return
    }
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/precos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preco_mensalidade: parseFloat(mensalidade) || 0,
          preco_consulta: parseFloat(consulta) || 0,
          percentual_coparticipacao: pct,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao salvar')
      }
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-[#5BBD9B]" /> Precificação
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">
            Mensalidade por funcionário (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={mensalidade}
              onChange={e => setMensalidade(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
              placeholder="0,00"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Cobrado por funcionário ativo por mês</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">
            Preço por consulta (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={consulta}
              onChange={e => setConsulta(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
              placeholder="0,00"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Registrado em cada consulta realizada</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">
            Co-participação do funcionário (%)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={coparticipacao}
              onChange={e => setCoparticipacao(e.target.value)}
              className="w-full pl-3 pr-9 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Parte do valor da consulta cobrada ao funcionário. 0% = empresa paga tudo.
          </p>
        </div>

        {erro && (
          <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
        )}

        <button
          onClick={salvar}
          disabled={salvando}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            salvo
              ? 'bg-green-100 text-green-700'
              : 'bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white disabled:opacity-50'
          }`}
        >
          {salvando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : salvo ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {salvo ? 'Salvo!' : 'Salvar preços'}
        </button>
      </div>
    </div>
  )
}
