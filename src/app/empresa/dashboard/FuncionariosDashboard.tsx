'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, Loader2, RefreshCw, BarChart2, Download, Search, X, FileText } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface KPIs {
  totalConsultas: number
  totalGastosConsultas: number
  totalMensalidade: number
  totalRenovacoes: number
  totalGastosRenovacoes: number
  totalGeral: number
  funcionariosAtivos: number
  funcionariosComUso: number
  ticketMedio: number
  taxaUso: number
}

interface RelacaoItem {
  categoria: 'Funcionário' | 'Dependente'
  cadastros: number
  pacientesAtivos: number
  consultas: number
  valor: number
  taxaUso: number
}

interface DetalheRelacaoItem {
  relacao: string
  categoria: 'Funcionário' | 'Dependente'
  cadastros: number
  pacientesAtivos: number
  consultas: number
  taxaUso: number
}

interface TitularDep {
  nome: string
  relacao: string
  consultas: number
  valor: number
  renovacoes: number
  valorRenovacoes: number
}

interface TitularItem {
  nome: string
  cargo: string
  departamento: string
  registroFuncional: string
  consultasProprias: number
  consultasDependentes: number
  totalConsultas: number
  valorProprio: number
  valorDependentes: number
  totalValorConsultas: number
  renovacoesProprias: number
  renovacoesDependentes: number
  totalRenovacoes: number
  valorRenovacoesProprias: number
  valorRenovacoesDependentes: number
  totalValorRenovacoes: number
  totalValor: number
  dependentes: TitularDep[]
}

