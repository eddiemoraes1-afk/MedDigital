'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Loader2, RefreshCw, Download, ShieldCheck,
  ShieldX, AlertTriangle, Users, X, ChevronDown, ChevronUp,
  Building2, Stethoscope, Printer,
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ExclusaoItem {
  id: string
  data: string
  paciente: string
  cpf: string
  sexo: string
  medico: string
  medico_sexo: string | null
  crm: string
  especialidade: string
  empresa: string
  empresa_id_val: string | null
  cargo: string
  departamento: string
  relacao: string
  status: string
  statusLabel: string
  motivos: string[]
  motivo_outro: string | null
  conduta: string
  ciente_paciente: boolean
  observacoes: string
}

interface ExclusoesData {
  kpis: {
    total: number; aptos: number; naoAptos: number
    emergencias: number; pacientesUnicos: number; medicosUnicos: number
  }
  porMes: Array<{ mes: string; total: number }>
  porStatus: Array<{ status: string; label: string; total: number }>
  porMotivo: Array<{ motivo: string; total: number }>
  porMedico: Array<{ nome: string; total: number; naoAptos: number }>
  porEmpresa: Array<{ nome: string; total: number; naoAptos: number }>
  porDepartamento: Array<{ departamento: string; total: number }>
  porCargo: Array<{ cargo: string; total: number }>
  lista: ExclusaoItem[]
  empresas: Array<{ id: string; nome: string }>
  medicosOptions: Array<{ nome: string }>
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PERIODOS = [
  { v: '30d', l: '30 dias' },
  { v: '3m',  l: '3 meses' },
  { v: '6m',  l: '6 meses' },
  { v: '12m', l: '12 meses' },
  { v: 'custom', l: 'Personalizado' },
]

const STATUS_COLOR: Record<string, string> = {
  apto: 'bg-green-100 text-green-700',
  apto_ressalvas: 'bg-yellow-100 text-yellow-700',
  nao_apto: 'bg-red-100 text-red-700',
  emergencia: 'bg-red-200 text-red-800',
}

const STATUS_CHART_COLOR: Record<string, string> = {
  apto: '#22C55E',
  apto_ressalvas: '#EAB308',
  nao_apto: '#EF4444',
  emergencia: '#991B1B',
}

const MISC_COLORS = ['#5BBD9B','#3B82F6','#F59E0B','#8B5CF6','#EF4444','#14B8A6','#EC4899','#6366F1','#F97316','#06B6D4']

// ── Helpers ────────────────────────────────────────────────────────────────────
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
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
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

function prefixoMedico(sexo: string | null | undefined) {
  return sexo === 'feminino' ? 'Dra.' : 'Dr.'
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

function BarChartSVG({ data, labelKey, valueKey, color = '#5BBD9B' }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string
}) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-300 text-xs">Sem dados no período</div>
  const W = 560, H = 220
  const PAD = { top: 24, right: 16, bottom: 52, left: 46 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const n = data.length
  const slotW = plotW / n
  const barW = slotW * 0.6
  function fmtTick(v: number) { return v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0) }
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
              <title>{rawLabel}: {v}</title>
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

function HBarChart({ data, labelKey, valueKey, color = '#5BBD9B', maxItems = 12 }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string; maxItems?: number
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
              <title>{d[labelKey]}: {d[valueKey] ?? 0}</title>
            </rect>
            <text x={LABEL_W + bw + 7} y={y + ROW / 2 + 4} fontSize="9" fill="#6B7280">
              {d[valueKey] ?? 0}
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
            <span className="truncate max-w-[110px]" title={s.label}>{s.label}</span>
            <span className="font-semibold text-gray-700">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminExclusoesDashboard() {
  const [data, setData] = useState<ExclusoesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [exportandoPdf, setExportandoPdf] = useState(false)

  const [periodo, setPeriodo] = useState('12m')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroMedico, setFiltroMedico] = useState('')

  const [sortKey, setSortKey] = useState<keyof ExclusaoItem>('data')
  const [sortAsc, setSortAsc] = useState(false)

  const carregar = useCallback(async (p: string, ini?: string, fi?: string) => {
    setLoading(true); setErro(null)
    try {
      const [de, ate] = p === 'custom' ? [ini!, fi!] : calcRange(p)
      const params = new URLSearchParams({ de, ate })
      if (filtroEmpresa) params.set('empresa_id', filtroEmpresa)
      if (filtroStatus)  params.set('status', filtroStatus)
      const res = await fetch(`/api/admin/exclusoes?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar protocolos de exclusão')
      setData(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [filtroEmpresa, filtroStatus])

  useEffect(() => { carregar('12m') }, [])

  function handlePeriodo(p: string) {
    setPeriodo(p)
    if (p !== 'custom') carregar(p)
  }

  function handleAtualizar() {
    if (periodo === 'custom' && inicio && fim) carregar('custom', inicio, fim)
    else carregar(periodo)
  }

  const lista = data?.lista ?? []

  const medicos = useMemo(() => [...new Set(lista.map(c => c.medico).filter(Boolean))].sort(), [lista])

  const filtradas = useMemo(() => lista
    .filter(c => {
      if (busca) {
        const q = busca.toLowerCase()
        if (
          !c.paciente.toLowerCase().includes(q) &&
          !c.medico.toLowerCase().includes(q) &&
          !c.empresa.toLowerCase().includes(q) &&
          !c.cpf.includes(q)
        ) return false
      }
      if (filtroStatus && c.status !== filtroStatus) return false
      if (filtroMedico && c.medico !== filtroMedico) return false
      return true
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? ''; const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
      return sortAsc ? cmp : -cmp
    }), [lista, busca, filtroStatus, filtroMedico, sortKey, sortAsc])

  function toggleSort(key: keyof ExclusaoItem) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortIcon({ k }: { k: keyof ExclusaoItem }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-20" />
    return sortAsc ? <ChevronUp className="w-3 h-3 text-[#5BBD9B]" /> : <ChevronDown className="w-3 h-3 text-[#5BBD9B]" />
  }

  function Th({ label, k }: { label: string; k: keyof ExclusaoItem }) {
    return (
      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
        onClick={() => toggleSort(k)}>
        <span className="inline-flex items-center gap-1">{label} <SortIcon k={k} /></span>
      </th>
    )
  }

  const temFiltro = busca || filtroStatus || filtroMedico

  async function exportarExcel() {
    setExportando(true)
    try {
      const linhas = filtradas.map(c => ({
        'Data / Hora': formatDH(c.data),
        'Paciente': c.paciente,
        'CPF': c.cpf,
        'Empresa': c.empresa,
        'Cargo': c.cargo,
        'Departamento': c.departamento,
        'Médico': `${prefixoMedico(c.medico_sexo)} ${c.medico}`,
        'CRM': c.crm,
        'Especialidade': c.especialidade,
        'Status': c.statusLabel,
        'Motivos': [...c.motivos, c.motivo_outro].filter(Boolean).join('; '),
        'Conduta': c.conduta,
        'Paciente Ciente': c.ciente_paciente ? 'Sim' : 'Não',
        'Observações': c.observacoes,
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      ws['!cols'] = [
        { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 22 },
        { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 22 }, { wch: 16 },
        { wch: 44 }, { wch: 32 }, { wch: 14 }, { wch: 30 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Protocolos de Exclusão')

      // Aba de resumo por status
      if (data) {
        const resumoStatus = data.porStatus.map(s => ({
          'Status': s.label,
          'Quantidade': s.total,
          '% do Total': data.kpis.total > 0 ? `${Math.round(s.total / data.kpis.total * 100)}%` : '0%',
        }))
        const wsStatus = XLSX.utils.json_to_sheet(resumoStatus)
        wsStatus['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, wsStatus, 'Por Status')

        // Aba por médico
        const resumoMedico = data.porMedico.map(m => ({
          'Médico': m.nome,
          'Total Protocolos': m.total,
          'Não Aptos': m.naoAptos,
          '% Não Aptos': m.total > 0 ? `${Math.round(m.naoAptos / m.total * 100)}%` : '0%',
        }))
        const wsMedico = XLSX.utils.json_to_sheet(resumoMedico)
        wsMedico['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 14 }]
        XLSX.utils.book_append_sheet(wb, wsMedico, 'Por Médico')

        // Aba por empresa
        const resumoEmpresa = data.porEmpresa.map(e => ({
          'Empresa': e.nome,
          'Total Protocolos': e.total,
          'Não Aptos': e.naoAptos,
        }))
        const wsEmpresa = XLSX.utils.json_to_sheet(resumoEmpresa)
        wsEmpresa['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, wsEmpresa, 'Por Empresa')

        // Aba por motivo
        const resumoMotivo = data.porMotivo.map(m => ({
          'Motivo': m.motivo,
          'Ocorrências': m.total,
        }))
        const wsMotivo = XLSX.utils.json_to_sheet(resumoMotivo)
        wsMotivo['!cols'] = [{ wch: 36 }, { wch: 14 }]
        XLSX.utils.book_append_sheet(wb, wsMotivo, 'Por Motivo')
      }

      XLSX.writeFile(wb, `exclusoes-admin-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExportando(false)
    }
  }

  function exportarPdf() {
    setExportandoPdf(true)
    const data_str = new Date().toLocaleDateString('pt-BR')
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Protocolos de Exclusão</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1A3A2C; padding: 24px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #6B7280; font-size: 11px; margin-bottom: 16px; }
  .kpis { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .kpi { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 16px; min-width: 100px; }
  .kpi .val { font-size: 20px; font-weight: bold; }
  .kpi .lbl { font-size: 10px; color: #6B7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
  th { background: #1A3A2C; color: white; text-align: left; padding: 6px 8px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 5px 8px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  tr:nth-child(even) td { background: #F9FAFB; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 600; }
  .apto { background: #DCFCE7; color: #166534; }
  .apto_ressalvas { background: #FEF9C3; color: #854D0E; }
  .nao_apto { background: #FEE2E2; color: #991B1B; }
  .emergencia { background: #FECACA; color: #7F1D1D; }
  .footer { margin-top: 24px; font-size: 9px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 8px; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
<h1>Protocolo de Exclusão de Telemedicina</h1>
<p class="subtitle">Gerado em ${data_str} · ${filtradas.length} registro(s) · Ref. CFM Res. 2.314/2022</p>
<div class="kpis">
  ${data ? `
  <div class="kpi"><div class="val">${data.kpis.total}</div><div class="lbl">Total Protocolos</div></div>
  <div class="kpi"><div class="val">${data.kpis.aptos}</div><div class="lbl">Aptos</div></div>
  <div class="kpi"><div class="val" style="color:#991B1B">${data.kpis.naoAptos}</div><div class="lbl">Não Aptos</div></div>
  <div class="kpi"><div class="val" style="color:#991B1B">${data.kpis.emergencias}</div><div class="lbl">Emergências</div></div>
  <div class="kpi"><div class="val">${data.kpis.pacientesUnicos}</div><div class="lbl">Pacientes</div></div>
  <div class="kpi"><div class="val">${data.kpis.medicosUnicos}</div><div class="lbl">Médicos</div></div>
  ` : ''}
</div>
<table>
<thead>
  <tr>
    <th>Data / Hora</th>
    <th>Paciente</th>
    <th>Empresa</th>
    <th>Médico</th>
    <th>Status</th>
    <th>Motivos</th>
    <th>Conduta</th>
  </tr>
</thead>
<tbody>
  ${filtradas.map(c => `
    <tr>
      <td>${formatDH(c.data)}</td>
      <td>${c.paciente}${c.cargo !== '—' ? `<br><span style="color:#6B7280;font-size:9px">${c.cargo}</span>` : ''}</td>
      <td>${c.empresa}</td>
      <td>${prefixoMedico(c.medico_sexo)} ${c.medico}<br><span style="color:#6B7280;font-size:9px">${c.especialidade}</span></td>
      <td><span class="badge ${c.status}">${c.statusLabel}</span></td>
      <td>${[...c.motivos, c.motivo_outro].filter(Boolean).join('; ') || '—'}</td>
      <td>${c.conduta || '—'}</td>
    </tr>
  `).join('')}
</tbody>
</table>
<div class="footer">Relatório gerado pelo sistema MedDigital em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Documento confidencial</div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => { win.print(); setExportandoPdf(false) }, 600)
    } else {
      setExportandoPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Carregando protocolos de exclusão...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <ShieldCheck className="w-10 h-10 opacity-30" />
        <p className="text-sm">{erro}</p>
        <button onClick={handleAtualizar} className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) return null
  const { kpis } = data

  return (
    <div className="space-y-5">

      {/* ── Barra de filtros / período ── */}
      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm flex flex-wrap items-center gap-3">
        {/* Período */}
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

        {/* Filtros rápidos */}
        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
          <option value="">Todas as empresas</option>
          <option value="__particular__">Particular</option>
          {data.empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>

        <button onClick={handleAtualizar}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>

        {/* Exports */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-[#1A3A2C]">{filtradas.length}</span> de {lista.length} protocolos
          </span>
          <button onClick={exportarExcel} disabled={exportando || filtradas.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors">
            {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Excel
          </button>
          <button onClick={exportarPdf} disabled={exportandoPdf || filtradas.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors">
            {exportandoPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            PDF
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Protocolos" value={String(kpis.total)} sub="no período" icon={ShieldCheck} color="#14B8A6" />
        <KpiCard label="Aptos" value={String(kpis.aptos)} sub="apto ou c/ ressalvas" icon={ShieldCheck} color="#22C55E" />
        <KpiCard label="Não Aptos" value={String(kpis.naoAptos)} sub={`${kpis.total > 0 ? Math.round(kpis.naoAptos / kpis.total * 100) : 0}% do total`} icon={ShieldX} color="#EF4444" />
        <KpiCard label="Emergências" value={String(kpis.emergencias)} sub="atenção imediata" icon={AlertTriangle} color="#991B1B" />
        <KpiCard label="Pacientes" value={String(kpis.pacientesUnicos)} sub="únicos com protocolo" icon={Users} color="#8B5CF6" />
        <KpiCard label="Médicos" value={String(kpis.medicosUnicos)} sub="emissores de protocolo" icon={Stethoscope} color="#3B82F6" />
      </div>

      {/* ── Linha 1: Evolução + Status ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ChartCard title="Protocolos por Mês" subtitle="Evolução mensal no período">
            <BarChartSVG data={data.porMes.map(d => ({ ...d, mes: formatMes(d.mes) }))} labelKey="mes" valueKey="total" color="#14B8A6" />
          </ChartCard>
        </div>
        <ChartCard title="Por Status" subtitle="Distribuição de resultados">
          <DonutChart
            slices={data.porStatus.filter(d => d.total > 0).map(d => ({
              label: d.label, value: d.total,
              color: STATUS_CHART_COLOR[d.status] ?? '#9CA3AF',
            }))}
          />
        </ChartCard>
      </div>

      {/* ── Linha 2: Motivos + Empresas ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Principais Motivos" subtitle="Motivos mais frequentes de exclusão">
          <HBarChart data={data.porMotivo} labelKey="motivo" valueKey="total" color="#EF4444" maxItems={10} />
        </ChartCard>
        <ChartCard title="Por Empresa" subtitle="Protocolos por empresa contratante">
          <HBarChart data={data.porEmpresa} labelKey="nome" valueKey="total" color="#3B82F6" maxItems={10} />
        </ChartCard>
      </div>

      {/* ── Linha 3: Por Médico + Por Empresa (donut) ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Por Médico" subtitle="Protocolos emitidos por profissional">
          <HBarChart data={data.porMedico} labelKey="nome" valueKey="total" color="#8B5CF6" maxItems={10} />
        </ChartCard>
        <ChartCard title="Por Empresa — Distribuição" subtitle="Proporção de protocolos por empresa">
          <DonutChart
            slices={data.porEmpresa.slice(0, 8).map((d, i) => ({
              label: d.nome, value: d.total, color: MISC_COLORS[i % MISC_COLORS.length],
            }))}
          />
        </ChartCard>
      </div>

      {/* ── Linha 4: Departamento + Cargo ── */}
      {(data.porDepartamento.length > 0 || data.porCargo.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5">
          {data.porDepartamento.length > 0 && (
            <ChartCard title="Por Departamento / Secretaria" subtitle="Volume por área de atuação">
              <HBarChart data={data.porDepartamento} labelKey="departamento" valueKey="total" color="#F59E0B" maxItems={10} />
            </ChartCard>
          )}
          {data.porCargo.length > 0 && (
            <ChartCard title="Por Cargo" subtitle="Protocolos por função">
              <HBarChart data={data.porCargo} labelKey="cargo" valueKey="total" color="#14B8A6" maxItems={10} />
            </ChartCard>
          )}
        </div>
      )}

      {/* ── Não Aptos por Médico ── */}
      {data.porMedico.some(d => d.naoAptos > 0) && (
        <ChartCard title="Não Aptos por Médico" subtitle="Quantidade de pareceres de inaptidão por profissional">
          <HBarChart
            data={data.porMedico.filter(d => d.naoAptos > 0).sort((a, b) => b.naoAptos - a.naoAptos)}
            labelKey="nome" valueKey="naoAptos" color="#EF4444" maxItems={10}
          />
        </ChartCard>
      )}

      {/* ── Filtros da tabela ── */}
      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar paciente, médico, empresa ou CPF..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
          <option value="">Todos os status</option>
          <option value="apto">Apto</option>
          <option value="apto_ressalvas">Apto c/ Ressalvas</option>
          <option value="nao_apto">Não Apto</option>
          <option value="emergencia">Emergência</option>
        </select>
        <select value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
          <option value="">Todos os médicos</option>
          {medicos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {temFiltro && (
          <button onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroMedico('') }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {temFiltro ? 'Nenhum protocolo encontrado para os filtros aplicados.' : 'Nenhum protocolo de exclusão no período.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <Th label="Data / Hora" k="data" />
                  <Th label="Paciente" k="paciente" />
                  <Th label="Empresa" k="empresa" />
                  <Th label="Médico" k="medico" />
                  <Th label="Status" k="statusLabel" />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Motivos</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Conduta</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Ciente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map(c => {
                  const todosMotivos = [...c.motivos, c.motivo_outro].filter(Boolean)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDH(c.data)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-[#1A3A2C] text-sm leading-tight">{c.paciente}</p>
                        {c.cargo !== '—' && <p className="text-xs text-gray-400 mt-0.5">{c.cargo}</p>}
                        <p className="text-xs text-gray-400 font-mono">{c.cpf}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-gray-300 shrink-0" />
                          <span className="text-xs text-gray-700">{c.empresa}</span>
                        </div>
                        {c.departamento !== '—' && <p className="text-xs text-gray-400 mt-0.5 pl-4">{c.departamento}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm text-gray-800 font-medium">{prefixoMedico(c.medico_sexo)} {c.medico}</p>
                        <p className="text-xs text-gray-400">{c.especialidade}</p>
                        <p className="text-xs text-gray-300 font-mono">{c.crm}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 max-w-[200px]">
                        {todosMotivos.length > 0 ? (
                          <div className="space-y-0.5">
                            {todosMotivos.slice(0, 2).map((m, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1" />
                                <span className="break-words">{m}</span>
                              </div>
                            ))}
                            {todosMotivos.length > 2 && (
                              <p className="text-gray-400 pl-2.5 text-xs">+{todosMotivos.length - 2} mais</p>
                            )}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[180px]">
                        {c.conduta
                          ? <span title={c.conduta}>{c.conduta.slice(0, 60)}{c.conduta.length > 60 ? '…' : ''}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-semibold ${c.ciente_paciente ? 'text-green-600' : 'text-gray-300'}`}>
                          {c.ciente_paciente ? '✓' : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
