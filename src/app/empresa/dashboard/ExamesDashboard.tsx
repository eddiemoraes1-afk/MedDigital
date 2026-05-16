'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Loader2, RefreshCw, Download, FlaskConical,
  AlertTriangle, Users, X, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ExameItem {
  id: string
  data: string
  funcionario: string
  cargo: string
  secretaria: string
  relacao: string
  medico: string
  especialidade: string
  urgencia: string
  exames: string
  totalExames: number
  indicacao_clinica: string
  observacoes: string
  status: string
}

interface ExamesData {
  kpis: { totalSolicitacoes: number; pacientesUnicos: number; totalExames: number; urgentes: number }
  porMes: Array<{ mes: string; total: number }>
  porUrgencia: Array<{ urgencia: string; total: number }>
  porSexo: Array<{ sexo: string; total: number }>
  porMedico: Array<{ nome: string; total: number; totalExames: number }>
  porSecretaria: Array<{ secretaria: string; total: number }>
  porCargo: Array<{ cargo: string; total: number }>
  porRelacao: Array<{ relacao: string; total: number }>
  topExames: Array<{ nome: string; total: number }>
  lista: ExameItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const PERIODOS = [
  { v: '30d', l: '30 dias' },
  { v: '3m',  l: '3 meses' },
  { v: '6m',  l: '6 meses' },
  { v: '12m', l: '12 meses' },
  { v: 'custom', l: 'Personalizado' },
]

function calcRange(p: string): [string, string] {
  const now = new Date()
  const start = new Date(now)
  if (p === '30d') start.setDate(start.getDate() - 30)
  else if (p === '3m') start.setMonth(start.getMonth() - 3)
  else if (p === '6m') start.setMonth(start.getMonth() - 6)
  else if (p === '12m') start.setFullYear(start.getFullYear() - 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return [fmt(start), fmt(now)]
}

function formatMes(ym: string) {
  const [year, month] = ym.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[parseInt(month) - 1]}/${year.slice(2)}`
}

function formatDH(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const URGENCIA_LABEL: Record<string, string> = {
  normal: 'Normal', urgente: 'Urgente', emergencia: 'Emergência',
}
const URGENCIA_COLOR: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  urgente: 'bg-orange-100 text-orange-700',
  emergencia: 'bg-red-100 text-red-700',
}

// ── SVG Charts ─────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
      <div className="mb-4">
        <h3 className="font-bold text-[#1A3A2C] text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#1A3A2C] leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function BarChartSVG({ data, labelKey, valueKey, color = '#5BBD9B', formatValue = String }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string; formatValue?: (v: number) => string
}) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-300 text-xs">Sem dados no período</div>
  const W = 560, H = 220
  const PAD = { top: 24, right: 16, bottom: 52, left: 50 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const n = data.length
  const slotW = plotW / n
  const barW = slotW * 0.6
  function fmtTick(v: number) {
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
    return v.toFixed(0)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {Array.from({ length: 5 }, (_, i) => {
        const tv = (i / 4) * maxVal; const y = PAD.top + plotH - (tv / maxVal) * plotH
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

function HBarChart({ data, labelKey, valueKey, color = '#5BBD9B', formatValue = String, maxItems = 12 }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string; formatValue?: (v: number) => string; maxItems?: number
}) {
  const items = data.slice(0, maxItems)
  if (!items.length) return <div className="flex items-center justify-center h-16 text-gray-300 text-xs">Sem dados no período</div>
  const maxVal = Math.max(...items.map(d => d[valueKey] ?? 0), 1)
  const ROW = 38, W = 520, LABEL_W = 180, BAR_AREA = 260, H = items.length * ROW + 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {items.map((d, i) => {
        const bw = Math.max(4, ((d[valueKey] ?? 0) / maxVal) * BAR_AREA)
        const y = i * ROW
        const label = String(d[labelKey])
        const truncated = label.length > 26 ? label.slice(0, 24) + '…' : label
        return (
          <g key={i}>
            {i % 2 === 0 && <rect x={0} y={y + 2} width={W} height={ROW - 4} fill="#FAFAFA" rx="4" />}
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

function DonutChart({ slices }: { slices: Array<{ label: string; value: number; color: string }> }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="flex items-center justify-center h-36 text-gray-300 text-xs">Sem dados no período</div>
  function polarXY(deg: number, r: number): [number, number] {
    const rad = (deg - 90) * Math.PI / 180
    return [r * Math.cos(rad), r * Math.sin(rad)]
  }
  function sectorPath(startDeg: number, endDeg: number): string {
    const span = endDeg - startDeg
    if (span >= 360) endDeg = startDeg + 359.9
    const [ox1, oy1] = polarXY(startDeg, 80); const [ox2, oy2] = polarXY(endDeg, 80)
    const [ix2, iy2] = polarXY(endDeg, 52); const [ix1, iy1] = polarXY(startDeg, 52)
    const lg = span > 180 ? 1 : 0
    return `M${ox1},${oy1} A80,80 0 ${lg} 1 ${ox2},${oy2} L${ix2},${iy2} A52,52 0 ${lg} 0 ${ix1},${iy1}Z`
  }
  let cumDeg = 0
  const sectors = slices.map(s => {
    const deg = (s.value / total) * 360
    const start = cumDeg; cumDeg += deg
    return { ...s, path: sectorPath(start, cumDeg) }
  })
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="-95 -95 190 190" className="w-44 h-44">
        {sectors.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2">
            <title>{s.label}: {s.value} ({Math.round(s.value / total * 100)}%)</title>
          </path>
        ))}
        <text x="0" y="-6" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1A3A2C">{total}</text>
        <text x="0" y="10" textAnchor="middle" fontSize="8" fill="#9CA3AF">total</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-xs">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate max-w-[100px]" title={s.label}>{s.label}</span>
            <span className="font-semibold text-gray-700">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
const URGENCIA_COLORS = ['#9CA3AF', '#F97316', '#EF4444']
const COLORS = ['#5BBD9B', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899']

export default function ExamesDashboard() {
  const [data, setData] = useState<ExamesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  const [periodo, setPeriodo] = useState('12m')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  const [busca, setBusca] = useState('')
  const [filtroUrgencia, setFiltroUrgencia] = useState('')
  const [filtroMedico, setFiltroMedico] = useState('')

  const [sortKey, setSortKey] = useState<keyof ExameItem>('data')
  const [sortAsc, setSortAsc] = useState(false)

  const carregar = useCallback(async (p: string, ini?: string, fi?: string) => {
    setLoading(true); setErro(null)
    try {
      const [de, ate] = p === 'custom' ? [ini!, fi!] : calcRange(p)
      const res = await fetch(`/api/empresa/exames?de=${de}&ate=${ate}`)
      if (!res.ok) throw new Error('Erro ao carregar exames')
      setData(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar('12m') }, [carregar])

  function handlePeriodo(p: string) {
    setPeriodo(p)
    if (p !== 'custom') carregar(p)
  }

  const lista = data?.lista ?? []

  const medicos = useMemo(() => [...new Set(lista.map(c => c.medico).filter(Boolean))].sort(), [lista])

  const filtradas = useMemo(() => lista
    .filter(c => {
      if (busca) {
        const q = busca.toLowerCase()
        if (!c.funcionario.toLowerCase().includes(q) && !c.medico.toLowerCase().includes(q) && !c.exames.toLowerCase().includes(q)) return false
      }
      if (filtroUrgencia && c.urgencia !== filtroUrgencia) return false
      if (filtroMedico && c.medico !== filtroMedico) return false
      return true
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? ''; const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
      return sortAsc ? cmp : -cmp
    }), [lista, busca, filtroUrgencia, filtroMedico, sortKey, sortAsc])

  function toggleSort(key: keyof ExameItem) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortIcon({ k }: { k: keyof ExameItem }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-20" />
    return sortAsc ? <ChevronUp className="w-3 h-3 text-[#5BBD9B]" /> : <ChevronDown className="w-3 h-3 text-[#5BBD9B]" />
  }

  function Th({ label, k }: { label: string; k: keyof ExameItem }) {
    return (
      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
        onClick={() => toggleSort(k)}>
        <span className="inline-flex items-center gap-1">{label} <SortIcon k={k} /></span>
      </th>
    )
  }

  const temFiltro = busca || filtroUrgencia || filtroMedico

  async function exportarExcel() {
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      const linhas = filtradas.map(c => ({
        'Data / Hora': formatDH(c.data),
        'Funcionário': c.funcionario,
        'Cargo': c.cargo,
        'Secretaria': c.secretaria,
        'Relação': c.relacao,
        'Médico': c.medico,
        'Especialidade': c.especialidade,
        'Urgência': URGENCIA_LABEL[c.urgencia] ?? c.urgencia,
        'Qtd Exames': c.totalExames,
        'Exames Solicitados': c.exames,
        'Indicação Clínica': c.indicacao_clinica,
        'Observações': c.observacoes,
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      ws['!cols'] = [
        { wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 14 },
        { wch: 28 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 40 }, { wch: 30 }, { wch: 30 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Exames')
      XLSX.writeFile(wb, `exames-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExportando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Carregando exames...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <FlaskConical className="w-10 h-10 opacity-30" />
        <p className="text-sm">{erro}</p>
        <button onClick={() => carregar(periodo)} className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) return null
  const { kpis } = data