interface DashData {
  kpis: KPIs
  gastosPorMes: Array<{ mes: string; consultas: number; valor: number; renovacoes: number; valorRenovacoes: number; valorTotal: number }>
  distribuicaoRelacao: RelacaoItem[]
  detalheRelacao: DetalheRelacaoItem[]
  consultasRelacaoPorMes: Array<{ mes: string; funcionarios: number; dependentes: number; valorFuncionarios: number; valorDependentes: number }>
  gastosPorTitular: TitularItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatMes(ym: string) {
  const [year, month] = ym.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[parseInt(month) - 1]}/${year.slice(2)}`
}

// ── Donut Chart ────────────────────────────────────────────────────────────────
interface DonutSlice { label: string; value: number; color: string }

function DonutChart({ slices, formatValue, formatCenter }: {
  slices: DonutSlice[]
  formatValue?: (v: number) => string
  formatCenter?: (total: number) => string
}) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 text-gray-300">
        <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
        <span className="text-xs">Sem dados</span>
      </div>
    )
  }

  function polarXY(deg: number, r: number): [number, number] {
    const rad = (deg - 90) * Math.PI / 180
    return [r * Math.cos(rad), r * Math.sin(rad)]
  }

  function sectorPath(startDeg: number, endDeg: number): string {
    const span = endDeg - startDeg
    if (span >= 360) { endDeg = startDeg + 359.9 }
    const [ox1, oy1] = polarXY(startDeg, 80)
    const [ox2, oy2] = polarXY(endDeg, 80)
    const [ix2, iy2] = polarXY(endDeg, 52)
    const [ix1, iy1] = polarXY(startDeg, 52)
    const lg = span > 180 ? 1 : 0
    return `M${ox1},${oy1} A80,80 0 ${lg} 1 ${ox2},${oy2} L${ix2},${iy2} A52,52 0 ${lg} 0 ${ix1},${iy1}Z`
  }

  let cumDeg = 0
  const sectors = slices.map(s => {
    const deg = (s.value / total) * 360
    const start = cumDeg; cumDeg += deg
    return { ...s, path: sectorPath(start, cumDeg) }
  })

  const centerLabel = formatCenter ? formatCenter(total) : String(total)
  const centerFontSize = centerLabel.length > 8 ? 8.5 : 13

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="-95 -95 190 190" className="w-44 h-44">
        {sectors.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2">
            <title>{s.label}: {formatValue ? formatValue(s.value) : s.value}</title>
          </path>
        ))}
        <text x="0" y="-6" textAnchor="middle" fontSize={centerFontSize} fontWeight="bold" fill="#1A3A2C">{centerLabel}</text>
        <text x="0" y="10" textAnchor="middle" fontSize="8" fill="#9CA3AF">total</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-xs">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate max-w-[90px]">{s.label}</span>
            <span className="font-semibold text-gray-700">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Grouped Bar Chart ──────────────────────────────────────────────────────────
function GroupedBarChart({ data, labelKey, keys, colors, formatValue = (v: number) => String(v) }: {
  data: Record<string, any>[]
  labelKey: string
  keys: string[]
  colors: string[]
  formatValue?: (v: number) => string
}) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-300 text-xs">Sem dados no período</div>

  const W = 580, H = 220
  const PAD = { top: 24, right: 16, bottom: 52, left: 44 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k] ?? 0)), 1)
  const n = data.length
  const groupW = plotW / n
  const barW = Math.min((groupW * 0.8) / keys.length, 24)
  const groupPad = (groupW - barW * keys.length) / 2

  function fmtTick(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0) }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {Array.from({ length: 5 }, (_, i) => {
          const tv = (i / 4) * maxVal
          const y = PAD.top + plotH - (tv / maxVal) * plotH
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F3F4F6" strokeWidth="1" />
              <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF">{fmtTick(tv)}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const gx = PAD.left + i * groupW + groupPad
          const rawLabel = String(d[labelKey])
          const lbl = rawLabel.length > 8 ? rawLabel.slice(0, 6) + '…' : rawLabel
          const cx = PAD.left + i * groupW + groupW / 2
          return (
            <g key={i}>
              {keys.map((k, ki) => {
                const v = d[k] ?? 0
                const bh = Math.max(2, (v / maxVal) * plotH)
                const bx = gx + ki * barW
                return (
                  <rect key={ki} x={bx} y={PAD.top + plotH - bh} width={barW - 2} height={bh}
                    fill={colors[ki] || '#9CA3AF'} rx="2" opacity={0.9}>
                    <title>{rawLabel} · {k}: {formatValue(v)}</title>
                  </rect>
                )
              })}
              <text x={cx} y={PAD.top + plotH + 14} textAnchor="middle" fontSize="9" fill="#6B7280"
                transform={n > 6 ? `rotate(-35,${cx},${PAD.top + plotH + 14})` : ''}>
                {lbl}
              </text>
            </g>
          )
        })}
        <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1" />
      </svg>
      <div className="flex justify-center gap-4 mt-1">
        {keys.map((k, i) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i] }} />
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chart Card ─────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-50 ${className}`}>
      <div className="mb-4">
        <h3 className="font-bold text-[#1A3A2C] text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Titular Table ──────────────────────────────────────────────────────────────
