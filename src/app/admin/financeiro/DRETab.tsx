'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react'
import { exportarExcel, exportarPDF, fmtBRL, type LinhaPDF } from './exportUtils'

type LinhaCategoria = { nome: string; valor: number; valor_realizado: number; ordem: number }
type GrupoDRE = { label: string; categorias: LinhaCategoria[]; total: number; total_realizado: number }
type DREData = {
  periodo: { de: string; ate: string }
  grupos: Record<string, GrupoDRE>
  sumario: {
    receita_bruta:     { previsto: number; realizado: number }
    deducoes:          { previsto: number; realizado: number }
    receita_liquida:   { previsto: number; realizado: number }
    custo_operacional: { previsto: number; realizado: number }
    despesa_adm:       { previsto: number; realizado: number }
    despesa_fin:       { previsto: number; realizado: number }
    ebitda:            { previsto: number; realizado: number }
  }
}

const HOJE = new Date().toISOString().split('T')[0]
const MES  = HOJE.slice(0, 7)

const GRUPO_COR: Record<string, string> = {
  receita_bruta:          'bg-green-50 border-l-4 border-green-500',
  deducao:                'bg-red-50 border-l-4 border-red-400',
  custo_operacional:      'bg-orange-50 border-l-4 border-orange-400',
  despesa_administrativa: 'bg-blue-50 border-l-4 border-blue-400',
  despesa_financeira:     'bg-purple-50 border-l-4 border-purple-400',
  investimentos:          'bg-teal-50 border-l-4 border-teal-400',
}

