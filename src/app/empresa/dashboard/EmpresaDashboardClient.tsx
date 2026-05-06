'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, TrendingDown, Building2, DollarSign,
  Download, Printer, Loader2, Activity, Users, RefreshCw, UserCheck,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface KPIs {
  totalConsultas: number
  totalGastosConsultas: number
  totalMensalidade: number
  totalGeral: number
  funcionariosAtivos: number
  funcionariosComUso: number
  ticketMedio: number
  taxaUso: number
}

interface EmpresaDashData {
  kpis: KPIs
  gastosPorMes: Array<{ mes: string; consultas: number; valor: number }>
  gastosPorMedico: Array<{ nome: string; especialidade: string; consultas: number; valor: number }>
  gastosPorFaixaEtaria: Array<{ faixa: string; consultas: number; valor: number }>
  gastosPorSexo: Array<{ sexo: string; consultas: number; valor: number }>
  consultasPorStatus: Array<{ status: string; count: number }>
  consultasPorTipo: Array<{ tipo: string; count: number }>
  topFuncionarios: Array<{ nome: string; cargo: string; departamento: string; consultas: number; valor: number }>
  gastosPorDepartamento: Array<{ departamento: string; consultas: number; valor: number }>
  gastosPorCargo: Array<{ cargo: string; consultas: number; valor: number }>
}

