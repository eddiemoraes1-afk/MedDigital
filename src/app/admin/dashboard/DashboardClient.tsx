'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, TrendingUp, Building2, DollarSign, Download,
  Printer, Loader2, Activity, UserCheck, Users, RefreshCw, Receipt, Filter, X,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface KPIs {
  totalConsultas: number
  totalFaturamento: number
  totalMensalidades: number
  totalRenovacoes: number
  totalGastosRenovacoes: number
  totalReceitasEmConsulta: number
  totalGeral: number
  totalEmpresasAtivas: number
  totalMedicos: number
  ticketMedio: number
  valorParticular: number
  consultasParticulares: number
}

interface RelacaoItem {
  categoria: 'Funcionário' | 'Dependente'
  cadastros: number
  pacientesAtivos: number
  consultas: number
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
}

interface TitularItemAdmin {
  nome: string
  cargo: string
  departamento: string
  registroFuncional: string
  empresa: string
  consultasProprias: number
  consultasDependentes: number
  totalConsultas: number
  valorProprio: number
  valorDependentes: number
  totalValor: number
  dependentes: TitularDep[]
}

interface DashboardData {
  kpis: KPIs
  faturamentoPorMes: Array<{ mes: string; consultas: number; valor: number }>
  faturamentoPorEmpresa: Array<{ nome: string; consultas: number; valorConsultas: number; mensalidade: number; funcionariosAtivos: number }>
  faturamentoPorMedico: Array<{ nome: string; especialidade: string; consultas: number; valor: number }>
  faturamentoPorFaixaEtaria: Array<{ faixa: string; consultas: number; valor: number }>
  faturamentoPorSexo: Array<{ sexo: string; consultas: number; valor: number }>
  consultasPorStatus: Array<{ status: string; count: number }>
  consultasPorTipo: Array<{ tipo: string; count: number }>
  funcionariosPorEmpresa: Array<{ nome: string; funcionarios: number; consultas: number }>
  topPacientes: Array<{ nome: string; consultas: number; valor: number; empresa: string }>
  distribuicaoRelacaoGlobal: RelacaoItem[]
  detalheRelacaoGlobal: DetalheRelacaoItem[]
  consultasRelacaoPorMesGlobal: Array<{ mes: string; funcionarios: number; dependentes: number }>
  gastosPorTitularGlobal: TitularItemAdmin[]
  receitasPorMes: Array<{ mes: string; valorConsultas: number; valorMensalidade: number; valorParticular: number; valorRenovacoes: number }>
  renovacoesPorMes: Array<{ mes: string; count: number; valor: number }>
  renovacoesPorEmpresa: Array<{ nome: string; count: number; valor: number }>
  receitasConsultaPorMes: Array<{ mes: string; count: number }>
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

const COLORS = ['#5BBD9B', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899', '#6366F1', '#84CC16', '#F97316']

// ============================================================
// SVG CHART COMPONENTS
// ============================================================

// ---- Donut Chart ----
interface DonutSlice { label: string; value: number; color: string }

function DonutChart({ slices, formatValue, centerLabel }: {
  slices: DonutSlice[]
  formatValue?: (v: number) => string
  centerLabel?: string
}) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-200">
        <BarChart2 className="w-10 h-10 mb-2" />
        <span className="text-xs text-gray-400">Sem dados no período</span>
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
    const OUTER = 78, INNER = 54
    const [ox1, oy1] = polarXY(startDeg, OUTER)
    const [ox2, oy2] = polarXY(endDeg, OUTER)
    const [ix2, iy2] = polarXY(endDeg, INNER)
    const [ix1, iy1] = polarXY(startDeg, INNER)
    const lg = span > 180 ? 1 : 0
    return `M${ox1},${oy1} A78,78 0 ${lg} 1 ${ox2},${oy2} L${ix2},${iy2} A54,54 0 ${lg} 0 ${ix1},${iy1}Z`
  }

  let cumDeg = 0
  const sectors = slices.map(s => {
    const deg = (s.value / total) * 360
    const start = cumDeg
    cumDeg += deg
    return { ...s, path: sectorPath(start, cumDeg) }
  })