export default function DRETab() {
  const [data,    setData]    = useState<DREData | null>(null)
  const [loading, setLoading] = useState(true)
  const [de,      setDe]      = useState(`${MES}-01`)
  const [ate,     setAte]     = useState(HOJE)

  const carregar = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/financeiro/dre?de=${de}&ate=${ate}`)
      setData(await r.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [de, ate])

  const s      = data?.sumario
  const grupos = data ? Object.entries(data.grupos) : []
  const titulo = `DRE ${de} a ${ate}`

  // ── Exportação ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!data) return
    const linhas: Record<string, unknown>[] = []
    for (const [, g] of grupos) {
      linhas.push({ 'Conta': g.label, 'Previsto (R$)': '', 'Realizado (R$)': '', 'Tipo': 'GRUPO' })
      for (const c of g.categorias) {
        linhas.push({ 'Conta': `  ${c.nome}`, 'Previsto (R$)': c.valor, 'Realizado (R$)': c.valor_realizado, 'Tipo': 'categoria' })
      }
      linhas.push({ 'Conta': `TOTAL ${g.label}`, 'Previsto (R$)': g.total, 'Realizado (R$)': g.total_realizado, 'Tipo': 'subtotal' })
      linhas.push({ 'Conta': '', 'Previsto (R$)': '', 'Realizado (R$)': '', 'Tipo': '' })
    }
    linhas.push({ 'Conta': '= EBITDA', 'Previsto (R$)': s?.ebitda.previsto ?? 0, 'Realizado (R$)': s?.ebitda.realizado ?? 0, 'Tipo': 'RESULTADO' })
    exportarExcel(linhas, `DRE_${de}_${ate}`, 'DRE Gerencial')
  }

  const exportPDF = () => {
    if (!data) return
    const colunas = ['Conta / Categoria', 'Previsto', 'Realizado', '% Rec. Bruta']
    const linhas: LinhaPDF[] = []
    const recBruta = s?.receita_bruta.previsto ?? 1

    for (const [gKey, g] of grupos) {
      linhas.push({
        cells: [g.label, fmtBRL(g.total), fmtBRL(g.total_realizado), recBruta > 0 ? ((g.total / recBruta) * 100).toFixed(1) + '%' : '—'],
        negrito: true, corFundo: 'F0F9FF', corTexto: '0F172A',
      })
      for (const c of g.categorias) {
        linhas.push({
          cells: [c.nome, fmtBRL(c.valor), fmtBRL(c.valor_realizado), g.total > 0 ? ((c.valor / g.total) * 100).toFixed(1) + '%' : '—'],
          indentado: true,
        })
      }
    }
    linhas.push({
      cells: ['= EBITDA', fmtBRL(s?.ebitda.previsto ?? 0), fmtBRL(s?.ebitda.realizado ?? 0),
        recBruta > 0 ? (((s?.ebitda.previsto ?? 0) / recBruta) * 100).toFixed(1) + '%' : '—'],
      negrito: true, corFundo: '1A3A2C', corTexto: 'FFFFFF',
    })
    exportarPDF(titulo, colunas, linhas, `Período: ${de} a ${ate}`)
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
        <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>Previsto = lançado · Realizado = efetivamente pago/recebido</span>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
      ) : !data ? null : (
        <div>
          {/* Cards sumário */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--txt-muted)' }}>Receita Bruta (previsto)</p>
              <p className="text-xl font-bold text-green-600">{fmtBRL(s!.receita_bruta.previsto)}</p>
              <p className="text-xs mt-1 text-green-500">Realizado: {fmtBRL(s!.receita_bruta.realizado)}</p>
            </div>
            <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--txt-muted)' }}>Receita Líquida</p>
              <p className="text-xl font-bold text-blue-600">{fmtBRL(s!.receita_liquida.previsto)}</p>
              <p className="text-xs mt-1 text-blue-400">Realizado: {fmtBRL(s!.receita_liquida.realizado)}</p>
            </div>
            <div className="rounded-2xl p-4 border" style={{
              background: s!.ebitda.previsto >= 0 ? '#f0fdf4' : '#fef2f2',
              borderColor: s!.ebitda.previsto >= 0 ? '#86efac' : '#fca5a5',
            }}>
              <p className="text-xs mb-1 font-medium" style={{ color: s!.ebitda.previsto >= 0 ? '#166534' : '#991b1b' }}>EBITDA</p>
              <p className={`text-2xl font-bold ${s!.ebitda.previsto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmtBRL(s!.ebitda.previsto)}
              </p>
              <p className={`text-xs mt-1 ${s!.ebitda.realizado >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                Realizado: {fmtBRL(s!.ebitda.realizado)}
              </p>
            </div>
          </div>

          {/* Tabela DRE */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1A3A2C', color: 'white' }}>
                  {['Conta / Categoria', 'Previsto', 'Realizado', '% Rec. Bruta'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 font-semibold ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map(([gKey, g]) => (
                  <>
                    <tr key={`g-${gKey}`} className={GRUPO_COR[gKey] ?? ''}>
                      <td className="px-5 py-3 font-bold text-sm" style={{ color: 'var(--txt)' }}>{g.label}</td>
                      <td className="px-5 py-3 text-right font-bold">{fmtBRL(g.total)}</td>
                      <td className="px-5 py-3 text-right font-bold">{fmtBRL(g.total_realizado)}</td>
                      <td className="px-5 py-3 text-right text-xs" style={{ color: 'var(--txt-muted)' }}>
                        {s!.receita_bruta.previsto > 0 ? ((g.total / s!.receita_bruta.previsto) * 100).toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                    {g.categorias.map(c => (
                      <tr key={`c-${gKey}-${c.nome}`} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <td className="px-5 py-2 pl-10 text-xs" style={{ color: 'var(--txt-muted)' }}>{c.nome}</td>
                        <td className="px-5 py-2 text-right text-xs" style={{ color: 'var(--txt)' }}>{fmtBRL(c.valor)}</td>
                        <td className="px-5 py-2 text-right text-xs" style={{ color: 'var(--txt)' }}>{fmtBRL(c.valor_realizado)}</td>
                        <td className="px-5 py-2 text-right text-xs" style={{ color: 'var(--txt-muted)' }}>
                          {g.total > 0 ? ((c.valor / g.total) * 100).toFixed(1) + '%' : '—'}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
                <tr style={{ background: s!.ebitda.previsto >= 0 ? '#f0fdf4' : '#fef2f2', borderTop: '2px solid var(--border)' }}>
                  <td className="px-5 py-4 font-bold" style={{ color: 'var(--txt)' }}>= EBITDA</td>
                  <td className={`px-5 py-4 text-right text-lg font-bold ${s!.ebitda.previsto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {fmtBRL(s!.ebitda.previsto)}
                  </td>
                  <td className={`px-5 py-4 text-right font-bold ${s!.ebitda.realizado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtBRL(s!.ebitda.realizado)}
                  </td>
                  <td className="px-5 py-4 text-right text-xs" style={{ color: 'var(--txt-muted)' }}>
                    {s!.receita_bruta.previsto > 0 ? ((s!.ebitda.previsto / s!.receita_bruta.previsto) * 100).toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