// ============================================================
// HELPERS
// ============================================================
function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatMes(ym: string) {
  const [year, month] = ym.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[parseInt(month) - 1]}/${year.slice(2)}`
}

function labelStatus(s: string) {
  const map: Record<string, string> = {
    confirmado: 'Confirmado', concluido: 'Concluído',
    cancelado: 'Cancelado', reagendado: 'Reagendado',
    pendente: 'Pendente', agendado: 'Agendado',
  }
  return map[s] || s
}

const STATUS_COLORS: Record<string, string> = {
  confirmado: '#5BBD9B', concluido: '#1A3A2C',
  cancelado: '#EF4444', reagendado: '#F59E0B',
  pendente: '#9CA3AF', agendado: '#3B82F6',
}
const COLORS = ['#5BBD9B', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899', '#6366F1']

// ============================================================
// SVG CHART COMPONENTS (mesmos do admin)
// ============================================================

interface DonutSlice { label: string; value: number; color: string }

function DonutChart({ slices, formatValue, formatCenter }: { slices: DonutSlice[]; formatValue?: (v: number) => string; formatCenter?: (total: number) => string }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 text-gray-300">
        <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
        <span className="text-xs">Sem dados no período</span>
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
  // If center label is long (e.g. R$ 1.234,56), use smaller font
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
            <span className="truncate max-w-[90px]" title={s.label}>{s.label}</span>
            <span className="font-semibold text-gray-700">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChartSVG({
  data, labelKey, valueKey, color = '#5BBD9B',
  formatValue = (v: number) => String(v),
}: {
  data: Record<string, any>[]; labelKey: string; valueKey: string
  color?: string; formatValue?: (v: number) => string
}) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-300 text-xs">Sem dados no período</div>

  const W = 580, H = 220
  const PAD = { top: 24, right: 16, bottom: 52, left: 58 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const n = data.length
  const slotW = plotW / n
  const barW = slotW * 0.6
  const yTicks = 4

  function fmtTick(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
    return v.toFixed(0)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const tv = (i / yTicks) * maxVal
        const y = PAD.top + plotH - (tv / maxVal) * plotH
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F3F4F6" strokeWidth="1" />
            <text x={PAD.left - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF">{fmtTick(tv)}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const cx = PAD.left + i * slotW + slotW / 2
        const v = d[valueKey] ?? 0
        const bh = Math.max(2, (v / maxVal) * plotH)
        const rawLabel = String(d[labelKey])
        const lbl = rawLabel.length > 9 ? rawLabel.slice(0, 7) + '…' : rawLabel
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={PAD.top + plotH - bh} width={barW} height={bh} fill={color} rx="3">
              <title>{rawLabel}: {formatValue(v)}</title>
            </rect>
            <text x={cx} y={PAD.top + plotH + 14} textAnchor="middle" fontSize="9" fill="#6B7280"
              transform={n > 7 ? `rotate(-35,${cx},${PAD.top + plotH + 14})` : ''}>
              {lbl}
            </text>
          </g>
        )
      })}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1" />
    </svg>
  )
}

function HBarChart({
  data, labelKey, valueKey,
  color = '#5BBD9B', formatValue = (v: number) => String(v), maxItems = 10,
}: {
  data: Record<string, any>[]; labelKey: string; valueKey: string
  color?: string; formatValue?: (v: number) => string; maxItems?: number
}) {
  const items = data.slice(0, maxItems)
  if (!items.length) return <div className="flex items-center justify-center h-16 text-gray-300 text-xs">Sem dados no período</div>

  const maxVal = Math.max(...items.map(d => d[valueKey] ?? 0), 1)
  const ROW = 38, W = 520, LABEL_W = 160, BAR_AREA = 280
  const H = items.length * ROW + 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {items.map((d, i) => {
        const bw = Math.max(4, ((d[valueKey] ?? 0) / maxVal) * BAR_AREA)
        const y = i * ROW
        const label = String(d[labelKey])
        const truncated = label.length > 24 ? label.slice(0, 22) + '…' : label
        return (
          <g key={i}>
            {i === 0 && <rect x={0} y={y + 2} width={W} height={ROW - 4} fill="#F9FAFB" rx="4" />}
            <text x={0} y={y + ROW / 2 + 4} fontSize="10" fill={i === 0 ? '#1A3A2C' : '#374151'} fontWeight={i === 0 ? 'bold' : 'normal'}>
              {truncated}
            </text>
            <rect x={LABEL_W} y={y + 8} width={bw} height={22} fill={color} rx="4" opacity={i === 0 ? 1 : 0.85}>
              <title>{d[labelKey]}: {formatValue(d[valueKey] ?? 0)}</title>
            </rect>
            <text x={LABEL_W + bw + 7} y={y + ROW / 2 + 4} fontSize="9" fill="#6B7280">
              {formatValue(d[valueKey] ?? 0)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function LineChartSVG({
  data, labelKey, valueKey,
  color = '#3B82F6', formatValue = (v: number) => String(v),
}: {
  data: Record<string, any>[]; labelKey: string; valueKey: string
  color?: string; formatValue?: (v: number) => string
}) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-300 text-xs">Sem dados no período</div>

  const W = 580, H = 200
  const PAD = { top: 20, right: 16, bottom: 42, left: 48 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const n = data.length
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const gradId = `empLineGrad_${color.replace('#', '')}`

  const pts = data.map((d, i) => ({
    x: PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW),
    y: PAD.top + plotH - ((d[valueKey] ?? 0) / maxVal) * plotH,
    label: String(d[labelKey]), value: d[valueKey] ?? 0,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${pts[0].x},${PAD.top + plotH} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length - 1].x},${PAD.top + plotH}Z`

  function fmtTick(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0) }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {Array.from({ length: 5 }, (_, i) => {
        const tv = (i / 4) * maxVal; const y = PAD.top + plotH - (tv / maxVal) * plotH
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F3F4F6" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF">{fmtTick(tv)}</text>
          </g>
        )
      })}
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="white" stroke={color} strokeWidth="2.5">
          <title>{p.label}: {formatValue(p.value)}</title>
        </circle>
      ))}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={PAD.top + plotH + 16} textAnchor="middle" fontSize="9" fill="#9CA3AF">
          {p.label.length > 7 ? p.label.slice(0, 6) : p.label}
        </text>
      ))}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1" />
    </svg>
  )
}

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