  // Fix center label: se formatValue disponível, usa-o; senão arredonda
  const rawCenter = centerLabel ?? (formatValue ? formatValue(Math.round(total * 100) / 100) : String(Math.round(total)))
  const isCurrency = rawCenter.startsWith('R$')

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="-95 -95 190 190" className="w-48 h-48 drop-shadow-sm">
        {/* Track de fundo */}
        <circle cx="0" cy="0" r="78" fill="none" stroke="#F3F4F6" strokeWidth="24" />
        {sectors.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2.5" strokeLinejoin="round">
            <title>{s.label}: {formatValue ? formatValue(s.value) : s.value}</title>
          </path>
        ))}
        {/* Centro */}
        {isCurrency ? (
          <>
            <text x="0" y="-10" textAnchor="middle" fontSize="8" fill="#9CA3AF" letterSpacing="1" fontWeight="500">TOTAL</text>
            <text x="0" y="6" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1A3A2C">{rawCenter}</text>
          </>
        ) : (
          <>
            <text x="0" y="6" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1A3A2C">{rawCenter}</text>
            <text x="0" y="20" textAnchor="middle" fontSize="8" fill="#9CA3AF" letterSpacing="0.5">TOTAL</text>
          </>
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 max-w-xs">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />
            <span className="truncate max-w-[90px]" title={s.label}>{s.label}</span>
            <span className="font-bold" style={{ color: s.color }}>{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Vertical Bar Chart ----
function BarChartSVG({
  data, labelKey, valueKey, color = '#5BBD9B',
  formatValue = (v: number) => String(v),
  secondKey, secondColor = '#3B82F6', secondLabel, firstLabel,
}: {
  data: Record<string, any>[]
  labelKey: string
  valueKey: string
  color?: string
  formatValue?: (v: number) => string
  secondKey?: string
  secondColor?: string
  firstLabel?: string
  secondLabel?: string
}) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-40 text-gray-200 text-xs flex-col gap-2">
      <BarChart2 className="w-8 h-8" /><span className="text-gray-400">Sem dados no período</span>
    </div>
  }

  const W = 580, H = 230
  const PAD = { top: 28, right: 16, bottom: 56, left: 62 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...data.map(d => Math.max(d[valueKey] ?? 0, secondKey ? (d[secondKey] ?? 0) : 0)), 1)
  const n = data.length
  const slotW = plotW / n
  const barW = secondKey ? Math.min(slotW * 0.36, 26) : Math.min(slotW * 0.62, 52)
  const yTicks = 4

  // Gera ID único para gradiente
  const gradId = `barGrad_${color.replace('#', '')}`
  const grad2Id = `barGrad2_${(secondColor || '').replace('#', '')}`

  function fmtTick(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
    return v.toFixed(0)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
        {secondKey && (
          <linearGradient id={grad2Id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondColor} stopOpacity="1" />
            <stop offset="100%" stopColor={secondColor} stopOpacity="0.55" />
          </linearGradient>
        )}
      </defs>

      {/* Y grid + ticks */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const tv = (i / yTicks) * maxVal
        const y = PAD.top + plotH - (tv / maxVal) * plotH
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={i === 0 ? '#E5E7EB' : '#F3F4F6'} strokeWidth={i === 0 ? 1.5 : 1} strokeDasharray={i > 0 ? '4 4' : undefined} />
            <text x={PAD.left - 7} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">{fmtTick(tv)}</text>
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const cx = PAD.left + i * slotW + slotW / 2
        const v1 = d[valueKey] ?? 0
        const v2 = secondKey ? (d[secondKey] ?? 0) : 0
        const bh1 = Math.max(3, (v1 / maxVal) * plotH)
        const bh2 = secondKey ? Math.max(3, (v2 / maxVal) * plotH) : 0
        const x1 = secondKey ? cx - barW - 2 : cx - barW / 2
        const x2 = cx + 2
        const rawLabel = String(d[labelKey])
        const lbl = rawLabel.length > 9 ? rawLabel.slice(0, 8) + '…' : rawLabel

        return (
          <g key={i}>
            {/* Primary bar */}
            <rect x={x1} y={PAD.top + plotH - bh1} width={barW} height={bh1}
              fill={`url(#${gradId})`} rx="5" ry="5">
              <title>{rawLabel}: {formatValue(v1)}</title>
            </rect>
            {/* Topo sólido da barra principal */}
            <rect x={x1} y={PAD.top + plotH - bh1} width={barW} height={Math.min(bh1, 5)}
              fill={color} rx="5" ry="5" />
            {/* Secondary bar */}
            {secondKey && (
              <>
                <rect x={x2} y={PAD.top + plotH - bh2} width={barW} height={bh2}
                  fill={`url(#${grad2Id})`} rx="5" ry="5">
                  <title>{rawLabel} ({secondLabel}): {v2}</title>
                </rect>
                <rect x={x2} y={PAD.top + plotH - bh2} width={barW} height={Math.min(bh2, 5)}
                  fill={secondColor} rx="5" ry="5" />
              </>
            )}
            {/* X label */}
            <text x={cx} y={PAD.top + plotH + 16} textAnchor="middle" fontSize="9.5" fill="#6B7280" fontFamily="system-ui"
              transform={n > 7 ? `rotate(-35,${cx},${PAD.top + plotH + 16})` : ''}>
              {lbl}
            </text>
          </g>
        )
      })}

      {/* X axis line */}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1.5" />
    </svg>
  )
}

