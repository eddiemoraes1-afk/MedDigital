'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Clock, Loader2, RefreshCw, Timer, Users, Search, Download, Printer,
  TrendingUp, Calendar, Stethoscope, Building2, X,
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

function fmtMin(min: number | null | undefined): string {
  if (min == null || isNaN(min)) return '—'
  if (min < 1) return `${Math.round(min * 60)}s`
  if (min < 60) return `${min.toFixed(1).replace('.0', '')}min`
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return `${h}h${m.toString().padStart(2, '0')}min`
}

function fmtDate(iso: string): string {
  if (!iso || iso === '—') return '—'
  const d = iso.slice(0, 10).split('-')
  return `${d[2]}/${d[1]}/${d[0]}`
}

function fmtMes(ym: string): string {
  const [y, m] = ym.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`
}

function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function firstOfMonth(): string {
  const t = todayStr()
  return t.slice(0, 7) + '-01'
}

// ── Donut ─────────────────────────────────────────────────────────────────────

function DonutChart({ slices, center }: {
  slices: { label: string; value: number; color: string }[]
  center?: string
}) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (!total) return <div className="h-36 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  function polar(deg: number, r: number): [number, number] {
    const rad = (deg - 90) * Math.PI / 180
    return [r * Math.cos(rad), r * Math.sin(rad)]
  }
  function sector(s: number, e: number) {
    if (e - s >= 360) e = s + 359.9
    const [x1,y1]=polar(s,80); const [x2,y2]=polar(e,80)
    const [ix2,iy2]=polar(e,52); const [ix1,iy1]=polar(s,52)
    const lg = e - s > 180 ? 1 : 0
    return `M${x1},${y1} A80,80 0 ${lg} 1 ${x2},${y2} L${ix2},${iy2} A52,52 0 ${lg} 0 ${ix1},${iy1}Z`
  }
  let cum = 0
  const sectors = slices.map(s => {
    const deg = (s.value / total) * 360; const start = cum; cum += deg
    return { ...s, path: sector(start, cum) }
  })
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="-95 -95 190 190" className="w-40 h-40">
        {sectors.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2">
            <title>{s.label}: {s.value}</title>
          </path>
        ))}
        <text x="0" y="-5" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1A3A2C">{center ?? total}</text>
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

// ── HBar dupla (espera + consulta) ────────────────────────────────────────────

function HBarDuplo({ data, labelKey }: {
  data: { [k: string]: any }[]
  labelKey: string
}) {
  if (!data.length) return <div className="h-24 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const maxE = Math.max(...data.map(d => d.mediaEspera ?? 0), 1)
  const maxC = Math.max(...data.map(d => d.mediaConsulta ?? 0), 1)
  const max  = Math.max(maxE, maxC)
  return (
    <div className="space-y-2.5">
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-32 truncate shrink-0" title={d[labelKey]}>{d[labelKey]}</span>
            <span className="text-gray-300 text-[10px] ml-auto">{d.total} cons.</span>
          </div>
          <div className="flex gap-1">
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-amber-400 transition-all" style={{ width: `${((d.mediaEspera ?? 0) / max) * 100}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-amber-600 w-14 text-right shrink-0">{fmtMin(d.mediaEspera)}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-[#5BBD9B] transition-all" style={{ width: `${((d.mediaConsulta ?? 0) / max) * 100}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-[#1A3A2C] w-14 text-right shrink-0">{fmtMin(d.mediaConsulta)}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-4 pt-1">
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2.5 h-1.5 rounded-full bg-amber-400" /> Espera
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2.5 h-1.5 rounded-full bg-[#5BBD9B]" /> Consulta
        </div>
      </div>
    </div>
  )
}

// ── BarV dupla ────────────────────────────────────────────────────────────────

function BarVDuplo({ data, labelKey }: {
  data: { [k: string]: any }[]
  labelKey: string
}) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const W = 560, H = 180, PAD = { top: 20, right: 12, bottom: 44, left: 44 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const allVals = data.flatMap(d => [d.mediaEspera ?? 0, d.mediaConsulta ?? 0])
  const maxVal  = Math.max(...allVals, 1)
  const n = data.length; const slotW = plotW / n; const barW = slotW * 0.35
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = PAD.top + plotH - f * plotH
          const v = f * maxVal
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F3F4F6" strokeWidth="1"/>
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">
                {v >= 60 ? `${(v/60).toFixed(1)}h` : `${v.toFixed(0)}m`}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const x0 = PAD.left + i * slotW + (slotW - barW * 2 - 2) / 2
          const hE = Math.max(2, ((d.mediaEspera ?? 0) / maxVal) * plotH)
          const hC = Math.max(2, ((d.mediaConsulta ?? 0) / maxVal) * plotH)
          const xC = PAD.left + i * slotW + slotW / 2 - barW / 2
          const lbl = d[labelKey]
          return (
            <g key={i}>
              <rect x={x0} y={PAD.top + plotH - hE} width={barW} height={hE} fill="#FBBF24" rx="2" opacity="0.85">
                <title>Espera: {fmtMin(d.mediaEspera)}</title>
              </rect>
              <rect x={xC} y={PAD.top + plotH - hC} width={barW} height={hC} fill="#5BBD9B" rx="2" opacity="0.85">
                <title>Consulta: {fmtMin(d.mediaConsulta)}</title>
              </rect>
              <text
                x={x0 + barW + 1} y={PAD.top + plotH + 14}
                textAnchor="middle" fontSize="8" fill="#6B7280"
                transform={n > 5 ? `rotate(-35,${x0 + barW + 1},${PAD.top + plotH + 14})` : ''}
              >
                {lbl}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex justify-center gap-5 mt-1">
        <div className="flex items-center gap-1 text-[11px] text-gray-500"><span className="w-3 h-2.5 rounded-sm bg-amber-400 inline-block" /> Espera</div>
        <div className="flex items-center gap-1 text-[11px] text-gray-500"><span className="w-3 h-2.5 rounded-sm bg-[#5BBD9B] inline-block" /> Consulta</div>
      </div>
    </div>
  )
}

// ── Mini KPI ──────────────────────────────────────────────────────────────────

function KPI({ icon, label, value, sub, color = '#5BBD9B' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color + '20' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-[#1A3A2C] leading-tight">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── PDF ───────────────────────────────────────────────────────────────────────

function imprimirTempo(data: any, filtros: string) {
  const { kpis, porMedico, porEmpresa, porPaciente } = data
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Tempo de Atendimento</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #1A3A2C; padding: 24px; }
h1 { font-size: 18px; margin-bottom: 4px; }
.sub { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
h2 { font-size: 12px; margin: 18px 0 8px; color: #5BBD9B; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th { text-align: left; font-size: 10px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 5px 8px; }
td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
.kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
.kpi { background: #f9fafb; border-radius: 8px; padding: 12px; }
.kpi-val { font-size: 20px; font-weight: bold; color: #1A3A2C; }
.kpi-lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
.badge { display:inline-block; padding:1px 7px; border-radius:999px; font-size:9px; font-weight:700; }
.amber { background:#fef3c7;color:#92400e; }
.green { background:#d1fae5;color:#065f46; }
@media print { @page { margin:14mm; } }
</style></head><body>
<h1>Análise de Tempo de Atendimento</h1>
<p class="sub">${filtros}</p>
<div class="kpis">
  <div class="kpi"><div class="kpi-val">${kpis.totalConsultas}</div><div class="kpi-lbl">Consultas com dados</div></div>
  <div class="kpi"><div class="kpi-val">${fmtMin(kpis.mediaEspera)}</div><div class="kpi-lbl">Tempo médio de espera</div></div>
  <div class="kpi"><div class="kpi-val">${fmtMin(kpis.mediaConsulta)}</div><div class="kpi-lbl">Tempo médio de consulta</div></div>
  <div class="kpi"><div class="kpi-val">${fmtMin(kpis.somaEspera)}</div><div class="kpi-lbl">Total em espera</div></div>
  <div class="kpi"><div class="kpi-val">${fmtMin(kpis.somaConsulta)}</div><div class="kpi-lbl">Total em consulta</div></div>
  <div class="kpi"><div class="kpi-val">${kpis.pacientesUnicos}</div><div class="kpi-lbl">Pacientes únicos</div></div>
</div>
<h2>Por Médico</h2>
<table><thead><tr><th>Médico</th><th>Especialidade</th><th>Consultas</th><th>Média Espera</th><th>Média Consulta</th><th>Total Espera</th><th>Total Consulta</th></tr></thead><tbody>
${porMedico.slice(0,20).map((m: any) => `<tr><td>${m.nome}</td><td>${m.especialidade||'—'}</td><td>${m.total}</td><td><span class="badge amber">${fmtMin(m.mediaEspera)}</span></td><td><span class="badge green">${fmtMin(m.mediaConsulta)}</span></td><td>${fmtMin(m.somaEspera)}</td><td>${fmtMin(m.somaConsulta)}</td></tr>`).join('')}
</tbody></table>
<h2>Por Empresa</h2>
<table><thead><tr><th>Empresa</th><th>Consultas</th><th>Média Espera</th><th>Média Consulta</th></tr></thead><tbody>
${porEmpresa.slice(0,15).map((e: any) => `<tr><td>${e.nome}</td><td>${e.total}</td><td>${fmtMin(e.mediaEspera)}</td><td>${fmtMin(e.mediaConsulta)}</td></tr>`).join('')}
</tbody></table>
<h2>Top Pacientes</h2>
<table><thead><tr><th>Paciente</th><th>Empresa</th><th>Consultas</th><th>Média Espera</th><th>Média Consulta</th></tr></thead><tbody>
${porPaciente.slice(0,15).map((p: any) => `<tr><td>${p.nome}</td><td>${p.empresa}</td><td>${p.total}</td><td>${fmtMin(p.mediaEspera)}</td><td>${fmtMin(p.mediaConsulta)}</td></tr>`).join('')}
</tbody></table>
</body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 600)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

function exportExcel(data: any, filtros: string) {
  const { kpis, porMedico, porEmpresa, porPaciente, porData, registros } = data
  const wb = XLSX.utils.book_new()

  // Resumo
  const resumo = [
    ['Análise de Tempo de Atendimento'],
    ['Filtros:', filtros],
    [],
    ['KPI', 'Valor'],
    ['Total de consultas', kpis.totalConsultas],
    ['Pacientes únicos', kpis.pacientesUnicos],
    ['Tempo médio de espera (min)', kpis.mediaEspera],
    ['Tempo médio de consulta (min)', kpis.mediaConsulta],
    ['Soma total espera (min)', kpis.somaEspera],
    ['Soma total consulta (min)', kpis.somaConsulta],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo')

  // Por Médico
  const medRows = [['Médico','Especialidade','Consultas','Média Espera (min)','Média Consulta (min)','Soma Espera (min)','Soma Consulta (min)']]
  porMedico.forEach((m: any) => medRows.push([m.nome, m.especialidade||'', m.total, m.mediaEspera, m.mediaConsulta, m.somaEspera, m.somaConsulta]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(medRows), 'Por Médico')

  // Por Empresa
  const empRows = [['Empresa','Consultas','Média Espera (min)','Média Consulta (min)']]
  porEmpresa.forEach((e: any) => empRows.push([e.nome, e.total, e.mediaEspera, e.mediaConsulta]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(empRows), 'Por Empresa')

  // Por Paciente
  const pacRows = [['Paciente','Empresa','Consultas','Média Espera (min)','Média Consulta (min)']]
  porPaciente.forEach((p: any) => pacRows.push([p.nome, p.empresa, p.total, p.mediaEspera, p.mediaConsulta]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pacRows), 'Por Paciente')

  // Por Data
  const dataRows = [['Data','Consultas','Média Espera (min)','Média Consulta (min)']]
  porData.forEach((d: any) => dataRows.push([fmtDate(d.data), d.total, d.mediaEspera, d.mediaConsulta]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dataRows), 'Por Data')

  // Registros
  const recRows = [['Data','Paciente','Médico','Especialidade','Empresa','Espera (min)','Consulta (min)']]
  registros.forEach((r: any) => recRows.push([
    fmtDate(r.data), r.paciente, r.medico, r.especialidade, r.empresa,
    r.espera_min !== '' ? r.espera_min : '—',
    r.consulta_min !== '' ? r.consulta_min : '—',
  ]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recRows), 'Registros')

  XLSX.writeFile(wb, `tempo-atendimento-${todayStr()}.xlsx`)
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TempoDashboard() {
  const [dataInicio, setDataInicio]   = useState(firstOfMonth())
  const [dataFim,    setDataFim]      = useState(todayStr())
  const [empresaId,  setEmpresaId]    = useState('')
  const [medicoId,   setMedicoId]     = useState('')
  const [nomePac,    setNomePac]      = useState('')
  const [loading,    setLoading]      = useState(false)
  const [data,       setData]         = useState<any>(null)
  const [erro,       setErro]         = useState('')
  const [activeTable, setActiveTable] = useState<'medico'|'empresa'|'paciente'|'data'|'registros'>('medico')

  const nomeDeb = useDebounce(nomePac, 350)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true); setErro('')
    try {
      const p = new URLSearchParams()
      if (dataInicio) p.set('dataInicio', dataInicio)
      if (dataFim)    p.set('dataFim',    dataFim)
      if (empresaId)  p.set('empresa_id', empresaId)
      if (medicoId)   p.set('medico_id',  medicoId)
      if (nomeDeb)    p.set('nome',       nomeDeb)
      const res = await fetch(`/api/admin/tempo?${p}`, { signal: abortRef.current.signal })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro')
      setData(await res.json())
    } catch (e: any) {
      if (e.name !== 'AbortError') setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim, empresaId, medicoId, nomeDeb])

  useEffect(() => { fetchData() }, [fetchData])

  const empresas = data?.empresas ?? []
  const medicos  = data?.medicos  ?? []

  function filtrosStr() {
    const parts: string[] = []
    if (dataInicio || dataFim) parts.push(`${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`)
    if (empresaId) {
      const e = empresas.find((x: any) => x.id === empresaId)
      if (e) parts.push(e.nome)
    }
    if (medicoId) {
      const m = medicos.find((x: any) => x.id === medicoId)
      if (m) parts.push(m.nome)
    }
    if (nomePac) parts.push(`Paciente: ${nomePac}`)
    return parts.join(' · ') || 'Todos os registros'
  }

  const tabBtn = (key: typeof activeTable, label: string) => (
    <button
      onClick={() => setActiveTable(key)}
      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
        activeTable === key
          ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]'
          : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Search className="w-4 h-4" /> Filtros
          </div>

          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
          <span className="text-gray-400 text-sm">até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />

          <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
            <option value="">Todas as empresas</option>
            <option value="__particular__">Particular</option>
            {empresas.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>

          <select value={medicoId} onChange={e => setMedicoId(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
            <option value="">Todos os médicos</option>
            {medicos.map((m: any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" placeholder="Buscar paciente…" value={nomePac}
              onChange={e => setNomePac(e.target.value)}
              className="border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 w-44"
            />
            {nomePac && (
              <button onClick={() => setNomePac('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {data && (
              <>
                <button
                  onClick={() => exportExcel(data, filtrosStr())}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-green-600" /> Excel
                </button>
                <button
                  onClick={() => imprimirTempo(data, filtrosStr())}
                  className="flex items-center gap-1.5 border border-red-100 text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" /> PDF
                </button>
              </>
            )}
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 bg-[#1A3A2C] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#5BBD9B] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* ── Estado ── */}
      {loading && (
        <div className="bg-white rounded-2xl p-12 shadow-sm flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando dados de tempo…
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-700 text-sm">
          {erro} <button onClick={fetchData} className="underline ml-2">Tentar novamente</button>
        </div>
      )}

      {data && !loading && (() => {
        const { kpis, porMes, porMedico, porEmpresa, porPaciente, porData, registros } = data

        if (!kpis.totalConsultas) return (
          <div className="bg-white rounded-2xl p-16 shadow-sm text-center">
            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Nenhuma consulta com dados de tempo no período</p>
            <p className="text-xs text-gray-300 mt-1">Apenas consultas com <code>iniciado_em</code> e <code>finalizado_em</code> são contabilizadas</p>
          </div>
        )

        const porEsperaDonut = porEmpresa.slice(0, 6).map((e: any, i: number) => ({
          label: e.nome,
          value: e.total,
          color: ['#5BBD9B','#3B82F6','#F59E0B','#8B5CF6','#EF4444','#14B8A6'][i % 6],
        }))

        return (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPI icon={<Clock className="w-5 h-5" />}   label="Consultas analisadas" value={String(kpis.totalConsultas)} color="#1A3A2C" />
              <KPI icon={<Users className="w-5 h-5" />}   label="Pacientes únicos"     value={String(kpis.pacientesUnicos)} color="#3B82F6" />
              <KPI icon={<Timer className="w-5 h-5" />}   label="Média de espera"      value={fmtMin(kpis.mediaEspera)}   color="#F59E0B" />
              <KPI icon={<Stethoscope className="w-5 h-5" />} label="Média de consulta" value={fmtMin(kpis.mediaConsulta)} color="#5BBD9B" />
              <KPI icon={<TrendingUp className="w-5 h-5" />} label="Total em espera"    value={fmtMin(kpis.somaEspera)}   color="#F59E0B" sub="soma do período" />
              <KPI icon={<TrendingUp className="w-5 h-5" />} label="Total em consulta"  value={fmtMin(kpis.somaConsulta)} color="#5BBD9B" sub="soma do período" />
            </div>

            {/* Gráfico por mês */}
            {porMes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-[#1A3A2C] text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#5BBD9B]" /> Tempo médio por mês
                  </h2>
                  <span className="text-xs text-gray-400">{porMes.length} mês(es)</span>
                </div>
                <div className="px-6 py-4">
                  <BarVDuplo data={porMes.map((m: any) => ({ ...m, label: fmtMes(m.mes) }))} labelKey="label" />
                </div>
              </div>
            )}

            {/* 2 colunas: por médico + por empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#5BBD9B]" />
                  <h2 className="font-bold text-[#1A3A2C] text-sm">Tempo médio por médico</h2>
                </div>
                <div className="px-6 py-4">
                  <HBarDuplo data={porMedico} labelKey="nome" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <h2 className="font-bold text-[#1A3A2C] text-sm">Distribuição por empresa</h2>
                </div>
                <div className="px-6 py-4">
                  <DonutChart slices={porEsperaDonut} center={String(kpis.totalConsultas)} />
                </div>
              </div>
            </div>

            {/* Por empresa detalhado */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <h2 className="font-bold text-[#1A3A2C] text-sm">Tempo médio por empresa</h2>
              </div>
              <div className="px-6 py-4">
                <HBarDuplo data={porEmpresa} labelKey="nome" />
              </div>
            </div>

            {/* Tabelas detalhadas */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <h2 className="font-bold text-[#1A3A2C] text-sm">Detalhamento</h2>
                <div className="flex flex-wrap gap-2">
                  {tabBtn('medico',    'Por Médico')}
                  {tabBtn('empresa',   'Por Empresa')}
                  {tabBtn('paciente',  'Por Paciente')}
                  {tabBtn('data',      'Por Data')}
                  {tabBtn('registros', 'Registros')}
                </div>
              </div>

              <div className="overflow-x-auto">

                {activeTable === 'medico' && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-semibold">Médico</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Especialidade</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Consultas</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Espera</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Consulta</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Total Espera</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Total Consulta</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {porMedico.map((m: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-semibold text-[#1A3A2C]">{m.nome}</td>
                          <td className="px-4 py-3 text-gray-500">{m.especialidade || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold">{m.total}</td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(m.mediaEspera)}</span></td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(m.mediaConsulta)}</span></td>
                          <td className="px-4 py-3 text-right text-gray-500">{fmtMin(m.somaEspera)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{fmtMin(m.somaConsulta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTable === 'empresa' && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-semibold">Empresa</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Consultas</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Espera</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Consulta</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {porEmpresa.map((e: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-semibold text-[#1A3A2C]">{e.nome}</td>
                          <td className="px-4 py-3 text-right font-semibold">{e.total}</td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(e.mediaEspera)}</span></td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(e.mediaConsulta)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTable === 'paciente' && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-semibold">Paciente</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Empresa</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Consultas</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Espera</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Consulta</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {porPaciente.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-semibold text-[#1A3A2C]">{p.nome}</td>
                          <td className="px-4 py-3 text-gray-500">{p.empresa}</td>
                          <td className="px-4 py-3 text-right font-semibold">{p.total}</td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(p.mediaEspera)}</span></td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(p.mediaConsulta)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTable === 'data' && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-semibold">Data</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Consultas</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Espera</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Méd. Consulta</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...porData].reverse().map((d: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-semibold text-[#1A3A2C]">{fmtDate(d.data)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{d.total}</td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(d.mediaEspera)}</span></td>
                          <td className="px-4 py-3 text-right"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{fmtMin(d.mediaConsulta)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTable === 'registros' && (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-semibold">Data</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Paciente</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Médico</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Empresa</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Espera</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Consulta</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {registros.slice(0, 100).map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-2 text-gray-500 text-xs">{fmtDate(r.data)}</td>
                          <td className="px-4 py-2 font-semibold text-[#1A3A2C]">{r.paciente}</td>
                          <td className="px-4 py-2 text-gray-600">{r.medico}</td>
                          <td className="px-4 py-2 text-gray-500">{r.empresa}</td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                              {r.espera_min !== '' ? fmtMin(r.espera_min) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                              {r.consulta_min !== '' ? fmtMin(r.consulta_min) : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {registros.length > 100 && (
                        <tr><td colSpan={6} className="px-6 py-3 text-center text-xs text-gray-400">
                          Mostrando 100 de {registros.length} registros · Use Excel para exportar tudo
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                )}

              </div>
            </div>
          </>
        )
      })()}

    </div>
  )
}