function KpiCard({ label, value, sub, icon: Icon, color, highlight }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${highlight ? 'bg-[#1A3A2C] border-[#1A3A2C]' : 'bg-white border-gray-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-medium ${highlight ? 'text-green-300' : 'text-gray-400'}`}>{label}</p>
          <p className={`text-xl font-bold mt-1 leading-tight ${highlight ? 'text-white' : 'text-[#1A3A2C]'}`}>{value}</p>
          {sub && <p className={`text-xs mt-0.5 ${highlight ? 'text-green-300' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: highlight ? 'rgba(255,255,255,0.15)' : `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color: highlight ? '#5BBD9B' : color }} />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================
async function exportarExcel(data: EmpresaDashData, setLoading: (v: boolean) => void) {
  setLoading(true)
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const kpiRows = [
      ['Métrica', 'Valor'],
      ['Total de Gastos (Consultas + Mensalidade)', formatBRL(data.kpis.totalGeral)],
      ['Gastos com Consultas', formatBRL(data.kpis.totalGastosConsultas)],
      ['Mensalidade', formatBRL(data.kpis.totalMensalidade)],
      ['Consultas Realizadas', data.kpis.totalConsultas],
      ['Custo Médio por Consulta', formatBRL(data.kpis.ticketMedio)],
      ['Funcionários Ativos', data.kpis.funcionariosAtivos],
      ['Funcionários com Uso', data.kpis.funcionariosComUso],
      ['Taxa de Uso', `${data.kpis.taxaUso}%`],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPIs')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Mês', 'Consultas', 'Gastos (R$)'],
      ...data.gastosPorMes.map(r => [formatMes(r.mes), r.consultas, r.valor]),
    ]), 'Gastos por Mês')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Médico', 'Especialidade', 'Consultas', 'Gastos (R$)'],
      ...data.gastosPorMedico.map(r => [r.nome, r.especialidade, r.consultas, r.valor]),
    ]), 'Por Médico')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Faixa Etária', 'Consultas', 'Gastos (R$)'],
      ...data.gastosPorFaixaEtaria.map(r => [r.faixa, r.consultas, r.valor]),
    ]), 'Por Faixa Etária')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Sexo', 'Consultas', 'Gastos (R$)'],
      ...data.gastosPorSexo.map(r => [r.sexo, r.consultas, r.valor]),
    ]), 'Por Sexo')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Status', 'Quantidade'],
      ...data.consultasPorStatus.map(r => [labelStatus(r.status), r.count]),
    ]), 'Status Agendamentos')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Funcionário', 'Cargo', 'Departamento', 'Consultas', 'Total Gasto (R$)'],
      ...data.topFuncionarios.map(r => [r.nome, r.cargo, r.departamento, r.consultas, r.valor]),
    ]), 'Top Funcionários')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Departamento', 'Consultas', 'Gastos (R$)'],
      ...data.gastosPorDepartamento.map(r => [r.departamento, r.consultas, r.valor]),
    ]), 'Por Departamento')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Cargo', 'Consultas', 'Gastos (R$)'],
      ...data.gastosPorCargo.map(r => [r.cargo, r.consultas, r.valor]),
    ]), 'Por Cargo')

    XLSX.writeFile(wb, `gastos-empresa-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } finally {
    setLoading(false)
  }
}

function exportarPDF(data: EmpresaDashData) {
  const k = data.kpis
  const td = `padding:5px 8px;border-bottom:1px solid #F0F0F0;`
  const th = `background:#1A3A2C;color:white;padding:6px 8px;text-align:left;font-size:10px;`
  const tbl = (headers: string[], rows: string[][]) =>
    `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <tr>${headers.map(h => `<th style="${th}">${h}</th>`).join('')}</tr>
      ${rows.map((r, i) => `<tr>${r.map(c => `<td style="${td}${i % 2 ? 'background:#FAFAFA' : ''}">${c}</td>`).join('')}</tr>`).join('')}
    </table>`

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Gastos</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;color:#1A3A2C;background:#f8f8f8;padding:28px}
  h1{font-size:20px;font-weight:bold}
  .sub{color:#6B7280;font-size:12px;margin-bottom:24px;margin-top:3px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
  .kpi{background:white;border-radius:10px;padding:13px 16px;border:1px solid #E5E7EB}
  .kpi.hi{background:#1A3A2C;border-color:#1A3A2C}
  .kpi-label{font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px}
  .kpi.hi .kpi-label{color:#86EFAC}
  .kpi-value{font-size:18px;font-weight:bold;margin-top:3px}
  .kpi.hi .kpi-value{color:white}
  section{margin-bottom:22px;page-break-inside:avoid}
  h2{font-size:13px;font-weight:bold;border-bottom:2px solid #5BBD9B;padding-bottom:6px;margin-bottom:10px}
  @media print{body{background:white;padding:0}@page{margin:14mm;size:A4}}
</style></head><body>
<h1>📊 Relatório de Gastos com Saúde Corporativa</h1>
<p class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
<div class="kpis">
  <div class="kpi hi"><div class="kpi-label">Total de Gastos</div><div class="kpi-value">${formatBRL(k.totalGeral)}</div></div>
  <div class="kpi"><div class="kpi-label">Gastos c/ Consultas</div><div class="kpi-value">${formatBRL(k.totalGastosConsultas)}</div></div>
  <div class="kpi"><div class="kpi-label">Mensalidade</div><div class="kpi-value">${formatBRL(k.totalMensalidade)}</div></div>
  <div class="kpi"><div class="kpi-label">Consultas Realizadas</div><div class="kpi-value">${k.totalConsultas}</div></div>
  <div class="kpi"><div class="kpi-label">Custo Médio / Consulta</div><div class="kpi-value">${formatBRL(k.ticketMedio)}</div></div>
  <div class="kpi"><div class="kpi-label">Taxa de Uso</div><div class="kpi-value">${k.taxaUso}% (${k.funcionariosComUso}/${k.funcionariosAtivos})</div></div>
</div>
<section><h2>Gastos por Mês</h2>${tbl(['Mês', 'Consultas', 'Gastos'], data.gastosPorMes.map(r => [formatMes(r.mes), String(r.consultas), formatBRL(r.valor)]))}</section>
<section><h2>Gastos por Médico</h2>${tbl(['Médico', 'Especialidade', 'Consultas', 'Gastos'], data.gastosPorMedico.map(r => [r.nome, r.especialidade, String(r.consultas), formatBRL(r.valor)]))}</section>
<section><h2>Por Faixa Etária</h2>${tbl(['Faixa', 'Consultas', 'Gastos'], data.gastosPorFaixaEtaria.map(r => [r.faixa, String(r.consultas), formatBRL(r.valor)]))}</section>
<section><h2>Por Sexo</h2>${tbl(['Sexo', 'Consultas', 'Gastos'], data.gastosPorSexo.map(r => [r.sexo, String(r.consultas), formatBRL(r.valor)]))}</section>
<section><h2>Status dos Agendamentos</h2>${tbl(['Status', 'Quantidade'], data.consultasPorStatus.map(r => [labelStatus(r.status), String(r.count)]))}</section>
<section><h2>Gastos por Departamento</h2>${tbl(['Departamento', 'Consultas', 'Gastos'], data.gastosPorDepartamento.map(r => [r.departamento, String(r.consultas), formatBRL(r.valor)]))}</section>
<section><h2>Gastos por Cargo</h2>${tbl(['Cargo', 'Consultas', 'Gastos'], data.gastosPorCargo.map(r => [r.cargo, String(r.consultas), formatBRL(r.valor)]))}</section>
<section><h2>Top 10 Funcionários por Gasto</h2>${tbl(['Funcionário', 'Cargo', 'Departamento', 'Consultas', 'Total Gasto'], data.topFuncionarios.map(r => [r.nome, r.cargo, r.departamento, String(r.consultas), formatBRL(r.valor)]))}</section>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const PERIODOS = [
  { v: '7d', l: '7 dias' },
  { v: '30d', l: '30 dias' },
  { v: '3m', l: '3 meses' },
  { v: '6m', l: '6 meses' },
  { v: '12m', l: '12 meses' },
  { v: 'custom', l: 'Personalizado' },
]

export default function EmpresaDashboardClient() {
  const [data, setData] = useState<EmpresaDashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [periodo, setPeriodo] = useState('30d')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

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
        <p className="text-gray-400 text-sm">Carregando analytics de gastos...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <BarChart2 className="w-10 h-10 opacity-30" />
        <p className="text-sm">Erro ao carregar dados.</p>
        <button onClick={() => carregar(periodo)} className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  const { kpis } = data

  return (
    <div className="space-y-6">

      {/* ---- Filter bar ---- */}
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

        <div className="ml-auto flex gap-2">
          <button onClick={() => exportarExcel(data, setExportandoExcel)} disabled={exportandoExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60 transition-colors">
            {exportandoExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Excel
          </button>
          <button onClick={() => exportarPDF(data)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
            <Printer className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* ---- KPIs ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total de Gastos" value={formatBRL(kpis.totalGeral)} sub="consultas + mensalidade" icon={DollarSign} color="#5BBD9B" highlight />
        <KpiCard label="Gastos Consultas" value={formatBRL(kpis.totalGastosConsultas)} sub={`${kpis.totalConsultas} realizadas`} icon={Activity} color="#3B82F6" />
        <KpiCard label="Mensalidade" value={formatBRL(kpis.totalMensalidade)} sub={`${kpis.funcionariosAtivos} funcionários ativos`} icon={Building2} color="#8B5CF6" />
        <KpiCard label="Custo Médio" value={formatBRL(kpis.ticketMedio)} sub="por consulta" icon={TrendingDown} color="#F59E0B" />
        <KpiCard label="Funcionários" value={String(kpis.funcionariosAtivos)} sub={`${kpis.funcionariosComUso} com uso`} icon={Users} color="#14B8A6" />
        <KpiCard label="Taxa de Uso" value={`${kpis.taxaUso}%`} sub="da equipe utilizou" icon={UserCheck} color="#EC4899" />
      </div>

      {/* ---- Row 1: Gastos por mês + Status ---- */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Gastos por Mês" subtitle="Custo total de consultas no período">
            <BarChartSVG data={data.gastosPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="valor" color="#5BBD9B" formatValue={formatBRL} />
          </ChartCard>
        </div>
        <ChartCard title="Status dos Agendamentos" subtitle="Distribuição no período">
          <DonutChart
            slices={data.consultasPorStatus.filter(d => d.count > 0).map((d, i) => ({
              label: labelStatus(d.status),
              value: d.count,
              color: STATUS_COLORS[d.status] || COLORS[i % COLORS.length],
            }))}
          />
        </ChartCard>
      </div>

      {/* ---- Row 2: Consultas por mês + Tipo ---- */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Consultas por Mês" subtitle="Quantidade de atendimentos realizados">
            <LineChartSVG data={data.gastosPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="consultas" color="#3B82F6"
              formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`} />
          </ChartCard>
        </div>
        <ChartCard title="Tipo de Consulta" subtitle="Agendada vs. Fila / Hora">
          <DonutChart
            slices={data.consultasPorTipo.filter(d => d.count > 0).map((d, i) => ({
              label: d.tipo, value: d.count, color: ['#3B82F6', '#F59E0B'][i] || COLORS[i],
            }))}
          />
        </ChartCard>
      </div>

      {/* ---- Row 3: Por médico + Sexo ---- */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Gastos por Médico" subtitle="Custo das consultas por profissional">
            <HBarChart data={data.gastosPorMedico} labelKey="nome" valueKey="valor" formatValue={formatBRL} color="#8B5CF6" />
          </ChartCard>
        </div>
        <ChartCard title="Gastos por Sexo" subtitle="Distribuição do custo por gênero">
          <DonutChart
            slices={data.gastosPorSexo.filter(d => d.valor > 0).map(d => ({
              label: d.sexo, value: d.valor,
              color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF',
            }))}
            formatValue={formatBRL}
            formatCenter={formatBRL}
          />
        </ChartCard>
      </div>

      {/* ---- Row 4: Por departamento e por cargo ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Gastos por Departamento" subtitle="Custo de consultas por área da empresa">
          <HBarChart data={data.gastosPorDepartamento} labelKey="departamento" valueKey="valor"
            formatValue={formatBRL} color="#5BBD9B" />
        </ChartCard>
        <ChartCard title="Gastos por Cargo" subtitle="Custo de consultas por função">
          <HBarChart data={data.gastosPorCargo} labelKey="cargo" valueKey="valor"
            formatValue={formatBRL} color="#F59E0B" />
        </ChartCard>
      </div>

      {/* ---- Row 4b: Consultas por departamento e cargo ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Consultas por Departamento" subtitle="Volume de atendimentos por área">
          <HBarChart data={data.gastosPorDepartamento} labelKey="departamento" valueKey="consultas"
            formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`} color="#14B8A6" />
        </ChartCard>
        <ChartCard title="Consultas por Cargo" subtitle="Volume de atendimentos por função">
          <HBarChart data={data.gastosPorCargo} labelKey="cargo" valueKey="consultas"
            formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`} color="#8B5CF6" />
        </ChartCard>
      </div>

      {/* ---- Row 5: Consultas por médico ---- */}
      <ChartCard title="Consultas por Médico" subtitle="Quantidade de atendimentos por profissional">
        <HBarChart
          data={data.gastosPorMedico.map(d => ({ nome: d.nome, consultas: d.consultas }))}
          labelKey="nome" valueKey="consultas"
          formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
          color="#14B8A6"
        />
      </ChartCard>

      {/* ---- Row 5: Faixa etária ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Gastos por Faixa Etária" subtitle="Custo segmentado por idade dos funcionários">
          <BarChartSVG data={data.gastosPorFaixaEtaria} labelKey="faixa" valueKey="valor"
            formatValue={formatBRL} color="#F59E0B" />
        </ChartCard>
        <ChartCard title="Consultas por Faixa Etária" subtitle="Volume de atendimentos por grupo de idade">
          <BarChartSVG data={data.gastosPorFaixaEtaria} labelKey="faixa" valueKey="consultas"
            formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`} color="#6366F1" />
        </ChartCard>
      </div>

      {/* ---- Row 6: Top funcionários ---- */}
      <ChartCard title="Top 10 Funcionários por Gasto" subtitle="Maiores utilizadores do plano no período">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">#</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Funcionário</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Cargo</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Departamento</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Consultas</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2">Total Gasto</th>
              </tr>
            </thead>
            <tbody>
              {data.topFuncionarios.map((f, i) => (
                <tr key={i} className={`border-b border-gray-50 ${i === 0 ? 'bg-amber-50' : ''}`}>
                  <td className="py-2.5 pr-3 text-xs text-gray-400 font-medium">{i + 1}</td>
                  <td className="py-2.5 pr-3 text-sm font-medium text-[#1A3A2C]">{f.nome}</td>
                  <td className="py-2.5 pr-3 text-xs text-gray-500">{f.cargo}</td>
                  <td className="py-2.5 pr-3 text-xs text-gray-500">{f.departamento}</td>
                  <td className="py-2.5 pr-3 text-sm text-right text-gray-600">{f.consultas}</td>
                  <td className="py-2.5 text-sm text-right font-semibold text-[#1A3A2C]">{formatBRL(f.valor)}</td>
                </tr>
              ))}
              {data.topFuncionarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-300 text-sm">
                    Nenhuma consulta realizada no período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

    </div>
  )
}
