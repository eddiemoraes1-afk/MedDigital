'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, TrendingUp, TrendingDown, FileSpreadsheet, FileText } from 'lucide-react'
import { exportarExcel, exportarPDF, fmtBRL, type LinhaPDF } from './exportUtils'

type DiaFluxo = {
  data: string; entradas: number; saidas: number
  saldo_dia: number; saldo_acumulado: number
}
type FluxoData = {
  periodo: { de: string; ate: string }
  dias: DiaFluxo[]
  sumario: { total_entradas: number; total_saidas: number; saldo_periodo: number }
}

const HOJE = new Date().toISOString().split('T')[0]
const MES  = HOJE.slice(0, 7)

const fmtDataBR = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })

export default function FluxoCaixaTab() {
  const [data,    setData]    = useState<FluxoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [de,      setDe]      = useState(`${MES}-01`)
  const [ate,     setAte]     = useState(HOJE)

  const carregar = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/financeiro/fluxo-caixa?de=${de}&ate=${ate}`)
      setData(await r.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [de, ate])

  const s      = data?.sumario
  const maxVal = data ? Math.max(...data.dias.map(d => Math.max(d.entradas, d.saidas)), 1) : 1
  const titulo = `Fluxo de Caixa ${de} a ${ate}`

  // ── Exportação ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!data) return
    const linhas = data.dias.map(d => ({
      'Data':             new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR'),
      'Entradas (R$)':    d.entradas || '',
      'Saídas (R$)':      d.saidas   || '',
      'Saldo do Dia (R$)':d.saldo_dia,
      'Saldo Acumulado (R$)': d.saldo_acumulado,
    }))
    linhas.push({
      'Data': 'TOTAL',
      'Entradas (R$)':    s?.total_entradas ?? 0,
      'Saídas (R$)':      s?.total_saidas   ?? 0,
      'Saldo do Dia (R$)': s?.saldo_periodo ?? 0,
      'Saldo Acumulado (R$)': s?.saldo_periodo ?? 0,
    })
    exportarExcel(linhas, `FluxoCaixa_${de}_${ate}`, 'Fluxo de Caixa')
  }

  const exportPDF = () => {
    if (!data) return
    const colunas = ['Data', 'Entradas', 'Saídas', 'Saldo do Dia', 'Saldo Acumulado']
    const linhas: LinhaPDF[] = data.dias.map(d => ({
      cells: [
        fmtDataBR(d.data),
        d.entradas > 0 ? fmtBRL(d.entradas) : '—',
        d.saidas   > 0 ? fmtBRL(d.saidas)   : '—',
        fmtBRL(d.saldo_dia),
        fmtBRL(d.saldo_acumulado),
      ],
      corFundo: d.saldo_dia < 0 ? 'FEF2F2' : undefined,
    }))
    linhas.push({
      cells: ['TOTAL', fmtBRL(s?.total_entradas ?? 0), fmtBRL(s?.total_saidas ?? 0), fmtBRL(s?.saldo_periodo ?? 0), ''],
      negrito: true, corFundo: '1A3A2C', corTexto: 'FFFFFF',
    })
    exportarPDF(titulo, colunas, linhas, `Período: ${de} a ${ate} · baseado em pagamentos realizados`)
  }

  const inputSt = { background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt)' } as React.CSSProperties

  return (
    <div>
      {/* Filtro + export */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--txt-muted)' }}>De:</label>
          <input type="date" value={de} onChange={e => setDe(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm" style={inputSt} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--txt-muted)' }}>Até:</label>
          <input type="date" value={ate} onChange={e => setAte(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm" style={inputSt} />
        </div>
        <button onClick={carregar} className="p-2 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5 ml-auto">
          <button onClick={exportExcel} disabled={!data}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-green-50 disabled:opacity-40"
            style={{ borderColor: '#16a34a', color: '#16a34a' }}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} disabled={!data}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-red-50 disabled:opacity-40"
            style={{ borderColor: '#dc2626', color: '#dc2626' }}>
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
        <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>Baseado em pagamentos realizados (data_pagamento)</span>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
      ) : !data ? null : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--txt-muted)' }}>
                <TrendingUp className="w-3.5 h-3.5 text-green-500" /> Entradas
              </p>
              <p className="text-xl font-bold text-green-600">{fmtBRL(s!.total_entradas)}</p>
            </div>
            <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--txt-muted)' }}>
                <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Saídas
              </p>
              <p className="text-xl font-bold text-red-600">{fmtBRL(s!.total_saidas)}</p>
            </div>
            <div className="rounded-2xl p-4 border" style={{
              background: s!.saldo_periodo >= 0 ? '#f0fdf4' : '#fef2f2',
              borderColor: s!.saldo_periodo >= 0 ? '#86efac' : '#fca5a5',
            }}>
              <p className="text-xs mb-1 font-medium" style={{ color: s!.saldo_periodo >= 0 ? '#166534' : '#991b1b' }}>Saldo do Período</p>
              <p className={`text-xl font-bold ${s!.saldo_periodo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmtBRL(s!.saldo_periodo)}
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
                    {['Data', 'Entradas', 'Saídas', 'Saldo do Dia', 'Saldo Acumulado', 'Visual'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 font-semibold ${i === 0 || i === 5 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.dias.map((d, i) => (
                    <tr key={d.data} style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-3 text-xs font-medium capitalize" style={{ color: 'var(--txt)' }}>{fmtDataBR(d.data)}</td>
                      <td className="px-5 py-3 text-right text-green-600 font-medium text-xs">{d.entradas > 0 ? fmtBRL(d.entradas) : '—'}</td>
                      <td className="px-5 py-3 text-right text-red-600 font-medium text-xs">{d.saidas > 0 ? fmtBRL(d.saidas) : '—'}</td>
                      <td className={`px-5 py-3 text-right font-semibold text-xs ${d.saldo_dia >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtBRL(d.saldo_dia)}</td>
                      <td className={`px-5 py-3 text-right font-bold text-sm ${d.saldo_acumulado >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(d.saldo_acumulado)}</td>
                      <td className="px-5 py-3 w-32">
                        <div className="flex flex-col gap-0.5">
                          {d.entradas > 0 && <div className="h-2 rounded-full bg-green-400" style={{ width: `${(d.entradas / maxVal) * 100}%`, minWidth: 4 }} />}
                          {d.saidas   > 0 && <div className="h-2 rounded-full bg-red-400"   style={{ width: `${(d.saidas   / maxVal) * 100}%`, minWidth: 4 }} />}
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