// ---- Horizontal Bar Chart ----
function HBarChart({
  data, labelKey, valueKey,
  color = '#5BBD9B',
  formatValue = (v: number) => String(v),
  maxItems = 10,
}: {
  data: Record<string, any>[]
  labelKey: string
  valueKey: string
  color?: string
  formatValue?: (v: number) => string
  maxItems?: number
}) {
  const items = data.slice(0, maxItems)
  if (!items.length) {
    return <div className="flex items-center justify-center h-16 text-gray-300 text-xs flex-col gap-1">
      <BarChart2 className="w-6 h-6" /><span className="text-gray-400">Sem dados no período</span>
    </div>
  }

  const maxVal = Math.max(...items.map(d => d[valueKey] ?? 0), 1)
  const ROW = 42
  const W = 520
  const LABEL_W = 170
  const BAR_AREA = 260
  const H = items.length * ROW + 6
  const gradId = `hbarGrad_${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {items.map((d, i) => {
        const val = d[valueKey] ?? 0
        const bw = Math.max(6, (val / maxVal) * BAR_AREA)
        const y = i * ROW
        const label = String(d[labelKey])
        const truncated = label.length > 26 ? label.slice(0, 24) + '…' : label
        const isTop = i === 0
        const pct = Math.round((val / maxVal) * 100)

        return (
          <g key={i}>
            {/* Highlight row for #1 */}
            {isTop && <rect x={0} y={y + 3} width={W} height={ROW - 6} fill={`${color}12`} rx="6" />}
            {/* Label */}
            <text x={4} y={y + ROW / 2 + 4.5} fontSize="10" fill={isTop ? '#1A3A2C' : '#374151'}
              fontWeight={isTop ? '700' : '400'} fontFamily="system-ui">
              {isTop ? `🥇 ${truncated}` : truncated}
            </text>
            {/* Track */}
            <rect x={LABEL_W} y={y + 11} width={BAR_AREA} height={18} fill="#F3F4F6" rx="9" />
            {/* Bar */}
            <rect x={LABEL_W} y={y + 11} width={bw} height={18} fill={`url(#${gradId})`} rx="9">
              <title>{d[labelKey]}: {formatValue(val)}</title>
            </rect>
            {/* Value label */}
            <text x={LABEL_W + bw + 8} y={y + ROW / 2 + 4.5} fontSize="9.5" fill="#6B7280" fontFamily="system-ui">
              {formatValue(val)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---- Line Chart ----
function LineChartSVG({
  data, labelKey, valueKey,
  color = '#3B82F6',
  formatValue = (v: number) => String(v),
}: {
  data: Record<string, any>[]
  labelKey: string
  valueKey: string
  color?: string
  formatValue?: (v: number) => string
}) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-40 text-gray-200 text-xs flex-col gap-2">
      <BarChart2 className="w-8 h-8" /><span className="text-gray-400">Sem dados no período</span>
    </div>
  }

  const W = 580, H = 210
  const PAD = { top: 24, right: 20, bottom: 46, left: 56 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const n = data.length
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const yTicks = 4

  const pts = data.map((d, i) => ({
    x: PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW),
    y: PAD.top + plotH - ((d[valueKey] ?? 0) / maxVal) * plotH,
    label: String(d[labelKey]),
    value: d[valueKey] ?? 0,
  }))

  // Smooth bezier path
  function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return `M${points[0].x},${points[0].y}`
    let d = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }
    return d
  }

  const linePath = smoothPath(pts)
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${PAD.top + plotH} L${pts[0].x},${PAD.top + plotH}Z`
  const gradId = `lineGrad_${color.replace('#', '')}`

  function fmtTick(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
    return v.toFixed(0)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="85%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const tv = (i / yTicks) * maxVal
        const y = PAD.top + plotH - (tv / maxVal) * plotH
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={i === 0 ? '#E5E7EB' : '#F3F4F6'} strokeWidth={i === 0 ? 1.5 : 1} strokeDasharray={i > 0 ? '4 4' : undefined} />
            <text x={PAD.left - 7} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">{fmtTick(tv)}</text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Smooth line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="6" fill={`${color}20`} />
          <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2.5">
            <title>{p.label}: {formatValue(p.value)}</title>
          </circle>
        </g>
      ))}

      {/* X labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={PAD.top + plotH + 18} textAnchor="middle" fontSize="9.5" fill="#9CA3AF" fontFamily="system-ui">
          {p.label.length > 7 ? p.label.slice(0, 6) : p.label}
        </text>
      ))}

      <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1.5" />
    </svg>
  )
}

// ---- Titular Table ----
function TitularTableAdmin({ titulares }: { titulares: TitularItemAdmin[] }) {
  const [expandido, setExpandido] = useState<number | null>(null)

  function fmtBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (!titulares.length) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-300 text-sm">
        Nenhuma consulta no período selecionado
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
            <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Empresa</th>
            <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Registro</th>
            <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Próprias</th>
            <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Depend.</th>
            <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Total</th>
            <th className="text-right text-xs text-gray-400 font-medium pb-2">Custo Total</th>
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
                <td className="py-2.5 pr-3 text-xs text-gray-500">{t.empresa}</td>
                <td className="py-2.5 pr-3 text-xs text-gray-500 font-mono">{t.registroFuncional !== '—' ? t.registroFuncional : '—'}</td>
                <td className="py-2.5 pr-3 text-sm text-right text-gray-600">{t.consultasProprias}</td>
                <td className="py-2.5 pr-3 text-sm text-right">
                  {t.consultasDependentes > 0
                    ? <span className="text-blue-600 font-medium">{t.consultasDependentes}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="py-2.5 pr-3 text-sm text-right font-semibold text-[#1A3A2C]">{t.totalConsultas}</td>
                <td className="py-2.5 text-sm text-right">
                  <div className="font-bold text-[#1A3A2C]">{fmtBRL(t.totalValor)}</div>
                  {t.valorDependentes > 0 && (
                    <div className="text-xs text-blue-500">{fmtBRL(t.valorDependentes)} dep.</div>
                  )}
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
                  <td className="py-2 pr-3 text-sm text-right text-gray-400">—</td>
                  <td className="py-2 pr-3 text-sm text-right text-blue-600 font-medium">{dep.consultas}</td>
                  <td className="py-2 pr-3 text-sm text-right text-blue-600 font-medium">{dep.consultas}</td>
                  <td className="py-2 text-sm text-right text-blue-600 font-semibold">{fmtBRL(dep.valor)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-3">* Clique em uma linha para ver os dependentes. O custo total do titular inclui suas próprias consultas e as dos seus dependentes.</p>
    </div>
  )
}

// ---- Grouped Bar Chart ----
function GroupedBarChart({
  data, labelKey, keys, colors, labels, formatValue = (v: number) => String(v),
}: {
  data: Record<string, any>[]
  labelKey: string
  keys: string[]
  colors: string[]
  labels?: string[]
  formatValue?: (v: number) => string
}) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-200 text-xs flex-col gap-2">
    <BarChart2 className="w-8 h-8" /><span className="text-gray-400">Sem dados no período</span>
  </div>

  const W = 580, H = 230
  const PAD = { top: 28, right: 16, bottom: 56, left: 50 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k] ?? 0)), 1)
  const n = data.length
  const groupW = plotW / n
  const barW = Math.min((groupW * 0.78) / keys.length, 22)
  const gap = 2
  const totalBarsW = barW * keys.length + gap * (keys.length - 1)
  const groupOffset = (groupW - totalBarsW) / 2

  function fmtTick(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
    return v.toFixed(0)
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          {colors.map((c, i) => (
            <linearGradient key={i} id={`grpGrad_${i}_${c.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity="1" />
              <stop offset="100%" stopColor={c} stopOpacity="0.5" />
            </linearGradient>
          ))}
        </defs>
        {Array.from({ length: 5 }, (_, i) => {
          const tv = (i / 4) * maxVal
          const y = PAD.top + plotH - (tv / maxVal) * plotH
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke={i === 0 ? '#E5E7EB' : '#F3F4F6'} strokeWidth={i === 0 ? 1.5 : 1} strokeDasharray={i > 0 ? '4 4' : undefined} />
              <text x={PAD.left - 7} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">{fmtTick(tv)}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const gx = PAD.left + i * groupW + groupOffset
          const rawLabel = String(d[labelKey])
          const lbl = rawLabel.length > 8 ? rawLabel.slice(0, 7) + '…' : rawLabel
          const cx = PAD.left + i * groupW + groupW / 2
          return (
            <g key={i}>
              {keys.map((k, ki) => {
                const v = d[k] ?? 0
                const bh = Math.max(3, (v / maxVal) * plotH)
                const bx = gx + ki * (barW + gap)
                const gradId = `grpGrad_${ki}_${(colors[ki] || '').replace('#', '')}`
                return (
                  <g key={ki}>
                    <rect x={bx} y={PAD.top + plotH - bh} width={barW} height={bh}
                      fill={`url(#${gradId})`} rx="4" ry="4">
                      <title>{rawLabel} · {labels?.[ki] ?? k}: {formatValue(v)}</title>
                    </rect>
                    <rect x={bx} y={PAD.top + plotH - bh} width={barW} height={Math.min(bh, 4)}
                      fill={colors[ki] || '#9CA3AF'} rx="4" ry="4" />
                  </g>
                )
              })}
              <text x={cx} y={PAD.top + plotH + 16} textAnchor="middle" fontSize="9.5" fill="#6B7280" fontFamily="system-ui"
                transform={n > 6 ? `rotate(-35,${cx},${PAD.top + plotH + 16})` : ''}>
                {lbl}
              </text>
            </g>
          )
        })}
        <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-center gap-5 mt-2">
        {keys.map((k, i) => (
          <div key={k} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: colors[i] }}>
            <span className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: colors[i] }} />
            {labels?.[i] ?? (k.charAt(0).toUpperCase() + k.slice(1))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Chart Card ----
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

// ---- KPI Card ----
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
// EXPORT HELPERS
// ============================================================
async function exportarExcel(data: DashboardData, setLoading: (v: boolean) => void) {
  setLoading(true)
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const kpiRows = [
      ['Métrica', 'Valor'],
      ['Total Geral (Consultas + Mensalidades + Renovações)', formatBRL(data.kpis.totalGeral)],
      ['Faturamento Consultas', formatBRL(data.kpis.totalFaturamento)],
      ['Mensalidades', formatBRL(data.kpis.totalMensalidades)],
      ['Renovações de Receita (qtd)', data.kpis.totalRenovacoes],
      ['Renovações de Receita (valor)', formatBRL(data.kpis.totalGastosRenovacoes)],
      ['Receitas em Consulta (sem custo)', data.kpis.totalReceitasEmConsulta],
      ['Consultas Realizadas', data.kpis.totalConsultas],
      ['Ticket Médio', formatBRL(data.kpis.ticketMedio)],
      ['Empresas Ativas', data.kpis.totalEmpresasAtivas],
      ['Médicos com Consultas', data.kpis.totalMedicos],
      ['Consultas Particulares', data.kpis.consultasParticulares],
      ['Receita Particular', formatBRL(data.kpis.valorParticular)],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPIs')

    const mesRows = [
      ['Mês', 'Consultas', 'Faturamento (R$)'],
      ...data.faturamentoPorMes.map(r => [formatMes(r.mes), r.consultas, r.valor]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mesRows), 'Por Mês')

    const empRows = [
      ['Empresa', 'Func. Ativos', 'Consultas', 'Val. Consultas (R$)', 'Mensalidade (R$)', 'Total (R$)'],
      ...data.faturamentoPorEmpresa.map(r => [r.nome, r.funcionariosAtivos, r.consultas, r.valorConsultas, r.mensalidade, r.valorConsultas + r.mensalidade]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(empRows), 'Por Empresa')

    const medRows = [
      ['Médico', 'Especialidade', 'Consultas', 'Faturamento (R$)'],
      ...data.faturamentoPorMedico.map(r => [r.nome, r.especialidade, r.consultas, r.valor]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(medRows), 'Por Médico')

    const idadeRows = [
      ['Faixa Etária', 'Consultas', 'Faturamento (R$)'],
      ...data.faturamentoPorFaixaEtaria.map(r => [r.faixa, r.consultas, r.valor]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(idadeRows), 'Por Faixa Etária')

    const sexoRows = [
      ['Sexo', 'Consultas', 'Faturamento (R$)'],
      ...data.faturamentoPorSexo.map(r => [r.sexo, r.consultas, r.valor]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sexoRows), 'Por Sexo')

    const statusRows = [
      ['Status', 'Quantidade'],
      ...data.consultasPorStatus.map(r => [labelStatus(r.status), r.count]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statusRows), 'Status Agendamentos')

    const funcRows = [
      ['Empresa', 'Funcionários Ativos', 'Consultas', 'Taxa Utilização (%)'],
      ...data.funcionariosPorEmpresa.map(r => [
        r.nome, r.funcionarios, r.consultas,
        r.funcionarios > 0 ? +((r.consultas / r.funcionarios) * 100).toFixed(1) : 0,
      ]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(funcRows), 'Funcionários x Consultas')

    const pacRows = [
      ['Paciente', 'Empresa', 'Consultas', 'Total Gasto (R$)'],
      ...data.topPacientes.map(r => [r.nome, r.empresa, r.consultas, r.valor]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pacRows), 'Top Pacientes')

    if ((data.renovacoesPorMes ?? []).length > 0) {
      const renovMesRows = [
        ['Mês', 'Renovações (qtd)', 'Valor Total (R$)'],
        ...(data.renovacoesPorMes ?? []).map(r => [formatMes(r.mes), r.count, r.valor]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(renovMesRows), 'Renovações por Mês')
    }

    if ((data.renovacoesPorEmpresa ?? []).length > 0) {
      const renovEmpRows = [
        ['Empresa', 'Renovações (qtd)', 'Valor Total (R$)'],
        ...(data.renovacoesPorEmpresa ?? []).map(r => [r.nome, r.count, r.valor]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(renovEmpRows), 'Renovações por Empresa')
    }

    if ((data.receitasConsultaPorMes ?? []).length > 0) {
      const rxConsRows = [
        ['Mês', 'Receitas em Consultas (qtd)'],
        ...(data.receitasConsultaPorMes ?? []).map(r => [formatMes(r.mes), r.count]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rxConsRows), 'Receitas em Consulta')
    }

    XLSX.writeFile(wb, `dashboard-admin-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } finally {
    setLoading(false)
  }
}

function exportarPDF(data: DashboardData) {
  const k = data.kpis

  const tableStyle = `
    width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px;
  `
  const thStyle = `background:#1A3A2C;color:white;padding:6px 8px;text-align:left;font-size:10px;`
  const tdStyle = `padding:5px 8px;border-bottom:1px solid #F0F0F0;`

  function table(headers: string[], rows: string[][]): string {
    return `<table style="${tableStyle}">
      <tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr>
      ${rows.map((r, i) => `<tr>${r.map(c => `<td style="${tdStyle}${i % 2 === 1 ? 'background:#FAFAFA;' : ''}">${c}</td>`).join('')}</tr>`).join('')}
    </table>`
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Dashboard Admin — RovarisMed</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;color:#1A3A2C;background:#f8f8f8;padding:28px}
  h1{font-size:22px;font-weight:bold}
  .sub{color:#6B7280;font-size:12px;margin-bottom:24px;margin-top:3px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
  .kpi{background:white;border-radius:10px;padding:13px 16px;border:1px solid #E5E7EB}
  .kpi-label{font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px}
  .kpi-value{font-size:18px;font-weight:bold;margin-top:3px}
  .kpi.highlight{background:#1A3A2C;border-color:#1A3A2C}
  .kpi.highlight .kpi-label{color:#86EFAC}
  .kpi.highlight .kpi-value{color:white}
  section{margin-bottom:22px;page-break-inside:avoid}
  h2{font-size:13px;font-weight:bold;border-bottom:2px solid #5BBD9B;padding-bottom:6px;margin-bottom:10px}
  .total-row td{font-weight:bold!important;background:#F0FAF6!important}
  @media print{body{background:white;padding:0}@page{margin:14mm;size:A4}}
</style>
</head>
<body>
<h1>📊 Dashboard Administrativo — RovarisMed</h1>
<p class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>

<div class="kpis">
  <div class="kpi highlight">
    <div class="kpi-label">Total Geral (Consultas + Mensalidades + Renovações)</div>
    <div class="kpi-value">${formatBRL(k.totalGeral)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Consultas</div>
    <div class="kpi-value">${formatBRL(k.totalFaturamento)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Mensalidades</div>
    <div class="kpi-value">${formatBRL(k.totalMensalidades)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Renovações de Receita</div>
    <div class="kpi-value">${formatBRL(k.totalGastosRenovacoes)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Renovações (qtd)</div>
    <div class="kpi-value">${k.totalRenovacoes}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Receitas em Consulta</div>
    <div class="kpi-value">${k.totalReceitasEmConsulta}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Consultas Realizadas</div>
    <div class="kpi-value">${k.totalConsultas}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Ticket Médio</div>
    <div class="kpi-value">${formatBRL(k.ticketMedio)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Receita Particular</div>
    <div class="kpi-value">${formatBRL(k.valorParticular)}</div>
  </div>
</div>

<section>
  <h2>Faturamento por Mês</h2>
  ${table(['Mês', 'Consultas', 'Faturamento'], data.faturamentoPorMes.map(r => [formatMes(r.mes), String(r.consultas), formatBRL(r.valor)]))}
</section>

<section>
  <h2>Faturamento por Empresa</h2>
  ${table(
    ['Empresa', 'Func. Ativos', 'Consultas', 'Val. Consultas', 'Mensalidade', 'Total'],
    [
      ...data.faturamentoPorEmpresa.map(r => [r.nome, String(r.funcionariosAtivos), String(r.consultas), formatBRL(r.valorConsultas), formatBRL(r.mensalidade), formatBRL(r.valorConsultas + r.mensalidade)]),
      ['<strong>TOTAL</strong>', '', String(data.faturamentoPorEmpresa.reduce((s, r) => s + r.consultas, 0)), formatBRL(data.faturamentoPorEmpresa.reduce((s, r) => s + r.valorConsultas, 0)), formatBRL(data.faturamentoPorEmpresa.reduce((s, r) => s + r.mensalidade, 0)), `<strong>${formatBRL(data.faturamentoPorEmpresa.reduce((s, r) => s + r.valorConsultas + r.mensalidade, 0))}</strong>`],
    ]
  )}
</section>

<section>
  <h2>Faturamento por Médico</h2>
  ${table(['Médico', 'Especialidade', 'Consultas', 'Faturamento'], data.faturamentoPorMedico.map(r => [r.nome, r.especialidade, String(r.consultas), formatBRL(r.valor)]))}
</section>

<section>
  <h2>Por Faixa Etária</h2>
  ${table(['Faixa Etária', 'Consultas', 'Faturamento'], data.faturamentoPorFaixaEtaria.map(r => [r.faixa, String(r.consultas), formatBRL(r.valor)]))}
</section>

<section>
  <h2>Por Sexo</h2>
  ${table(['Sexo', 'Consultas', 'Faturamento'], data.faturamentoPorSexo.map(r => [r.sexo, String(r.consultas), formatBRL(r.valor)]))}
</section>

<section>
  <h2>Status dos Agendamentos</h2>
  ${table(['Status', 'Quantidade'], data.consultasPorStatus.map(r => [labelStatus(r.status), String(r.count)]))}
</section>

<section>
  <h2>Funcionários × Consultas por Empresa</h2>
  ${table(['Empresa', 'Funcionários', 'Consultas', 'Taxa de Utilização'], data.funcionariosPorEmpresa.map(r => [r.nome, String(r.funcionarios), String(r.consultas), r.funcionarios > 0 ? ((r.consultas / r.funcionarios) * 100).toFixed(1) + '%' : '—']))}
</section>

<section>
  <h2>Top Pacientes por Gasto</h2>
  ${table(['Paciente', 'Empresa / Particular', 'Consultas', 'Total Gasto'], data.topPacientes.map(r => [r.nome, r.empresa, String(r.consultas), formatBRL(r.valor)]))}
</section>

<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const STATUS_COLORS: Record<string, string> = {
  confirmado: '#5BBD9B', concluido: '#1A3A2C',
  cancelado: '#EF4444', reagendado: '#F59E0B',
  pendente: '#9CA3AF', agendado: '#3B82F6',
}

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  // Filtros — padrão: 1º do mês corrente até hoje
  const [inicio, setInicio] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  })
  const [fim, setFim] = useState(() => new Date().toISOString().split('T')[0])

  const carregar = useCallback(async (ini: string, fi: string) => {
    setLoading(true)
    try {
      const i = `${ini}T00:00:00Z`
      const f = `${fi}T23:59:59Z`
      const res = await fetch(`/api/admin/dashboard?inicio=${encodeURIComponent(i)}&fim=${encodeURIComponent(f)}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar(inicio, fim) }, [inicio, fim, carregar])

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Carregando analytics...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <BarChart2 className="w-10 h-10 opacity-30" />
        <p className="text-sm">Erro ao carregar dados.</p>
        <button onClick={() => carregar(inicio, fim)} className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  const { kpis } = data

  return (
    <div className="space-y-6">

      {/* ---- Filter bar ---- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-[#5BBD9B]" />
          <span className="text-xs font-semibold text-[#1A3A2C] uppercase tracking-wide">Filtros</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => exportarExcel(data, setExportandoExcel)}
              disabled={exportandoExcel}
              className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {exportandoExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Excel
            </button>
            <button
              onClick={() => exportarPDF(data)}
              className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={() => carregar(inicio, fim)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A3A2C] border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data início</label>
            <input
              type="date" value={inicio} onChange={e => setInicio(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data fim</label>
            <input
              type="date" value={fim} onChange={e => setFim(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-gray-700"
            />
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
          <span className="text-xs text-[#5BBD9B] font-semibold">Período:</span>
          <span className="text-xs text-gray-500">{fmtDate(inicio)} – {fmtDate(fim)}</span>
        </div>
      </div>

      {/* ---- KPIs ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Geral" value={formatBRL(kpis.totalGeral)} sub="consultas + mensalidades + renovações" icon={DollarSign} color="#5BBD9B" highlight />
        <KpiCard label="Faturamento Consultas" value={formatBRL(kpis.totalFaturamento)} sub={`${kpis.totalConsultas} realizadas`} icon={Activity} color="#3B82F6" />
        <KpiCard label="Mensalidades" value={formatBRL(kpis.totalMensalidades)} sub={`${kpis.totalEmpresasAtivas} empresas`} icon={Building2} color="#8B5CF6" />
        <KpiCard label="Renovações de Receita" value={formatBRL(kpis.totalGastosRenovacoes)} sub={`${kpis.totalRenovacoes} emitidas`} icon={Receipt} color="#F97316" />
        <KpiCard label="Ticket Médio" value={formatBRL(kpis.ticketMedio)} sub="por consulta" icon={TrendingUp} color="#F59E0B" />
        <KpiCard label="Médicos Ativos" value={String(kpis.totalMedicos)} sub="com consultas no período" icon={UserCheck} color="#14B8A6" />
        <KpiCard label="Particular" value={formatBRL(kpis.valorParticular)} sub={`${kpis.consultasParticulares} consultas`} icon={Users} color="#EC4899" />
        <KpiCard label="Receitas em Consulta" value={String(kpis.totalReceitasEmConsulta)} sub="sem custo adicional" icon={Receipt} color="#14B8A6" />
      </div>

      {/* ---- Row 1: Faturamento por mês + Status ---- */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Faturamento por Mês" subtitle="Receita de consultas concluídas">
            <BarChartSVG
              data={data.faturamentoPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="valor" color="#5BBD9B" formatValue={formatBRL}
            />
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
          <ChartCard title="Consultas por Mês" subtitle="Volume de atendimentos concluídos">
            <LineChartSVG
              data={data.faturamentoPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="consultas" color="#3B82F6"
              formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
            />
          </ChartCard>
        </div>
        <ChartCard title="Tipo de Consulta" subtitle="Agendada vs. Fila / Hora">
          <DonutChart
            slices={data.consultasPorTipo.filter(d => d.count > 0).map((d, i) => ({
              label: d.tipo,
              value: d.count,
              color: ['#3B82F6', '#F59E0B'][i] || COLORS[i],
            }))}
          />
        </ChartCard>
      </div>

      {/* ---- Row 2b: Receitas separadas por tipo ---- */}
      {data.receitasPorMes && data.receitasPorMes.length > 0 && (
        <>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Receita de Consultas por Mês" subtitle="Faturamento de consultas (usando preço configurado por empresa)">
                <BarChartSVG
                  data={data.receitasPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
                  labelKey="mes" valueKey="valorConsultas" color="#3B82F6" formatValue={formatBRL}
                />
              </ChartCard>
            </div>
            <ChartCard title="Composição da Receita" subtitle="Consultas + Mensalidades + Renovações no período">
              <DonutChart
                slices={[
                  { label: 'Consultas', value: data.receitasPorMes.reduce((s, d) => s + d.valorConsultas, 0), color: '#3B82F6' },
                  { label: 'Mensalidades', value: data.receitasPorMes.reduce((s, d) => s + d.valorMensalidade, 0), color: '#8B5CF6' },
                  { label: 'Renovações', value: data.receitasPorMes.reduce((s, d) => s + (d.valorRenovacoes ?? 0), 0), color: '#F97316' },
                  ...(data.receitasPorMes.reduce((s, d) => s + d.valorParticular, 0) > 0
                    ? [{ label: 'Particular', value: data.receitasPorMes.reduce((s, d) => s + d.valorParticular, 0), color: '#EC4899' }]
                    : []),
                ].filter(s => s.value > 0)}
                formatValue={formatBRL}
              />
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Receita de Mensalidades por Mês" subtitle="Fee mensal de todas as empresas ativas (mesmo valor por mês)">
                <BarChartSVG
                  data={data.receitasPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
                  labelKey="mes" valueKey="valorMensalidade" color="#8B5CF6" formatValue={formatBRL}
                />
              </ChartCard>
            </div>
            <ChartCard title="Receita Particular por Mês" subtitle="Faturamento de pacientes sem empresa vinculada">
              <BarChartSVG
                data={data.receitasPorMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
                labelKey="mes" valueKey="valorParticular" color="#EC4899" formatValue={formatBRL}
              />
            </ChartCard>
          </div>

          {/* Renovações de Receita */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Renovações de Receita por Mês" subtitle="Receitas emitidas fora de consultas — têm custo para a empresa">
                <BarChartSVG
                  data={(data.renovacoesPorMes ?? []).map(d => ({ ...d, mes: formatMes(d.mes) }))}
                  labelKey="mes" valueKey="valor" color="#F97316" formatValue={formatBRL}
                />
              </ChartCard>
            </div>
            <ChartCard title="Receitas em Consulta por Mês" subtitle="Emitidas durante atendimento — sem custo adicional">
              <BarChartSVG
                data={(data.receitasConsultaPorMes ?? []).map(d => ({ ...d, mes: formatMes(d.mes) }))}
                labelKey="mes" valueKey="count" color="#14B8A6"
                formatValue={v => `${v} receita${v !== 1 ? 's' : ''}`}
              />
            </ChartCard>
          </div>

          {(data.renovacoesPorEmpresa ?? []).length > 0 && (
            <ChartCard title="Renovações de Receita por Empresa" subtitle="Total cobrado por empresa no período">
              <HBarChart
                data={data.renovacoesPorEmpresa ?? []}
                labelKey="nome" valueKey="valor" formatValue={formatBRL} color="#F97316"
              />
            </ChartCard>
          )}
        </>
      )}

      {/* ---- Row 3: Por empresa + Sexo ---- */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Faturamento por Empresa" subtitle="Consultas + Mensalidade no período">
            <HBarChart
              data={data.faturamentoPorEmpresa.map(d => ({ ...d, total: d.valorConsultas + d.mensalidade }))}
              labelKey="nome" valueKey="total" formatValue={formatBRL} color="#5BBD9B"
            />
          </ChartCard>
        </div>
        <ChartCard title="Receita por Sexo" subtitle="Distribuição do faturamento">
          <DonutChart
            slices={data.faturamentoPorSexo.filter(d => d.valor > 0).map((d, i) => ({
              label: d.sexo,
              value: d.valor,
              color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF',
            }))}
            formatValue={formatBRL}
          />
        </ChartCard>
      </div>

      {/* ---- Row 4: Por médico (faturamento) ---- */}
      <ChartCard title="Faturamento por Médico" subtitle="Receita gerada por cada médico no período">
        <HBarChart
          data={data.faturamentoPorMedico}
          labelKey="nome" valueKey="valor" formatValue={formatBRL} color="#8B5CF6"
        />
      </ChartCard>

      {/* ---- Row 5: Por médico (consultas) ---- */}
      <ChartCard title="Consultas por Médico" subtitle="Volume de atendimentos concluídos por médico">
        <HBarChart
          data={[...data.faturamentoPorMedico]
            .sort((a, b) => {
              if (b.consultas !== a.consultas) return b.consultas - a.consultas
              return a.nome.localeCompare(b.nome)
            })
            .map(d => ({ nome: d.nome, consultas: d.consultas }))}
          labelKey="nome" valueKey="consultas"
          formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
          color="#14B8A6"
        />
      </ChartCard>

      {/* ---- Row 6: Faixa etária + Funcionários × Consultas ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Faturamento por Faixa Etária" subtitle="Receita segmentada por idade dos pacientes">
          <BarChartSVG
            data={data.faturamentoPorFaixaEtaria}
            labelKey="faixa" valueKey="valor" formatValue={formatBRL} color="#F59E0B"
          />
        </ChartCard>

        <ChartCard title="Funcionários × Consultas por Empresa" subtitle="Comparativo de força de trabalho e utilização">
          <BarChartSVG
            data={data.funcionariosPorEmpresa}
            labelKey="nome"
            valueKey="funcionarios"
            secondKey="consultas"
            color="#1A3A2C"
            secondColor="#5BBD9B"
            firstLabel="Funcionários"
            secondLabel="Consultas"
          />
          <div className="flex gap-5 justify-center mt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm inline-block bg-[#1A3A2C]" /> Funcionários
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-sm inline-block bg-[#5BBD9B]" /> Consultas
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ---- Row 7: Consultas por faixa etária ---- */}
      <ChartCard title="Consultas por Faixa Etária" subtitle="Volume de atendimentos por grupo de idade">
        <BarChartSVG
          data={data.faturamentoPorFaixaEtaria}
          labelKey="faixa" valueKey="consultas"
          formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
          color="#6366F1"
        />
      </ChartCard>

      {/* ---- Row 8: Top pacientes ---- */}
      <ChartCard title="Top 10 Pacientes por Gasto" subtitle="Maiores utilizadores do sistema no período">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">#</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">Paciente</th>
                <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">Empresa</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-4">Consultas</th>
                <th className="text-right text-xs text-gray-400 font-medium pb-2">Total Gasto</th>
              </tr>
            </thead>
            <tbody>
              {data.topPacientes.map((p, i) => (
                <tr key={i} className={`border-b border-gray-50 ${i === 0 ? 'bg-amber-50' : ''}`}>
                  <td className="py-2.5 pr-4 text-xs text-gray-400 font-medium">{i + 1}</td>
                  <td className="py-2.5 pr-4 text-sm font-medium text-[#1A3A2C]">{p.nome}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{p.empresa}</td>
                  <td className="py-2.5 pr-4 text-sm text-right text-gray-600">{p.consultas}</td>
                  <td className="py-2.5 text-sm text-right font-semibold text-[#1A3A2C]">{formatBRL(p.valor)}</td>
                </tr>
              ))}
              {data.topPacientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-300 text-sm">Sem dados no período</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ===== SEÇÃO: FUNCIONÁRIOS & DEPENDENTES (visão global) ===== */}
      <div className="border-t-2 border-[#5BBD9B] pt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-[#1A3A2C] rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-[#5BBD9B]" />
          </div>
          <div>
            <h2 className="font-bold text-[#1A3A2C] text-base">Funcionários & Dependentes — Visão Global</h2>
            <p className="text-xs text-gray-400">Consolidado de todas as empresas: distribuição de vínculos e utilização por tipo de beneficiário</p>
          </div>
        </div>

        {/* KPI cards por categoria */}
        {data.distribuicaoRelacaoGlobal && data.distribuicaoRelacaoGlobal.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {data.distribuicaoRelacaoGlobal.map(r => (
              <div key={r.categoria} className={`rounded-2xl p-4 border-2 ${r.categoria === 'Funcionário' ? 'border-[#5BBD9B] bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${r.categoria === 'Funcionário' ? 'text-[#1A3A2C]' : 'text-blue-700'}`}>
                  {r.categoria}
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
                  <p className="text-xs text-gray-400">{r.pacientesAtivos} ativaram app</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Donuts: Composição e Consultas */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="Composição Global da Base" subtitle="Funcionários vs Dependentes em todas as empresas">
            <DonutChart
              slices={(data.distribuicaoRelacaoGlobal ?? []).filter(d => d.cadastros > 0).map(d => ({
                label: d.categoria,
                value: d.cadastros,
                color: d.categoria === 'Funcionário' ? '#5BBD9B' : '#3B82F6',
              }))}
              formatValue={v => `${v} cadastros`}
              centerLabel={String((data.distribuicaoRelacaoGlobal ?? []).reduce((s, r) => s + r.cadastros, 0))}
            />
          </ChartCard>
          <ChartCard title="Consultas por Relação (Global)" subtitle="Distribuição de atendimentos no período">
            <DonutChart
              slices={(data.distribuicaoRelacaoGlobal ?? []).filter(d => d.consultas > 0).map(d => ({
                label: d.categoria,
                value: d.consultas,
                color: d.categoria === 'Funcionário' ? '#1A3A2C' : '#3B82F6',
              }))}
              formatValue={v => `${v} consultas`}
            />
          </ChartCard>
        </div>

        {/* Consultas por mês: funcionários vs dependentes */}
        {data.consultasRelacaoPorMesGlobal && data.consultasRelacaoPorMesGlobal.length > 0 && (
          <ChartCard title="Consultas por Mês — Funcionários vs Dependentes" subtitle="Evolução mensal de atendimentos por tipo de beneficiário" className="mb-6">
            <GroupedBarChart
              data={data.consultasRelacaoPorMesGlobal.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes"
              keys={['funcionarios', 'dependentes']}
              colors={['#5BBD9B', '#3B82F6']}
              labels={['Funcionários', 'Dependentes']}
              formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
            />
          </ChartCard>
        )}

        {/* Tabela de detalhamento por tipo exato de relação */}
        <ChartCard title="Detalhamento por Tipo de Vínculo (Global)" subtitle="Consolidado de todas as empresas — consultas e cadastros por tipo de relação" className="mb-6">
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
                {(data.detalheRelacaoGlobal ?? []).map((r, i) => (
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
                {(!data.detalheRelacaoGlobal || data.detalheRelacaoGlobal.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-300 text-sm">
                      Sem dados de relação cadastrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Custo por Titular — global */}
        <ChartCard title="Custo por Titular — Todas as Empresas" subtitle="Funcionário titular e seus dependentes; clique para expandir e ver o detalhamento">
          <TitularTableAdmin titulares={data.gastosPorTitularGlobal ?? []} />
        </ChartCard>
      </div>

    </div>
  )
}