  return (
    <div className="space-y-5">

      {/* Barra de período */}
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
          <div className="flex items-center gap-2">
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
            <span className="text-gray-400 text-xs">até</span>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
            <button onClick={() => { if (inicio && fim) carregar('custom', inicio, fim) }}
              className="bg-[#5BBD9B] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#4aab8a] transition-colors">
              Aplicar
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-[#1A3A2C]">{filtradas.length}</span> de {lista.length} solicitações
          </span>
          <button onClick={exportarExcel} disabled={exportando || filtradas.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors">
            {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Solicitações" value={String(kpis.totalSolicitacoes)} sub="no período" icon={FlaskConical} color="#5BBD9B" />
        <KpiCard label="Exames Individuais" value={String(kpis.totalExames)} sub="itens solicitados" icon={FlaskConical} color="#8B5CF6" />
        <KpiCard label="Funcionários" value={String(kpis.pacientesUnicos)} sub="com exames" icon={Users} color="#3B82F6" />
        <KpiCard label="Urgentes / Emergência" value={String(kpis.urgentes)} sub={`${kpis.totalSolicitacoes > 0 ? Math.round(kpis.urgentes / kpis.totalSolicitacoes * 100) : 0}% do total`} icon={AlertTriangle} color="#EF4444" />
      </div>

      {/* Gráficos linha 1 */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ChartCard title="Solicitações por Mês" subtitle="Evolução mensal no período">
            <BarChartSVG data={data.porMes.map(d => ({ ...d, mes: formatMes(d.mes) }))} labelKey="mes" valueKey="total" color="#5BBD9B" />
          </ChartCard>
        </div>
        <ChartCard title="Por Urgência" subtitle="Distribuição por nível">
          <DonutChart
            slices={data.porUrgencia.filter(d => d.total > 0).map((d, i) => ({
              label: URGENCIA_LABEL[d.urgencia] ?? d.urgencia,
              value: d.total,
              color: URGENCIA_COLORS[i] ?? COLORS[i % COLORS.length],
            }))}
          />
        </ChartCard>
      </div>

      {/* Gráficos linha 2 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Top Exames Solicitados" subtitle="Exames mais pedidos">
          <HBarChart data={data.topExames} labelKey="nome" valueKey="total" color="#5BBD9B" maxItems={10} />
        </ChartCard>
        <ChartCard title="Por Médico" subtitle="Solicitações por profissional">
          <HBarChart data={data.porMedico} labelKey="nome" valueKey="total" color="#8B5CF6" maxItems={8} />
        </ChartCard>
      </div>

      {/* Gráficos linha 3 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Por Secretaria / Departamento" subtitle="Volume por área da empresa">
          <HBarChart data={data.porSecretaria} labelKey="secretaria" valueKey="total" color="#3B82F6" maxItems={10} />
        </ChartCard>
        <ChartCard title="Por Cargo" subtitle="Volume de exames por função">
          <HBarChart data={data.porCargo} labelKey="cargo" valueKey="total" color="#F59E0B" maxItems={10} />
        </ChartCard>
      </div>

      {/* Gráficos linha 4 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Por Relação" subtitle="Funcionário vs dependentes">
          <DonutChart
            slices={data.porRelacao.filter(d => d.total > 0).map((d, i) => ({
              label: d.relacao, value: d.total, color: COLORS[i % COLORS.length],
            }))}
          />
        </ChartCard>
        <ChartCard title="Por Sexo" subtitle="Distribuição por gênero">
          <DonutChart
            slices={data.porSexo.filter(d => d.total > 0).map(d => ({
              label: d.sexo, value: d.total,
              color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF',
            }))}
          />
        </ChartCard>
      </div>

      {/* Filtros da lista */}
      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar funcionário, médico ou exame..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
        </div>
        <select value={filtroUrgencia} onChange={e => setFiltroUrgencia(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
          <option value="">Todas as urgências</option>
          <option value="normal">Normal</option>
          <option value="urgente">Urgente</option>
          <option value="emergencia">Emergência</option>
        </select>
        <select value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
          <option value="">Todos os médicos</option>
          {medicos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {temFiltro && (
          <button onClick={() => { setBusca(''); setFiltroUrgencia(''); setFiltroMedico('') }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <FlaskConical className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {temFiltro ? 'Nenhuma solicitação encontrada para os filtros aplicados.' : 'Nenhuma solicitação de exame no período.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <Th label="Data / Hora" k="data" />
                  <Th label="Funcionário" k="funcionario" />
                  <Th label="Secretaria" k="secretaria" />
                  <Th label="Médico" k="medico" />
                  <Th label="Urgência" k="urgencia" />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Exames</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDH(c.data)}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#1A3A2C] text-sm leading-tight">{c.funcionario}</p>
                      {c.cargo && c.cargo !== '—' && <p className="text-xs text-gray-400 mt-0.5">{c.cargo}</p>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{c.secretaria !== '—' ? c.secretaria : '—'}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-gray-800 leading-tight">{c.medico}</p>
                      {c.especialidade && c.especialidade !== '—' && <p className="text-xs text-gray-400 mt-0.5">{c.especialidade}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCIA_COLOR[c.urgencia] ?? 'bg-gray-100 text-gray-600'}`}>
                        {URGENCIA_LABEL[c.urgencia] ?? c.urgencia}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 max-w-xs">
                      <div className="space-y-0.5">
                        {c.exames.split('\n').filter(Boolean).slice(0, 3).map((e, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5BBD9B] shrink-0" />
                            <span className="truncate">{e.trim()}</span>
                          </div>
                        ))}
                        {c.totalExames > 3 && (
                          <p className="text-gray-400 pl-2.5">+{c.totalExames - 3} mais</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
