'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, Stethoscope, DollarSign, FileText, ClipboardList,
  FlaskConical, Loader2, RefreshCw, Search, ChevronDown, ChevronUp,
  TrendingDown, TrendingUp, Receipt,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface ProdRow {
  medico_id: string
  nome: string
  especialidade: string
  crm: string
  consultas: number
  faturamento: number
  custo_consulta: number
  custo: number
  margem: number
  atestados: number
  receitas: number
  renovacoes: number
  receitas_em_consulta: number
  gasto_renovacoes: number
  exames: number
}

interface EspRow {
  especialidade: string
  consultas: number
  faturamento: number
  medicos: number
}

interface MesRow {
  mes: string
  consultas: number
  faturamento: number
  atestados: number
  receitas: number
  renovacoes: number
  receitas_em_consulta: number
}

interface Totais {
  consultas: number
  faturamento: number
  custo: number
  margem: number
  atestados: number
  receitas: number
  renovacoes: number
  receitas_em_consulta: number
  gastos_renovacoes: number
  exames: number
}

interface MedicoBasic {
  id: string
  nome: string
  especialidade: string
}

interface ProducaoData {
  medicos: MedicoBasic[]
  especialidades: string[]
  producao: ProdRow[]
  porEspecialidade: EspRow[]
  porMes: MesRow[]
  totais: Totais
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

const COLORS = ['#5BBD9B', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899', '#6366F1', '#84CC16', '#F97316']

// ============================================================
// SVG CHART COMPONENTS (inline, same style as DashboardClient)
// ============================================================

function DonutChart({ slices, formatValue, centerLabel }: {
  slices: { label: string; value: number; color: string }[]
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

  const rawCenter = centerLabel ?? (formatValue ? formatValue(Math.round(total * 100) / 100) : String(Math.round(total)))
  const isCurrency = rawCenter.startsWith('R$')

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="-95 -95 190 190" className="w-48 h-48 drop-shadow-sm">
        <circle cx="0" cy="0" r="78" fill="none" stroke="#F3F4F6" strokeWidth="24" />
        {sectors.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2.5" strokeLinejoin="round">
            <title>{s.label}: {formatValue ? formatValue(s.value) : s.value}</title>
          </path>
        ))}
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
  const gradId = `hbarGradProd_${color.replace('#', '')}`

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
        return (
          <g key={i}>
            {isTop && <rect x={0} y={y + 3} width={W} height={ROW - 6} fill={`${color}12`} rx="6" />}
            <text x={4} y={y + ROW / 2 + 4.5} fontSize="10" fill={isTop ? '#1A3A2C' : '#374151'}
              fontWeight={isTop ? '700' : '400'} fontFamily="system-ui">
              {isTop ? `🥇 ${truncated}` : truncated}
            </text>
            <rect x={LABEL_W} y={y + 11} width={BAR_AREA} height={18} fill="#F3F4F6" rx="9" />
            <rect x={LABEL_W} y={y + 11} width={bw} height={18} fill={`url(#${gradId})`} rx="9">
              <title>{d[labelKey]}: {formatValue(val)}</title>
            </rect>
            <text x={LABEL_W + bw + 8} y={y + ROW / 2 + 4.5} fontSize="9.5" fill="#6B7280" fontFamily="system-ui">
              {formatValue(val)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function BarChartSVG({
  data, labelKey, valueKey, color = '#5BBD9B',
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

  const W = 580, H = 230
  const PAD = { top: 28, right: 16, bottom: 56, left: 62 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const n = data.length
  const slotW = plotW / n
  const barW = Math.min(slotW * 0.62, 52)
  const yTicks = 4
  const gradId = `barGradProd_${color.replace('#', '')}`

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
      </defs>
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const tv = (i / yTicks) * maxVal
        const y = PAD.top + plotH - (tv / maxVal) * plotH
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={i === 0 ? '#E5E7EB' : '#F3F4F6'} strokeWidth={i === 0 ? 1.5 : 1}
              strokeDasharray={i > 0 ? '4 4' : undefined} />
            <text x={PAD.left - 7} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">{fmtTick(tv)}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const cx = PAD.left + i * slotW + slotW / 2
        const v = d[valueKey] ?? 0
        const bh = Math.max(3, (v / maxVal) * plotH)
        const x = cx - barW / 2
        const rawLabel = String(d[labelKey])
        const lbl = rawLabel.length > 9 ? rawLabel.slice(0, 8) + '…' : rawLabel
        return (
          <g key={i}>
            <rect x={x} y={PAD.top + plotH - bh} width={barW} height={bh}
              fill={`url(#${gradId})`} rx="5" ry="5">
              <title>{rawLabel}: {formatValue(v)}</title>
            </rect>
            <rect x={x} y={PAD.top + plotH - bh} width={barW} height={Math.min(bh, 5)}
              fill={color} rx="5" ry="5" />
            <text x={cx} y={PAD.top + plotH + 16} textAnchor="middle" fontSize="9.5" fill="#6B7280" fontFamily="system-ui"
              transform={n > 7 ? `rotate(-35,${cx},${PAD.top + plotH + 16})` : ''}>
              {lbl}
            </text>
          </g>
        )
      })}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1.5" />
    </svg>
  )
}

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
  const gradId = `lineGradProd_${color.replace('#', '')}`

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
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const tv = (i / yTicks) * maxVal
        const y = PAD.top + plotH - (tv / maxVal) * plotH
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={i === 0 ? '#E5E7EB' : '#F3F4F6'} strokeWidth={i === 0 ? 1.5 : 1}
              strokeDasharray={i > 0 ? '4 4' : undefined} />
            <text x={PAD.left - 7} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">{fmtTick(tv)}</text>
          </g>
        )
      })}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="6" fill={`${color}20`} />
          <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2.5">
            <title>{p.label}: {formatValue(p.value)}</title>
          </circle>
        </g>
      ))}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={PAD.top + plotH + 18} textAnchor="middle" fontSize="9.5" fill="#9CA3AF" fontFamily="system-ui">
          {p.label.length > 7 ? p.label.slice(0, 6) : p.label}
        </text>
      ))}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="#E5E7EB" strokeWidth="1.5" />
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
// SORT HELPERS
// ============================================================
type SortKey = keyof ProdRow
type SortDir = 'asc' | 'desc'

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ProducaoMedicaDashboard() {
  const [data, setData] = useState<ProducaoData | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [inicio, setInicio] = useState(firstOfMonth.toISOString().split('T')[0])
  const [fim, setFim] = useState(today.toISOString().split('T')[0])
  const [medicoId, setMedicoId] = useState('')
  const [especialidade, setEspecialidade] = useState('')

  // Table sort
  const [sortKey, setSortKey] = useState<SortKey>('faturamento')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const carregar = useCallback(async (ini: string, fi: string, mid: string, esp: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ inicio: ini, fim: fi })
      if (mid) params.set('medico_id', mid)
      if (esp) params.set('especialidade', esp)
      const res = await fetch(`/api/admin/producao-medica?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar(inicio, fim, medicoId, especialidade) }, []) // eslint-disable-line

  function handleAplicar() {
    carregar(inicio, fim, medicoId, especialidade)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortedProducao = data
    ? [...data.producao].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'desc' ? bv - av : av - bv
        }
        return sortDir === 'desc'
          ? String(bv).localeCompare(String(av))
          : String(av).localeCompare(String(bv))
      })
    : []

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Carregando produção médica...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <BarChart2 className="w-10 h-10 opacity-30" />
        <p className="text-sm">Erro ao carregar dados.</p>
        <button onClick={() => carregar(inicio, fim, medicoId, especialidade)}
          className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  const { totais } = data

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-[#5BBD9B]" />
      : <ChevronUp className="w-3 h-3 text-[#5BBD9B]" />
  }

  function ThSort({ label, k, right }: { label: string; k: SortKey; right?: boolean }) {
    return (
      <th
        className={`text-xs text-gray-400 font-medium pb-2 pr-3 cursor-pointer select-none hover:text-[#1A3A2C] transition-colors ${right ? 'text-right' : 'text-left'}`}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <SortIcon k={k} />
        </span>
      </th>
    )
  }

  return (
    <div className="space-y-6">

      {/* ---- Filter bar ---- */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-50">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">De</label>
              <input
                type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Até</label>
              <input
                type="date" value={fim} onChange={e => setFim(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
              />
            </div>
          </div>

          {/* Doctor selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Médico</label>
            <select
              value={medicoId}
              onChange={e => setMedicoId(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 min-w-[160px]"
            >
              <option value="">Todos os médicos</option>
              {data.medicos.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          {/* Specialty selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Especialidade</label>
            <select
              value={especialidade}
              onChange={e => setEspecialidade(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 min-w-[160px]"
            >
              <option value="">Todas as especialidades</option>
              {data.especialidades.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAplicar}
            className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#15302400] text-white px-4 py-[7px] rounded-lg text-xs font-semibold transition-colors self-end"
            style={{ backgroundColor: '#1A3A2C' }}
          >
            <Search className="w-3.5 h-3.5" />
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* ---- KPIs ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Faturamento Total"
          value={formatBRL(totais.faturamento)}
          sub={`${totais.consultas} consultas`}
          icon={DollarSign} color="#5BBD9B" highlight
        />
        <KpiCard
          label="Consultas Realizadas"
          value={String(totais.consultas)}
          sub="atendimentos concluídos"
          icon={Stethoscope} color="#3B82F6"
        />
        <KpiCard
          label="Custo Total"
          value={totais.custo > 0 ? formatBRL(totais.custo) : '—'}
          sub={totais.custo > 0 ? 'repasse aos médicos' : 'nenhum custo configurado'}
          icon={TrendingDown} color="#F97316"
        />
        <KpiCard
          label="Margem Bruta"
          value={totais.custo > 0 ? formatBRL(totais.margem) : '—'}
          sub={totais.custo > 0 && totais.faturamento > 0
            ? `${Math.round((totais.margem / totais.faturamento) * 100)}% do faturamento`
            : 'configure os custos'}
          icon={TrendingUp} color="#14B8A6"
        />
        <KpiCard
          label="Atestados Emitidos"
          value={String(totais.atestados)}
          sub="no período selecionado"
          icon={FileText} color="#F59E0B"
        />
        <KpiCard
          label="Renovações de Receita"
          value={String(totais.renovacoes)}
          sub={totais.gastos_renovacoes > 0 ? formatBRL(totais.gastos_renovacoes) : 'sem custo calculado'}
          icon={Receipt} color="#F97316"
        />
        <KpiCard
          label="Rx em Consultas"
          value={String(totais.receitas_em_consulta)}
          sub="emitidas durante atendimento"
          icon={ClipboardList} color="#8B5CF6"
        />
        <KpiCard
          label="Exames Solicitados"
          value={String(totais.exames)}
          sub="em breve disponível"
          icon={FlaskConical} color="#9CA3AF"
        />
      </div>

      {/* ---- Charts row 1: Faturamento por especialidade + Donut especialidade ---- */}
      {data.porEspecialidade.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard title="Faturamento por Especialidade" subtitle="Receita gerada por cada área médica no período">
              <HBarChart
                data={data.porEspecialidade}
                labelKey="especialidade" valueKey="faturamento"
                formatValue={formatBRL} color="#5BBD9B"
              />
            </ChartCard>
          </div>
          <ChartCard title="Consultas por Especialidade" subtitle="Distribuição de atendimentos por área">
            <DonutChart
              slices={data.porEspecialidade.map((e, i) => ({
                label: e.especialidade,
                value: e.consultas,
                color: COLORS[i % COLORS.length],
              }))}
              formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
            />
          </ChartCard>
        </div>
      )}

      {/* ---- Charts row 2: Consultas por médico + Faturamento por médico ---- */}
      {data.producao.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Consultas por Médico" subtitle="Volume de atendimentos por profissional">
            <HBarChart
              data={[...data.producao].sort((a, b) => b.consultas - a.consultas)}
              labelKey="nome" valueKey="consultas"
              formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
              color="#3B82F6"
            />
          </ChartCard>
          <ChartCard title="Faturamento por Médico" subtitle="Receita gerada por cada profissional">
            <HBarChart
              data={[...data.producao].sort((a, b) => b.faturamento - a.faturamento)}
              labelKey="nome" valueKey="faturamento"
              formatValue={formatBRL} color="#8B5CF6"
            />
          </ChartCard>
        </div>
      )}

      {/* ---- Charts row 3: Tendência mensal ---- */}
      {data.porMes.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Faturamento Mensal" subtitle="Evolução da receita gerada pelos médicos">
            <BarChartSVG
              data={data.porMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="faturamento"
              formatValue={formatBRL} color="#5BBD9B"
            />
          </ChartCard>
          <ChartCard title="Consultas por Mês" subtitle="Evolução do volume de atendimentos">
            <LineChartSVG
              data={data.porMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="consultas"
              formatValue={v => `${v} consulta${v !== 1 ? 's' : ''}`}
              color="#3B82F6"
            />
          </ChartCard>
        </div>
      )}

      {/* ---- Atestados e Renovações por mês ---- */}
      {data.porMes.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Atestados por Mês" subtitle="Evolução de emissão de atestados médicos">
            <BarChartSVG
              data={data.porMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="atestados"
              formatValue={v => `${v} atestado${v !== 1 ? 's' : ''}`}
              color="#F59E0B"
            />
          </ChartCard>
          <ChartCard title="Renovações de Receita por Mês" subtitle="Receitas avulsas emitidas fora de consulta">
            <BarChartSVG
              data={data.porMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
              labelKey="mes" valueKey="renovacoes"
              formatValue={v => `${v} renovação${v !== 1 ? 'ões' : ''}`}
              color="#F97316"
            />
          </ChartCard>
        </div>
      )}

      {/* ---- Renovações por médico + Rx em consultas por mês ---- */}
      {(data.producao.some(r => r.renovacoes > 0) || data.porMes.some(m => m.receitas_em_consulta > 0)) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {data.producao.some(r => r.renovacoes > 0) && (
            <ChartCard title="Renovações por Médico" subtitle="Quantidade de renovações de receita emitidas por profissional">
              <HBarChart
                data={[...data.producao].filter(r => r.renovacoes > 0).sort((a, b) => b.renovacoes - a.renovacoes)}
                labelKey="nome" valueKey="renovacoes"
                formatValue={v => `${v} renovação${v !== 1 ? 'ões' : ''}`}
                color="#F97316"
              />
            </ChartCard>
          )}
          {data.producao.some(r => r.gasto_renovacoes > 0) && (
            <ChartCard title="Valor de Renovações por Médico" subtitle="Custo total das renovações emitidas por cada médico">
              <HBarChart
                data={[...data.producao].filter(r => r.gasto_renovacoes > 0).sort((a, b) => b.gasto_renovacoes - a.gasto_renovacoes)}
                labelKey="nome" valueKey="gasto_renovacoes"
                formatValue={formatBRL}
                color="#EF4444"
              />
            </ChartCard>
          )}
          {data.porMes.some(m => m.receitas_em_consulta > 0) && (
            <ChartCard title="Rx em Consultas por Mês" subtitle="Receitas emitidas durante atendimento — sem custo adicional">
              <BarChartSVG
                data={data.porMes.map(d => ({ ...d, mes: formatMes(d.mes) }))}
                labelKey="mes" valueKey="receitas_em_consulta"
                formatValue={v => `${v} receita${v !== 1 ? 's' : ''}`}
                color="#8B5CF6"
              />
            </ChartCard>
          )}
        </div>
      )}

      {/* ---- Production Table ---- */}
      <ChartCard
        title="Produção por Médico"
        subtitle="Detalhamento individual — clique nas colunas para ordenar"
      >
        {data.producao.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-gray-300 flex-col gap-2">
            <Stethoscope className="w-8 h-8" />
            <p className="text-sm text-gray-400">Nenhum dado no período ou filtros selecionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-2 w-6">#</th>
                  <ThSort label="Médico" k="nome" />
                  <ThSort label="Especialidade" k="especialidade" />
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">CRM</th>
                  <ThSort label="Consultas" k="consultas" right />
                  <ThSort label="Faturamento" k="faturamento" right />
                  <ThSort label="Custo" k="custo" right />
                  <ThSort label="Margem" k="margem" right />
                  <ThSort label="Atestados" k="atestados" right />
                  <ThSort label="Renovações" k="renovacoes" right />
                  <ThSort label="Rx Consulta" k="receitas_em_consulta" right />
                  <ThSort label="Exames" k="exames" right />
                </tr>
              </thead>
              <tbody>
                {sortedProducao.map((row, i) => (
                  <tr
                    key={row.medico_id}
                    className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${i === 0 && sortKey === 'faturamento' ? 'bg-amber-50 hover:bg-amber-100/60' : ''}`}
                  >
                    <td className="py-3 pr-2 text-xs text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-[#1A3A2C] text-sm">{row.nome}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {row.especialidade}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-400 font-mono">{row.crm}</td>
                    <td className="py-3 pr-3 text-right">
                      <span className="font-semibold text-gray-700">{row.consultas}</span>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <span className="font-bold text-[#1A3A2C]">{formatBRL(row.faturamento)}</span>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {row.custo_consulta > 0
                        ? <span className="text-orange-600 font-medium">{formatBRL(row.custo)}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {row.custo_consulta > 0
                        ? <span className={`font-semibold ${row.margem >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatBRL(row.margem)}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {row.atestados > 0
                        ? <span className="text-amber-600 font-medium">{row.atestados}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {row.renovacoes > 0
                        ? <span className="text-orange-600 font-medium" title={`Custo: ${formatBRL(row.gasto_renovacoes)}`}>{row.renovacoes}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {row.receitas_em_consulta > 0
                        ? <span className="text-purple-600 font-medium">{row.receitas_em_consulta}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-gray-300 text-xs">em breve</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total do período</td>
                  <td className="py-3 pr-3 text-right font-bold text-[#1A3A2C]">{totais.consultas}</td>
                  <td className="py-3 pr-3 text-right font-bold text-[#1A3A2C]">{formatBRL(totais.faturamento)}</td>
                  <td className="py-3 pr-3 text-right font-bold text-orange-600">{totais.custo > 0 ? formatBRL(totais.custo) : '—'}</td>
                  <td className="py-3 pr-3 text-right font-bold text-green-600">{totais.custo > 0 ? formatBRL(totais.margem) : '—'}</td>
                  <td className="py-3 pr-3 text-right font-bold text-amber-600">{totais.atestados}</td>
                  <td className="py-3 pr-3 text-right font-bold text-orange-600" title={`Custo total: ${formatBRL(totais.gastos_renovacoes)}`}>{totais.renovacoes}</td>
                  <td className="py-3 pr-3 text-right font-bold text-purple-600">{totais.receitas_em_consulta}</td>
                  <td className="py-3 text-right text-gray-300 text-xs">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </ChartCard>

      {/* ---- Especialidades table ---- */}
      {data.porEspecialidade.length > 0 && (
        <ChartCard title="Detalhamento por Especialidade" subtitle="Consultas, faturamento e médicos ativos por área">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">#</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Especialidade</th>
                  <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Médicos ativos</th>
                  <th className="text-right text-xs text-gray-400 font-medium pb-2 pr-3">Consultas</th>
                  <th className="text-right text-xs text-gray-400 font-medium pb-2">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data.porEspecialidade.map((e, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-[#1A3A2C] text-sm">{e.especialidade}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-sm text-gray-600">{e.medicos}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-gray-700">{e.consultas}</td>
                    <td className="py-2.5 text-right font-bold text-[#1A3A2C]">{formatBRL(e.faturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

    </div>
  )
}
