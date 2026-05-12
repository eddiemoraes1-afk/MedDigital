'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart2, Loader2, RefreshCw, FileText, Calendar, Users, Clock,
  Search, Filter, X, Download, Printer,
} from 'lucide-react'
import * as XLSX from 'xlsx'

const COLORS = ['#5BBD9B','#3B82F6','#F59E0B','#8B5CF6','#EF4444','#14B8A6','#EC4899','#6366F1']

function formatMes(ym: string) {
  const [year, month] = ym.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(month)-1]}/${year.slice(2)}`
}

function formatDate(d: string) {
  if (!d || d === '—') return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ── SVG Donut ─────────────────────────────────────────────────────────────────
function DonutChart({ slices, centerLabel }: { slices: { label: string; value: number; color: string }[]; centerLabel?: string }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="h-36 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  function polar(deg: number, r: number): [number, number] {
    const rad = (deg - 90) * Math.PI / 180
    return [r * Math.cos(rad), r * Math.sin(rad)]
  }
  function sector(s: number, e: number) {
    if (e - s >= 360) e = s + 359.9
    const [x1, y1] = polar(s, 80); const [x2, y2] = polar(e, 80)
    const [ix2, iy2] = polar(e, 52); const [ix1, iy1] = polar(s, 52)
    const lg = e - s > 180 ? 1 : 0
    return `M${x1},${y1} A80,80 0 ${lg} 1 ${x2},${y2} L${ix2},${iy2} A52,52 0 ${lg} 0 ${ix1},${iy1}Z`
  }
  let cum = 0
  const sectors = slices.map(s => { const deg = (s.value / total) * 360; const start = cum; cum += deg; return { ...s, path: sector(start, cum) } })
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="-95 -95 190 190" className="w-40 h-40">
        {sectors.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2"><title>{s.label}: {s.value}</title></path>)}
        <text x="0" y="-5" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1A3A2C">{centerLabel ?? total}</text>
        <text x="0" y="10" textAnchor="middle" fontSize="7" fill="#9CA3AF">total</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-xs">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate max-w-[80px]" title={s.label}>{s.label}</span>
            <span className="font-semibold">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
function HBar({ data, labelKey, valueKey, color = '#5BBD9B', suffix = '' }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string; suffix?: string
}) {
  if (!data.length) return <div className="h-24 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-32 truncate shrink-0" title={d[labelKey]}>{d[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${(d[valueKey] / max) * 100}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-14 text-right shrink-0">{d[valueKey]}{suffix}</span>
        </div>
      ))}
    </div>
  )
}

// ── Bar vertical ──────────────────────────────────────────────────────────────
function BarV({ data, labelKey, valueKey, color = '#5BBD9B' }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string
}) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const W = 560, H = 180, PAD = { top: 20, right: 12, bottom: 44, left: 44 }
  const plotW = W - PAD.left - PAD.right; const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const n = data.length; const slotW = plotW / n; const barW = slotW * 0.6
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = PAD.top + plotH - f * plotH
        const v = f * maxVal
        return <g key={i}><line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F3F4F6" strokeWidth="1"/><text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">{v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}</text></g>
      })}
      {data.map((d, i) => {
        const x = PAD.left + i * slotW + (slotW - barW) / 2
        const h = Math.max(2, (d[valueKey] / maxVal) * plotH)
        const y = PAD.top + plotH - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={color} rx="3" opacity="0.9"><title>{d[labelKey]}: {d[valueKey]}</title></rect>
            <text x={x + barW / 2} y={PAD.top + plotH + 14} textAnchor="middle" fontSize="8" fill="#6B7280" transform={n > 6 ? `rotate(-30,${x + barW/2},${PAD.top + plotH + 14})` : ''}>{d[labelKey]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
      <div className="mb-4"><h3 className="font-bold text-[#1A3A2C] text-sm">{title}</h3>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color, highlight }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${highlight ? 'bg-[#1A3A2C] border-[#1A3A2C]' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: highlight ? 'rgba(255,255,255,0.15)' : `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color: highlight ? '#5BBD9B' : color }} />
        </div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-green-300' : 'text-gray-400'}`}>{label}</p>
      </div>
      <p className={`text-2xl font-bold leading-none ${highlight ? 'text-white' : 'text-[#1A3A2C]'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1.5 ${highlight ? 'text-green-300' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────────────────────
function exportarExcel(data: any, filtrosDesc: string) {
  const wb = XLSX.utils.book_new()

  // Aba 1: Lista completa
  const wsAtestados = XLSX.utils.aoa_to_sheet([
    ['Data Emissão', 'Paciente', 'CPF', 'Médico', 'Especialidade', 'CID', 'Dias', 'Data Início', 'Data Fim', 'Empresa'],
    ...data.registros.map((r: any) => [
      formatDate(r.data), r.paciente, r.cpf, r.medico, r.especialidade,
      r.cid, r.dias, formatDate(r.dataInicio), formatDate(r.dataFim), r.empresa,
    ])
  ])
  wsAtestados['!cols'] = [12,22,14,20,16,10,6,12,12,18].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsAtestados, 'Atestados')

  // Aba 2: Por CID
  const wsCID = XLSX.utils.aoa_to_sheet([
    ['CID', 'Atestados', 'Dias', 'Pacientes'],
    ...data.porCID.map((c: any) => [c.cid, c.atestados, c.dias, c.pacientes]),
  ])
  wsCID['!cols'] = [12, 10, 8, 10].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsCID, 'Por CID')

  // Aba 3: Por Médico
  const wsMed = XLSX.utils.aoa_to_sheet([
    ['Médico', 'Especialidade', 'Atestados', 'Dias'],
    ...data.porMedico.map((m: any) => [m.nome, m.especialidade, m.atestados, m.dias]),
  ])
  wsMed['!cols'] = [22, 18, 10, 8].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsMed, 'Por Médico')

  // Aba 4: Top Pacientes
  const wsPac = XLSX.utils.aoa_to_sheet([
    ['Paciente', 'Empresa', 'CID Principal', 'Atestados', 'Dias'],
    ...data.topPacientes.map((p: any) => [p.nome, p.empresa, p.cidPrincipal, p.atestados, p.dias]),
  ])
  wsPac['!cols'] = [22, 18, 14, 10, 8].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsPac, 'Top Pacientes')

  // Aba 5: Resumo KPIs
  const wsKpi = XLSX.utils.aoa_to_sheet([
    ['KPI', 'Valor'],
    ['Total de Atestados', data.kpis.total],
    ['Total de Dias', data.kpis.totalDias],
    ['Média por Atestado (dias)', data.kpis.mediaDias],
    ['Pacientes com Atestado', data.kpis.pacientesUnicos],
    ['', ''],
    ['Filtros aplicados:', filtrosDesc || 'Nenhum'],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
  ])
  wsKpi['!cols'] = [26, 14].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumo')

  const fileName = `atestados_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

function exportarPDF(data: any, filtrosDesc: string) {
  const win = window.open('', '_blank')
  if (!win) return

  const rows = data.registros.map((r: any, i: number) => `
    <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
      <td>${formatDate(r.data)}</td>
      <td>${r.paciente}</td>
      <td>${r.medico}</td>
      <td class="cid">${r.cid}</td>
      <td class="center">${r.dias}</td>
      <td>${r.empresa}</td>
    </tr>
  `).join('')

  const cidRows = data.porCID.slice(0, 15).map((c: any, i: number) => `
    <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
      <td class="cid">${c.cid}</td>
      <td class="center">${c.atestados}</td>
      <td class="center">${c.dias}</td>
      <td class="center">${c.pacientes}</td>
    </tr>
  `).join('')

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Atestados Médicos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #222; padding: 24px; }
    h1 { font-size: 16px; color: #1A3A2C; margin-bottom: 4px; }
    .sub { font-size: 10px; color: #666; margin-bottom: 16px; }
    .kpis { display: flex; gap: 12px; margin-bottom: 20px; }
    .kpi { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
    .kpi-val { font-size: 20px; font-weight: bold; color: #1A3A2C; }
    .kpi-lab { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    h2 { font-size: 12px; color: #1A3A2C; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 10px; }
    th { background: #1A3A2C; color: white; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 4px 8px; border-bottom: 1px solid #f0f0f0; }
    .center { text-align: center; }
    .cid { font-family: monospace; font-weight: bold; color: #1A3A2C; }
    .bg-white { background: #fff; }
    .bg-gray-50 { background: #f9fafb; }
    footer { margin-top: 24px; font-size: 9px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    @media print {
      body { padding: 12px; }
      @page { margin: 1.5cm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <h1>Relatório de Atestados Médicos</h1>
  <p class="sub">
    ${filtrosDesc ? `Filtros: ${filtrosDesc} · ` : ''}
    Gerado em ${new Date().toLocaleString('pt-BR')}
  </p>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${data.kpis.total}</div><div class="kpi-lab">Total de Atestados</div></div>
    <div class="kpi"><div class="kpi-val">${data.kpis.totalDias}</div><div class="kpi-lab">Total de Dias</div></div>
    <div class="kpi"><div class="kpi-val">${data.kpis.mediaDias}</div><div class="kpi-lab">Média (dias)</div></div>
    <div class="kpi"><div class="kpi-val">${data.kpis.pacientesUnicos}</div><div class="kpi-lab">Pacientes únicos</div></div>
  </div>

  <h2>Lista de Atestados</h2>
  <table>
    <thead><tr>
      <th>Data</th><th>Paciente</th><th>Médico</th><th>CID</th><th class="center">Dias</th><th>Empresa</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:12px">Sem dados</td></tr>'}</tbody>
  </table>

  <h2>Atestados por CID-10</h2>
  <table>
    <thead><tr>
      <th>CID</th><th class="center">Atestados</th><th class="center">Dias</th><th class="center">Pacientes</th>
    </tr></thead>
    <tbody>${cidRows || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:12px">Sem dados</td></tr>'}</tbody>
  </table>

  <footer>Documento gerado automaticamente pelo sistema RovarisMed · ${new Date().toLocaleDateString('pt-BR')}</footer>

  <script>window.onload = () => { window.print() }</script>
</body>
</html>`)
  win.document.close()
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function AdminAtestadosDashboard() {
  const [data, setData] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [exportando, setExportando] = useState(false)

  // Filtros
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [nomeInput, setNomeInput] = useState('')
  const [cidInput, setCidInput] = useState('')

  // Debounce textos
  const nomeDebounced = useDebounce(nomeInput, 350)
  const cidDebounced  = useDebounce(cidInput, 350)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const params = new URLSearchParams()
      if (dataInicio) params.set('dataInicio', dataInicio)
      if (dataFim)    params.set('dataFim', dataFim)
      if (empresaId)  params.set('empresa_id', empresaId)
      if (nomeDebounced) params.set('nome', nomeDebounced)
      if (cidDebounced)  params.set('cid', cidDebounced)

      const res = await fetch(`/api/admin/atestados?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar dados')
      setData(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [dataInicio, dataFim, empresaId, nomeDebounced, cidDebounced])

  useEffect(() => { carregar() }, [carregar])

  function limparFiltros() {
    setDataInicio(''); setDataFim(''); setEmpresaId(''); setNomeInput(''); setCidInput('')
  }

  const temFiltro = dataInicio || dataFim || empresaId || nomeInput || cidInput

  function descricaoFiltros() {
    const parts: string[] = []
    if (nomeInput) parts.push(`Paciente: "${nomeInput}"`)
    if (cidInput) parts.push(`CID: ${cidInput}`)
    if (empresaId && data?.empresas) {
      const emp = data.empresas.find((e: any) => e.id === empresaId)
      if (emp) parts.push(`Empresa: ${emp.nome}`)
    }
    if (dataInicio && dataFim) parts.push(`${formatDate(dataInicio)} – ${formatDate(dataFim)}`)
    else if (dataInicio) parts.push(`A partir de ${formatDate(dataInicio)}`)
    else if (dataFim) parts.push(`Até ${formatDate(dataFim)}`)
    return parts.join(' · ')
  }

  function handleExcelExport() {
    if (!data) return
    setExportando(true)
    setTimeout(() => {
      exportarExcel(data, descricaoFiltros())
      setExportando(false)
    }, 100)
  }

  function handlePDFExport() {
    if (!data) return
    exportarPDF(data, descricaoFiltros())
  }

  const k = data?.kpis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#5BBD9B]" /> Dashboard de Atestados
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Afastamentos médicos de todos os pacientes</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <button
                onClick={handleExcelExport}
                disabled={exportando || carregando}
                className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </button>
              <button
                onClick={handlePDFExport}
                disabled={carregando}
                className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                PDF
              </button>
            </>
          )}
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A3A2C] border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-[#5BBD9B]" />
          <span className="text-xs font-semibold text-[#1A3A2C] uppercase tracking-wide">Filtros</span>
          {temFiltro && (
            <button
              onClick={limparFiltros}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Data início */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-gray-700"
            />
          </div>
          {/* Data fim */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-gray-700"
            />
          </div>
          {/* Empresa */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Empresa</label>
            <select
              value={empresaId}
              onChange={e => setEmpresaId(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-gray-700 bg-white"
            >
              <option value="">Todas</option>
              {(data?.empresas ?? []).map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
              <option value="particular">Particular</option>
            </select>
          </div>
          {/* Busca por nome */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Busca por nome</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
              <input
                type="text"
                value={nomeInput}
                onChange={e => setNomeInput(e.target.value)}
                placeholder="Nome do paciente..."
                className="w-full text-xs border border-gray-200 rounded-lg pl-6 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-gray-700 placeholder-gray-300"
              />
            </div>
          </div>
          {/* Busca por CID */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Busca por CID</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
              <input
                type="text"
                value={cidInput}
                onChange={e => setCidInput(e.target.value.toUpperCase())}
                placeholder="Ex: J11, M54..."
                className="w-full text-xs border border-gray-200 rounded-lg pl-6 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-gray-700 placeholder-gray-300 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Indicador de filtros ativos */}
        {temFiltro && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-[#5BBD9B] font-semibold">Filtros ativos:</span>
            <span className="text-xs text-gray-500">{descricaoFiltros()}</span>
            {!carregando && data && (
              <span className="ml-auto text-xs text-gray-400">{data.kpis.total} resultado{data.kpis.total !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {carregando && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      )}

      {erro && !carregando && (
        <div className="text-center py-16 text-red-500 text-sm">
          {erro}
          <button onClick={carregar} className="block mx-auto mt-3 text-[#5BBD9B] hover:underline flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </button>
        </div>
      )}

      {!carregando && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total de Atestados" value={k.total} sub="emitidos no período" icon={FileText} color="#5BBD9B" highlight />
            <KpiCard label="Total de Dias" value={k.totalDias} sub="dias de afastamento" icon={Clock} color="#3B82F6" />
            <KpiCard label="Média por Atestado" value={`${k.mediaDias} dias`} sub="duração média" icon={Calendar} color="#F59E0B" />
            <KpiCard label="Pacientes com Atestado" value={k.pacientesUnicos} sub="pacientes únicos" icon={Users} color="#8B5CF6" />
          </div>

          {k.total === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-50">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                {temFiltro ? 'Nenhum atestado encontrado para estes filtros' : 'Nenhum atestado registrado ainda'}
              </p>
              {temFiltro && (
                <button onClick={limparFiltros} className="mt-3 text-sm text-[#5BBD9B] hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {k.total > 0 && (
            <>
              {/* Por mês */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Atestados por Mês" sub="Quantidade de atestados emitidos">
                  <BarV
                    data={data.porMes.map((d: any) => ({ ...d, mes: formatMes(d.mes) }))}
                    labelKey="mes" valueKey="atestados" color="#5BBD9B"
                  />
                </Card>
                <Card title="Dias de Afastamento por Mês" sub="Total de dias acumulados">
                  <BarV
                    data={data.porMes.map((d: any) => ({ ...d, mes: formatMes(d.mes) }))}
                    labelKey="mes" valueKey="dias" color="#3B82F6"
                  />
                </Card>
              </div>

              {/* Por sexo */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Atestados por Sexo" sub="Distribuição por gênero">
                  <DonutChart slices={data.porSexo.map((d: any) => ({
                    label: d.sexo,
                    value: d.atestados,
                    color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF',
                  }))} />
                </Card>
                <Card title="Dias por Sexo" sub="Total de dias afastados por gênero">
                  <DonutChart slices={data.porSexo.map((d: any) => ({
                    label: d.sexo,
                    value: d.dias,
                    color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF',
                  }))} centerLabel={String(k.totalDias)} />
                </Card>
              </div>

              {/* Por CID */}
              <Card title="Atestados por CID-10" sub="Diagnósticos mais frequentes no período selecionado">
                <div className="space-y-2">
                  {(data.porCID ?? []).slice(0, 12).map((c: any, i: number) => {
                    const max = (data.porCID ?? [])[0]?.atestados ?? 1
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#1A3A2C] w-20 shrink-0">{c.cid}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${(c.atestados / max) * 100}%`, backgroundColor: '#5BBD9B' }} />
                        </div>
                        <div className="flex items-center gap-3 text-xs shrink-0">
                          <span className="font-semibold text-gray-700 w-6 text-right">{c.atestados}</span>
                          <span className="text-gray-400 w-14 text-right">{c.dias} dias</span>
                          <span className="text-gray-400 w-20 text-right">{c.pacientes} paciente{c.pacientes !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )
                  })}
                  {(!data.porCID || data.porCID.length === 0) && (
                    <p className="text-xs text-gray-300 text-center py-4">Sem dados de CID</p>
                  )}
                </div>
              </Card>

              {/* Por médico */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Atestados por Médico" sub="Quantidade emitida por médico">
                  <HBar data={data.porMedico} labelKey="nome" valueKey="atestados" color="#8B5CF6" />
                </Card>
                <Card title="Dias por Médico" sub="Total de dias prescritos por médico">
                  <HBar data={data.porMedico} labelKey="nome" valueKey="dias" color="#6366F1" suffix=" dias" />
                </Card>
              </div>

              {/* Top pacientes */}
              <Card title="Top Pacientes por Dias de Afastamento" sub="Inclui CID mais frequente por paciente">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2.5 text-left">#</th>
                        <th className="px-4 py-2.5 text-left">Paciente</th>
                        <th className="px-4 py-2.5 text-left">Empresa</th>
                        <th className="px-4 py-2.5 text-left">CID Principal</th>
                        <th className="px-4 py-2.5 text-center">Atestados</th>
                        <th className="px-4 py-2.5 text-center">Dias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.topPacientes.map((p: any, i: number) => (
                        <tr key={i} className={`hover:bg-gray-50 ${i === 0 ? 'bg-amber-50' : ''}`}>
                          <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-[#1A3A2C] text-sm">{p.nome}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{p.empresa ?? 'Particular'}</td>
                          <td className="px-4 py-2.5">
                            {p.cidPrincipal && p.cidPrincipal !== '—' ? (
                              <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{p.cidPrincipal}</span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{p.atestados}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{p.dias}d</span>
                          </td>
                        </tr>
                      ))}
                      {data.topPacientes.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-gray-300 text-sm">Sem dados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Tabela de registros completa */}
              <Card title={`Lista Completa de Atestados (${data.registros.length})`} sub="Todos os atestados do período com detalhes completos">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Data</th>
                        <th className="px-3 py-2.5 text-left">Paciente</th>
                        <th className="px-3 py-2.5 text-left">Médico</th>
                        <th className="px-3 py-2.5 text-left">CID</th>
                        <th className="px-3 py-2.5 text-center">Dias</th>
                        <th className="px-3 py-2.5 text-left">Início</th>
                        <th className="px-3 py-2.5 text-left">Fim</th>
                        <th className="px-3 py-2.5 text-left">Empresa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.registros.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(r.data)}</td>
                          <td className="px-3 py-2 font-medium text-[#1A3A2C] whitespace-nowrap">{r.paciente}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.medico}</td>
                          <td className="px-3 py-2">
                            {r.cid && r.cid !== '—' ? (
                              <span className="font-mono font-bold text-[#1A3A2C] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-xs">{r.cid}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded">{r.dias}d</span>
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(r.dataInicio)}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(r.dataFim)}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.empresa}</td>
                        </tr>
                      ))}
                      {data.registros.length === 0 && (
                        <tr><td colSpan={8} className="py-8 text-center text-gray-300">Sem registros</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