function TitularTable({ titulares }: { titulares: TitularItem[] }) {
  const [expandido, setExpandido] = useState<number | null>(null)

  if (!titulares.length) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-300 text-sm">
        Nenhuma consulta ou renovação no período selecionado
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-2 w-6">#</th>
            <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Titular / Funcionário</th>
            <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Registro</th>
            <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Cargo / Depto</th>
            <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Consultas</th>
            <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Custo Consultas</th>
            <th className="text-right text-xs text-purple-400 font-medium pb-2 pr-3">Renovações</th>
            <th className="text-right text-xs text-purple-400 font-medium pb-2 pr-3">Custo Renovações</th>
            <th className="text-right text-xs text-[#1A3A2C] font-medium pb-2">Total Gasto</th>
          </tr>
        </thead>
        <tbody>
          {titulares.map((t, i) => (
            <React.Fragment key={i}>
              <tr
                className={`border-b border-gray-50 cursor-pointer transition-colors ${i === 0 ? 'bg-amber-50' : 'hover:bg-gray-50'} ${expandido === i ? 'bg-green-50' : ''}`}
                onClick={() => setExpandido(expandido === i ? null : i)}
              >
                <td className="py-2.5 pr-2 text-xs text-gray-400 font-medium">{i + 1}</td>
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-[#1A3A2C] text-sm">{t.nome}</div>
                  {t.dependentes.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-blue-600 font-medium">{t.dependentes.length} dependente{t.dependentes.length !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-gray-300">{expandido === i ? '▲' : '▼'}</span>
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-xs text-gray-500 font-mono">{t.registroFuncional !== '—' ? t.registroFuncional : '—'}</td>
                <td className="py-2.5 pr-3 text-xs text-gray-500">
                  {t.cargo !== '—' && <div>{t.cargo}</div>}
                  {t.departamento !== '—' && <div className="text-gray-400">{t.departamento}</div>}
                </td>
                <td className="py-2.5 pr-3 text-sm text-right text-gray-600">{t.totalConsultas > 0 ? t.totalConsultas : <span className="text-gray-300">—</span>}</td>
                <td className="py-2.5 pr-3 text-sm text-right font-semibold text-[#1A3A2C]">
                  {t.totalValorConsultas > 0 ? formatBRL(t.totalValorConsultas) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 pr-3 text-sm text-right">
                  {t.totalRenovacoes > 0
                    ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{t.totalRenovacoes}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="py-2.5 pr-3 text-sm text-right font-semibold text-purple-700">
                  {t.totalValorRenovacoes > 0 ? formatBRL(t.totalValorRenovacoes) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 text-sm text-right">
                  <div className="font-bold text-[#1A3A2C]">{formatBRL(t.totalValor)}</div>
                </td>
              </tr>
              {expandido === i && t.dependentes.map((dep, di) => (
                <tr key={`dep-${i}-${di}`} className="border-b border-blue-50 bg-blue-50/40">
                  <td className="py-2 pr-2"></td>
                  <td className="py-2 pr-3 pl-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-sm text-gray-700">{dep.nome}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">{dep.relacao}</span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-400">dependente</td>
                  <td className="py-2 pr-3 text-sm text-right text-blue-600 font-medium">{dep.consultas || <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 pr-3 text-sm text-right text-blue-600 font-semibold">{dep.valor > 0 ? formatBRL(dep.valor) : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 pr-3 text-sm text-right">
                    {(dep.renovacoes ?? 0) > 0
                      ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{dep.renovacoes}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="py-2 pr-3 text-sm text-right text-purple-600 font-semibold">
                    {(dep.valorRenovacoes ?? 0) > 0 ? formatBRL(dep.valorRenovacoes) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 text-sm text-right font-bold text-blue-700">
                    {formatBRL((dep.valor ?? 0) + (dep.valorRenovacoes ?? 0))}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-3">* Clique em uma linha para ver os dependentes. O custo total do titular inclui suas próprias consultas, renovações e as dos seus dependentes.</p>
    </div>
  )
}

// ── Period selector ────────────────────────────────────────────────────────────
const PERIODOS = [
  { v: '7d', l: '7 dias' },
  { v: '30d', l: '30 dias' },
  { v: '3m', l: '3 meses' },
  { v: '6m', l: '6 meses' },
  { v: '12m', l: '12 meses' },
  { v: 'custom', l: 'Personalizado' },
]

// ── Export Excel ───────────────────────────────────────────────────────────────
async function exportarExcel(data: DashData, setLoading: (v: boolean) => void) {
  setLoading(true)
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // Aba 1: Resumo por funcionário
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Funcionário', 'Registro', 'Cargo', 'Departamento', 'Consultas', 'Custo Consultas (R$)', 'Renovações', 'Custo Renovações (R$)', 'Total Gasto (R$)'],
      ...data.gastosPorTitular.map(t => [
        t.nome,
        t.registroFuncional !== '—' ? t.registroFuncional : '',
        t.cargo !== '—' ? t.cargo : '',
        t.departamento !== '—' ? t.departamento : '',
        t.totalConsultas, t.totalValorConsultas,
        t.totalRenovacoes, t.totalValorRenovacoes,
        t.totalValor,
      ]),
    ]), 'Custo por Funcionário')

    // Aba 2: Composição base
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Categoria', 'Cadastros', 'Ativaram App', 'Consultas', 'Taxa de Uso (%)'],
      ...(data.distribuicaoRelacao ?? []).map(r => [r.categoria, r.cadastros, r.pacientesAtivos, r.consultas, r.taxaUso]),
    ]), 'Distribuição')

    // Aba 3: Detalhamento por vínculo
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Relação', 'Categoria', 'Cadastros', 'Ativaram App', 'Consultas', 'Taxa de Uso (%)'],
      ...(data.detalheRelacao ?? []).map(r => [r.relacao, r.categoria, r.cadastros, r.pacientesAtivos, r.consultas, r.taxaUso]),
    ]), 'Detalhamento Vínculo')

    XLSX.writeFile(wb, `funcionarios-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } finally {
    setLoading(false)
  }
}

// ── Export PDF ────────────────────────────────────────────────────────────────
function exportarPDF(titulares: TitularItem[], titulo: string) {
  const rows = titulares.map((t, i) => `
    <tr style="border-bottom:1px solid #f3f4f6; ${i % 2 === 0 ? 'background:#fafafa' : 'background:#fff'}">
      <td style="padding:6px 8px; font-size:12px; color:#6b7280;">${i + 1}</td>
      <td style="padding:6px 8px; font-size:12px; font-weight:600; color:#1a3a2c;">${t.nome}</td>
      <td style="padding:6px 8px; font-size:11px; color:#6b7280; font-family:monospace;">${t.registroFuncional !== '—' ? t.registroFuncional : ''}</td>
      <td style="padding:6px 8px; font-size:11px; color:#6b7280;">${[t.cargo !== '—' ? t.cargo : '', t.departamento !== '—' ? t.departamento : ''].filter(Boolean).join(' / ') || '—'}</td>
      <td style="padding:6px 8px; font-size:12px; text-align:right; color:#374151;">${t.totalConsultas > 0 ? t.totalConsultas : '—'}</td>
      <td style="padding:6px 8px; font-size:12px; text-align:right; font-weight:600; color:#1a3a2c;">${t.totalValorConsultas > 0 ? t.totalValorConsultas.toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) : '—'}</td>
      <td style="padding:6px 8px; font-size:12px; text-align:right; color:#374151;">${t.totalRenovacoes > 0 ? t.totalRenovacoes : '—'}</td>
      <td style="padding:6px 8px; font-size:12px; text-align:right; font-weight:600; color:#7c3aed;">${t.totalValorRenovacoes > 0 ? t.totalValorRenovacoes.toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) : '—'}</td>
      <td style="padding:6px 8px; font-size:12px; text-align:right; font-weight:700; color:#1a3a2c;">${t.totalValor.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</td>
    </tr>
  `).join('')

  const totalGeral = titulares.reduce((s, t) => s + t.totalValor, 0)
  const totalConsultas = titulares.reduce((s, t) => s + t.totalConsultas, 0)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a3a2c; padding: 24px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
    .meta { display: flex; gap: 24px; margin-bottom: 20px; }
    .meta-item { background: #f3faf7; border-radius: 8px; padding: 10px 16px; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .meta-value { font-size: 18px; font-weight: 700; color: #1a3a2c; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #1a3a2c; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    th:nth-child(n+5) { text-align: right; }
    tfoot td { background: #1a3a2c; color: white; padding: 8px; font-size: 12px; font-weight: 700; }
    tfoot td:nth-child(n+5) { text-align: right; }
    .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${titulo}</h1>
  <p class="subtitle">Gerado em ${new Date().toLocaleString('pt-BR')} · ${titulares.length} funcionário${titulares.length !== 1 ? 's' : ''}</p>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Total Funcionários</div><div class="meta-value">${titulares.length}</div></div>
    <div class="meta-item"><div class="meta-label">Total Consultas</div><div class="meta-value">${totalConsultas}</div></div>
    <div class="meta-item"><div class="meta-label">Total Gasto</div><div class="meta-value">${totalGeral.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Nome</th><th>Registro</th><th>Cargo / Depto</th>
        <th>Consultas</th><th>Custo Consultas</th>
        <th>Renovações</th><th>Custo Renovações</th>
        <th>Total Gasto</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">TOTAL</td>
        <td>${totalConsultas}</td>
        <td>${titulares.reduce((s,t)=>s+t.totalValorConsultas,0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
        <td>${titulares.reduce((s,t)=>s+t.totalRenovacoes,0)}</td>
        <td>${titulares.reduce((s,t)=>s+t.totalValorRenovacoes,0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
        <td>${totalGeral.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
      </tr>
    </tfoot>
  </table>
  <p class="footer">* Custo total inclui consultas e renovações de dependentes atribuídas ao titular.</p>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FuncionariosDashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [periodo, setPeriodo] = useState('30d')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  // Filtros da tabela de funcionários
  const [buscaNome, setBuscaNome] = useState('')
  const [filtroDept, setFiltroDept] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroUso, setFiltroUso] = useState<'todos' | 'com' | 'sem'>('todos')

  const calcRange = useCallback((p: string): [string, string] => {
    const now = new Date()
    const start = new Date(now)
    if (p === '7d') start.setDate(start.getDate() - 7)
    else if (p === '30d') start.setDate(start.getDate() - 30)
    else if (p === '3m') start.setMonth(start.getMonth() - 3)
    else if (p === '6m') start.setMonth(start.getMonth() - 6)
    else if (p === '12m') start.setFullYear(start.getFullYear() - 1)
    return [start.toISOString(), now.toISOString()]
  }, [])

  const carregar = useCallback(async (p: string, ini?: string, fi?: string) => {
    setLoading(true)
    try {
      const [i, f] = p === 'custom' ? [ini!, fi!] : calcRange(p)
      const res = await fetch(`/api/empresa/dashboard?inicio=${encodeURIComponent(i)}&fim=${encodeURIComponent(f)}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [calcRange])

  useEffect(() => { carregar('30d') }, [carregar])

  function handlePeriodo(p: string) {
    setPeriodo(p)
    if (p !== 'custom') carregar(p)
  }

  function handleCustomApply() {
    if (inicio && fim) carregar('custom', `${inicio}T00:00:00Z`, `${fim}T23:59:59Z`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Carregando dados dos funcionários...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Users className="w-10 h-10 opacity-30" />
        <p className="text-sm">Erro ao carregar dados.</p>
        <button onClick={() => carregar(periodo)} className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  const { kpis } = data

  const todosDeptos = useMemo(() => {
    const s = new Set<string>()
    ;(data.gastosPorTitular ?? []).forEach(t => { if (t.departamento && t.departamento !== '—') s.add(t.departamento) })
    return [...s].sort()
  }, [data.gastosPorTitular])

  const todosCargos = useMemo(() => {
    const s = new Set<string>()
    ;(data.gastosPorTitular ?? []).forEach(t => { if (t.cargo && t.cargo !== '—') s.add(t.cargo) })
    return [...s].sort()
  }, [data.gastosPorTitular])

  const titularesFiltrados = useMemo(() => {
    let lista = data.gastosPorTitular ?? []
    if (buscaNome.trim()) {
      const q = buscaNome.trim().toLowerCase()
      lista = lista.filter(t =>
        t.nome.toLowerCase().includes(q) ||
        t.registroFuncional.toLowerCase().includes(q)
      )
    }
    if (filtroDept) lista = lista.filter(t => t.departamento === filtroDept)
    if (filtroCargo) lista = lista.filter(t => t.cargo === filtroCargo)
    if (filtroUso === 'com') lista = lista.filter(t => t.totalConsultas > 0 || t.totalRenovacoes > 0)
    if (filtroUso === 'sem') lista = lista.filter(t => t.totalConsultas === 0 && t.totalRenovacoes === 0)
    return lista
  }, [data.gastosPorTitular, buscaNome, filtroDept, filtroCargo, filtroUso])

  const temFiltroTabela = buscaNome.trim() || filtroDept || filtroCargo || filtroUso !== 'todos'

  return (
    <div className="space-y-6">

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODOS.map(p => (
            <button key={p.v} onClick={() => handlePeriodo(p.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${periodo === p.v ? 'bg-[#1A3A2C] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.l}
            </button>
          ))}
        </div>

        {periodo === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
            <span className="text-gray-400 text-xs">até</span>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
            <button onClick={handleCustomApply}
              className="bg-[#5BBD9B] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#4aab8a] transition-colors">
              Aplicar
            </button>
          </div>
        )}

        <div className="ml-auto text-xs text-gray-400">
          {(data.gastosPorTitular ?? []).length} funcionários · Exportar na tabela abaixo
        </div>
      </div>

      {/* ── KPI cards por categoria ── */}
      {data.distribuicaoRelacao && data.distribuicaoRelacao.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Cards gerais */}
          <div className="rounded-2xl p-4 bg-[#1A3A2C] col-span-2 md:col-span-1">
            <p className="text-xs font-semibold text-green-300 uppercase tracking-wide mb-2">Funcionários Ativos</p>
            <p className="text-3xl font-bold text-white">{kpis.funcionariosAtivos}</p>
            <p className="text-xs text-green-300 mt-1">{kpis.funcionariosComUso} com uso · taxa {kpis.taxaUso}%</p>
          </div>

          {data.distribuicaoRelacao.map(r => (
            <div key={r.categoria} className={`rounded-2xl p-4 border-2 ${r.categoria === 'Funcionário' ? 'border-[#5BBD9B] bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${r.categoria === 'Funcionário' ? 'text-[#1A3A2C]' : 'text-blue-700'}`}>
                {r.categoria}s
              </p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-bold text-[#1A3A2C]">{r.cadastros}</p>
                  <p className="text-xs text-gray-500">cadastros</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#1A3A2C]">{r.consultas}</p>
                  <p className="text-xs text-gray-500">consultas</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/60">
                <p className="text-xs text-gray-500">Taxa de uso: <span className={`font-bold ${r.categoria === 'Funcionário' ? 'text-[#1A3A2C]' : 'text-blue-700'}`}>{r.taxaUso}%</span></p>
                <p className="text-xs text-gray-400">{r.pacientesAtivos} ativaram o app</p>
              </div>
            </div>
          ))}

          {/* Total gasto geral */}
          <div className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm col-span-2 md:col-span-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Total Gasto no Período</p>
            <p className="text-2xl font-bold text-[#1A3A2C]">{formatBRL(kpis.totalGastosConsultas + kpis.totalGastosRenovacoes)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatBRL(kpis.totalGastosConsultas)} consultas
              {kpis.totalGastosRenovacoes > 0 && ` + ${formatBRL(kpis.totalGastosRenovacoes)} renovações`}
            </p>
          </div>
        </div>
      )}

      {/* ── Composição da base ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Composição da Base" subtitle="Total de beneficiários cadastrados por tipo">
          <DonutChart
            slices={(data.distribuicaoRelacao ?? []).filter(d => d.cadastros > 0).map(d => ({
              label: d.categoria,
              value: d.cadastros,
              color: d.categoria === 'Funcionário' ? '#5BBD9B' : '#3B82F6',
            }))}
            formatValue={v => `${v} cadastros`}
            formatCenter={total => String(total)}
          />
        </ChartCard>
        <ChartCard title="Gasto Total por Tipo de Beneficiário (R$)" subtitle="Valor gasto em consultas por categoria">
          <DonutChart
            slices={(data.distribuicaoRelacao ?? []).filter(d => d.valor > 0).map(d => ({
              label: d.categoria,
              value: d.valor,
              color: d.categoria === 'Funcionário' ? '#1A3A2C' : '#3B82F6',
            }))}
            formatValue={v => formatBRL(v)}
            formatCenter={formatBRL}
          />
        </ChartCard>
      </div>

      {/* ── Consultas por mês: funcionários vs dependentes ── */}
      {data.consultasRelacaoPorMes && data.consultasRelacaoPorMes.length > 0 && (
        <ChartCard title="Consultas por Mês — Funcionários vs Dependentes" subtitle="Quantidade de atendimentos por tipo de beneficiário">
          <GroupedBarChart
            data={data.consultasRelacaoPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
            labelKey="mes"
            keys={['funcionarios', 'dependentes']}
            colors={['#5BBD9B', '#3B82F6']}
            formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
          />
        </ChartCard>
      )}

      {/* ── Detalhamento por tipo de vínculo ── */}
      <ChartCard title="Detalhamento por Tipo de Vínculo" subtitle="Consultas e cadastros por cada tipo de relação">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Relação</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Categoria</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Cadastros</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Ativaram App</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Consultas</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2">Taxa de Uso</th>
              </tr>
            </thead>
            <tbody>
              {(data.detalheRelacao ?? []).map((r, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 pr-3 text-sm font-medium text-[#1A3A2C] capitalize">{r.relacao}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.categoria === 'Funcionário' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.categoria}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-right text-gray-600">{r.cadastros}</td>
                  <td className="py-2.5 pr-3 text-sm text-right text-gray-600">{r.pacientesAtivos}</td>
                  <td className="py-2.5 pr-3 text-sm text-right font-semibold text-[#1A3A2C]">{r.consultas}</td>
                  <td className="py-2.5 text-sm text-right">
                    <span className={`font-bold ${r.taxaUso >= 50 ? 'text-green-600' : r.taxaUso > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {r.taxaUso}%
                    </span>
                  </td>
                </tr>
              ))}
              {(!data.detalheRelacao || data.detalheRelacao.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-300 text-sm">Sem dados de relação cadastrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ── Custo por Titular (tabela principal) ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {/* Cabeçalho + filtros */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-[#1A3A2C] text-sm">Custo por Funcionário — Consultas e Renovações</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {temFiltroTabela
                  ? `${titularesFiltrados.length} de ${(data.gastosPorTitular ?? []).length} funcionários`
                  : `${(data.gastosPorTitular ?? []).length} funcionários`
                } · Clique em uma linha para ver dependentes
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => exportarExcel(data, setExportandoExcel)}
                disabled={exportandoExcel}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60 transition-colors"
              >
                {exportandoExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Excel
              </button>
              <button
                onClick={() => exportarPDF(titularesFiltrados, 'Custo por Funcionário')}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Busca por nome */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nome ou registro…"
                value={buscaNome}
                onChange={e => setBuscaNome(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-gray-50 text-gray-700 placeholder-gray-400"
              />
              {buscaNome && (
                <button onClick={() => setBuscaNome('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Departamento */}
            {todosDeptos.length > 0 && (
              <select
                value={filtroDept}
                onChange={e => setFiltroDept(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-gray-50"
              >
                <option value="">Todos os departamentos</option>
                {todosDeptos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}

            {/* Cargo */}
            {todosCargos.length > 0 && (
              <select
                value={filtroCargo}
                onChange={e => setFiltroCargo(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-gray-50"
              >
                <option value="">Todos os cargos</option>
                {todosCargos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Uso */}
            <select
              value={filtroUso}
              onChange={e => setFiltroUso(e.target.value as 'todos' | 'com' | 'sem')}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-gray-50"
            >
              <option value="todos">Com e sem uso</option>
              <option value="com">Com consultas/renovações</option>
              <option value="sem">Sem uso no período</option>
            </select>

            {temFiltroTabela && (
              <button
                onClick={() => { setBuscaNome(''); setFiltroDept(''); setFiltroCargo(''); setFiltroUso('todos') }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 underline underline-offset-2"
              >
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          <TitularTable titulares={titularesFiltrados} />
        </div>
      </div>

    </div>
  )
}
