'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

type DiaFluxo = {
  data: string
  entradas: number
  saidas: number
  saldo_dia: number
  saldo_acumulado: number
}

type FluxoData = {
  periodo: { de: string; ate: string }
  dias: DiaFluxo[]
  sumario: { total_entradas: number; total_saidas: number; saldo_periodo: number }
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })

const HOJE = new Date().toISOString().split('T')[0]
const MES  = HOJE.slice(0, 7)

export default function FluxoCaixaTab() {
  const [data,    setData]    = useState<FluxoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [de,      setDe]      = useState(`${MES}-01`)
  const [ate,     setAte]     = useState(HOJE)

  const carregar = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/financeiro/fluxo-caixa?de=${de}&ate=${ate}`)
      const d = await r.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [de, ate])

  const s = data?.sumario

  // Calcular max para barra visual
  const maxVal = data ? Math.max(...data.dias.map(d => Math.max(d.entradas, d.saidas)), 1) : 1

  return (
    <div>
      {/* Filtro */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--txt-muted)' }}>De:</label>
          <input type="date" value={de} onChange={e => setDe(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--txt-muted)' }}>Até:</label>
          <input type="date" value={ate} onChange={e => setAte(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
        </div>
        <button onClick={carregar} className="p-2 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
        <span className="text-xs ml-auto" style={{ color: 'var(--txt-muted)' }}>Baseado em pagamentos realizados (data_pagamento)</span>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
      ) : !data ? null : (
        <>
          {/* Cards sumário */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--txt-muted)' }}>
                <TrendingUp className="w-3.5 h-3.5 text-green-500" /> Entradas
              </p>
              <p className="text-xl font-bold text-green-600">{fmt(s!.total_entradas)}</p>
            </div>
            <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--txt-muted)' }}>
                <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Saídas
              </p>
              <p className="text-xl font-bold text-red-600">{fmt(s!.total_saidas)}</p>
            </div>
            <div className="rounded-2xl p-4 border" style={{
              background: s!.saldo_periodo >= 0 ? '#f0fdf4' : '#fef2f2',
              borderColor: s!.saldo_periodo >= 0 ? '#86efac' : '#fca5a5'
            }}>
              <p className="text-xs mb-1 font-medium" style={{ color: s!.saldo_periodo >= 0 ? '#166534' : '#991b1b' }}>Saldo do Período</p>
              <p className={`text-xl font-bold ${s!.saldo_periodo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmt(s!.saldo_periodo)}
              </p>
            </div>
          </div>

          {data.dias.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
              Nenhum pagamento registrado neste período
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1A3A2C', color: 'white' }}>
                    <th className="px-5 py-3 text-left font-semibold">Data</th>
                    <th className="px-5 py-3 text-right font-semibold">Entradas</th>
                    <th className="px-5 py-3 text-right font-semibold">Saídas</th>
                    <th className="px-5 py-3 text-right font-semibold">Saldo do Dia</th>
                    <th className="px-5 py-3 text-right font-semibold">Saldo Acumulado</th>
                    <th className="px-5 py-3 text-left font-semibold w-40">Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dias.map((d, i) => (
                    <tr key={d.data} style={{
                      background: i % 2 === 0 ? 'var(--bg)' : 'var(--card)',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      <td className="px-5 py-3 text-xs font-medium capitalize" style={{ color: 'var(--txt)' }}>
                        {fmtData(d.data)}
                      </td>
                      <td className="px-5 py-3 text-right text-green-600 font-medium text-xs">
                        {d.entradas > 0 ? fmt(d.entradas) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-red-600 font-medium text-xs">
                        {d.saidas > 0 ? fmt(d.saidas) : '—'}
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold text-xs ${d.saldo_dia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(d.saldo_dia)}
                      </td>
                      <td className={`px-5 py-3 text-right font-bold text-sm ${d.saldo_acumulado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {fmt(d.saldo_acumulado)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          {d.entradas > 0 && (
                            <div className="h-2 rounded-full bg-green-400" style={{ width: `${(d.entradas / maxVal) * 100}%`, minWidth: 4 }} />
                          )}
                          {d.saidas > 0 && (
                            <div className="h-2 rounded-full bg-red-400" style={{ width: `${(d.saidas / maxVal) * 100}%`, minWidth: 4 }} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
