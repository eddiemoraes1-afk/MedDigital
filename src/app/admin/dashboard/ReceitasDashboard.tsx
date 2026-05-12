'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, RefreshCw, Pill, Calendar, Users, DollarSign,
  Search, Filter, X, Download, Printer, Package,
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => {
    const h = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(h)
  }, [value, delay])
  return dv
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMes(ym: string) {
  const [y, m] = ym.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(m)-1]}/${y.slice(2)}`
}
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: string) {
  if (!d || d === '—') return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

const TIPO_LABEL: Record<string, string> = {
  simples: 'Simples',
  especial: 'Especial',
  antimicrobiano: 'Antimicrobiano',
}
const TIPO_COLOR: Record<string, string> = {
  simples: '#5BBD9B',
  especial: '#8B5CF6',
  antimicrobiano: '#3B82F6',
}

// ── SVG Donut ─────────────────────────────────────────────────────────────────
function DonutChart({ slices, centerLabel }: {
  slices: { label: string; value: number; color: string }[]
  centerLabel?: string
}) {
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
        <text x="0" y="-5" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1A3A2C">{centerLabel ?? total}</text>
        <text x="0" y="10" textAnchor="middle" fontSize="7" fill="#9CA3AF">total</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-xs">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate max-w-[90px]" title={s.label}>{s.label}</span>
            <span className="font-semibold">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
function HBar({ data, labelKey, valueKey, color = '#5BBD9B', suffix = '', maxItems = 10 }: {
  data: Record<string, any>[]
  labelKey: string; valueKey: string; color?: string; suffix?: string; maxItems?: number
}) {
  if (!data.length) return <div className="h-24 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, maxItems).map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-36 truncate shrink-0" title={d[labelKey]}>{d[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${(d[valueKey] / max) * 100}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-12 text-right shrink-0">{d[valueKey]}{suffix}</span>
        </div>
      ))}
    </div>
  )
}

// ── Vertical Bar ──────────────────────────────────────────────────────────────
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
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F3F4F6" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">
              {v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const x = PAD.left + i * slotW + (slotW - barW) / 2
        const h = Math.max(2, (d[valueKey] / maxVal) * plotH)
        const y = PAD.top + plotH - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={color} rx="3" opacity="0.9">
              <title>{d[labelKey]}: {d[valueKey]}</title>
            </rect>
            <text
              x={x + barW / 2} y={PAD.top + plotH + 14}
              textAnchor="middle" fontSize="8" fill="#6B7280"
              transform={n > 6 ? `rotate(-30,${x + barW/2},${PAD.top + plotH + 14})` : ''}
            >
              {d[labelKey]}
            </text>
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
      <div className="mb-4">
        <h3 className="font-bold text-[#1A3A2C] text-sm">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
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
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: highlight ? 'rgba(255,255,255,0.15)' : `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color: highlight ? '#5BBD9B' : color }} />
        </div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-green-300' : 'text-gray-400'}`}>{label}</p>
      </div>
      <p className={`text-2xl font-bold leading-none ${highlight ? 'text-white' : 'text-[#1A3A2C]'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1.5 ${highlight ? 'text-green-300' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}

// ── Exportação Excel ──────────────────────────────────────────────────────────
function exportarExcel(data: any, filtrosDesc: string) {
  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Data', 'Paciente', 'CPF', 'Sexo', 'Médico', 'Especialidade', 'Tipo', 'Medicamentos', 'Qtd Meds', 'Empresa', 'Status', 'Validade', 'Valor (R$)'],
    ...data.registros.map((r: any) => [
      fmtDate(r.data), r.paciente, r.cpf, r.sexo, r.medico, r.especialidade,
      r.tipo, r.medicamentos, r.qtdMedicamentos, r.empresa, r.status,
      fmtDate(r.validade), r.valorCobrado,
    ])
  ])
  ws1['!cols'] = [12,22,14,5,20,16,14,40,8,18,10,12,12].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws1, 'Receitas')

  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Medicamento', 'Prescrições'],
    ...data.topMedicamentos.map((m: any) => [m.nome, m.receitas]),
  ])
  ws2['!cols'] = [28, 12].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws2, 'Top Medicamentos')

  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Médico', 'Especialidade', 'Receitas', 'Medicamentos'],
    ...data.porMedico.map((m: any) => [m.nome, m.especialidade, m.receitas, m.medicamentos]),
  ])
  ws3['!cols'] = [22, 18, 10, 12].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws3, 'Por Médico')

  const ws4 = XLSX.utils.aoa_to_sheet([
    ['Empresa', 'Receitas', 'Medicamentos'],
    ...data.porEmpresa.map((e: any) => [e.nome, e.receitas, e.medicamentos]),
  ])
  ws4['!cols'] = [22, 10, 12].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws4, 'Por Empresa')

  const ws5 = XLSX.utils.aoa_to_sheet([
    ['Paciente', 'Empresa', 'Receitas', 'Medicamentos', 'Tipo Mais Freq.'],
    ...data.topPacientes.map((p: any) => [p.nome, p.empresa, p.receitas, p.medicamentos, TIPO_LABEL[p.tipoFreq] ?? p.tipoFreq]),
  ])
  ws5['!cols'] = [22, 18, 10, 12, 14].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws5, 'Top Pacientes')

  const ws6 = XLSX.utils.aoa_to_sheet([
    ['KPI', 'Valor'],
    ['Total de Receitas', data.kpis.total],
    ['Total de Medicamentos', data.kpis.totalMedicamentos],
    ['Pacientes Atendidos', data.kpis.pacientesUnicos],
    ['Valor Total (R$)', data.kpis.valorTotal],
    ['', ''],
    ['Filtros:', filtrosDesc || 'Nenhum'],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
  ])
  ws6['!cols'] = [26, 14].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws6, 'Resumo')

  XLSX.writeFile(wb, `receitas_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── Exportação PDF ────────────────────────────────────────────────────────────
function exportarPDF(data: any, filtrosDesc: string) {
  const win = window.open('', '_blank')
  if (!win) return

  const rows = data.registros.map((r: any, i: number) => `
    <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
      <td>${fmtDate(r.data)}</td>
      <td>${r.paciente}</td>
      <td>${r.medico}</td>
      <td class="tipo">${r.tipo}</td>
      <td class="meds">${r.medicamentos}</td>
      <td class="center">${r.qtdMedicamentos}</td>
      <td>${r.empresa}</td>
    </tr>
  `).join('')

  const medRows = data.topMedicamentos.slice(0, 20).map((m: any, i: number) => `
    <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
      <td class="rank">${i + 1}</td>
      <td>${m.nome}</td>
      <td class="center">${m.receitas}</td>
    </tr>
  `).join('')

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Receitas Médicas</title>
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
    .meds { font-family: monospace; font-size: 9px; max-width: 200px; }
    .tipo { font-weight: bold; color: #5BBD9B; }
    .rank { color: #aaa; font-weight: bold; }
    .bg-white { background: #fff; }
    .bg-gray-50 { background: #f9fafb; }
    footer { margin-top: 24px; font-size: 9px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    @media print { body { padding: 12px; } @page { margin: 1.5cm; size: A4 landscape; } }
  </style>
</head>
<body>
  <h1>Relatório de Receitas Médicas</h1>
  <p class="sub">${filtrosDesc ? `Filtros: ${filtrosDesc} · ` : ''}Gerado em ${new Date().toLocaleString('pt-BR')}</p>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${data.kpis.total}</div><div class="kpi-lab">Total de Receitas</div></div>
    <div class="kpi"><div class="kpi-val">${data.kpis.totalMedicamentos}</div><div class="kpi-lab">Medicamentos</div></div>
    <div class="kpi"><div class="kpi-val">${data.kpis.pacientesUnicos}</div><div class="kpi-lab">Pacientes únicos</div></div>
    <div class="kpi"><div class="kpi-val">${fmt(data.kpis.valorTotal)}</div><div class="kpi-lab">Valor Total</div></div>
  </div>

  <h2>Lista de Receitas</h2>
  <table>
    <thead><tr>
      <th>Data</th><th>Paciente</th><th>Médico</th><th>Tipo</th><th>Medicamentos</th><th class="center">Qtd</th><th>Empresa</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:12px">Sem dados</td></tr>'}</tbody>
  </table>

  <h2>Top Medicamentos Prescritos</h2>
  <table>
    <thead><tr><th>#</th><th>Medicamento</th><th class="center">Prescrições</th></tr></thead>
    <tbody>${medRows || '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:12px">Sem dados</td></tr>'}</tbody>
  </table>

  <footer>Documento gerado automaticamente pelo sistema RovarisMed · ${new Date().toLocaleDateString('pt-BR')}</footer>
  <script>window.onload = () => { window.print() }</script>
</body>
</html>`)
  win.document.close()
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function AdminReceitasDashboard() {
  const [data, setData] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Filtros — padrão: 1º do mês corrente até hoje
  const [dataInicio, setDataInicio]   = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  })
  const [dataFim, setDataFim]         = useState(() => new Date().toISOString().split('T')[0])
  const [empresaId, setEmpresaId]     = useState('')
  const [tipoFiltro, setTipoFiltro]   = useState('')
  const [nomeInput, setNomeInput]     = useState('')
  const [medInput, setMedInput]       = useState('')

  const nomeDebounced = useDebounce(nomeInput, 350)
  const medDebounced  = useDebounce(medInput, 350)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const params = new URLSearchParams()
      if (dataInicio)    params.set('dataInicio', dataInicio)
      if (dataFim)       params.set('dataFim', dataFim)
      if (empresaId)     params.set('empresa_id', empresaId)
      if (tipoFiltro)    params.set('tipo', tipoFiltro)
      if (nomeDebounced) params.set('nome', nomeDebounced)
      if (medDebounced)  params.set('medicamento', medDebounced)
      const res = await fetch(`/api/admin/receitas?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar dados')
      setData(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [dataInicio, dataFim, empresaId, tipoFiltro, nomeDebounced, medDebounced])

  useEffect(() => { carregar() }, [carregar])

  function limparFiltros() {
    setDataInicio(''); setDataFim(''); setEmpresaId('')
    setTipoFiltro(''); setNomeInput(''); setMedInput('')
  }

  const temFiltro = dataInicio || dataFim || empresaId || tipoFiltro || nomeInput || medInput

  function descricaoFiltros() {
    const parts: string[] = []
    if (nomeInput) parts.push(`Paciente: "${nomeInput}"`)
    if (medInput)  parts.push(`Medicamento: "${medInput}"`)
    if (tipoFiltro) parts.push(`Tipo: ${TIPO_LABEL[tipoFiltro] ?? tipoFiltro}`)
    if (empresaId && data?.empresas) {
      const emp = data.empresas.find((e: any) => e.id === empresaId)
      if (emp) parts.push(`Empresa: ${emp.nome}`)
    }
    if (dataInicio && dataFim) parts.push(`${fmtDate(dataInicio)} – ${fmtDate(dataFim)}`)
    else if (dataInicio) parts.push(`A partir de ${fmtDate(dataInicio)}`)
    else if (dataFim)    parts.push(`Até ${fmtDate(dataFim)}`)
    return parts.join(' · ')
  }

  const k = data?.kpis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-500" /> Dashboard de Receitas
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Receitas emitidas pelos médicos em todas as consultas</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <button
                onClick={() => exportarExcel(data, descricaoFiltros())}
                disabled={carregando}
                className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => exportarPDF(data, descricaoFiltros())}
                disabled={carregando}
                className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            </>
          )}
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A3A2C] border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-[#1A3A2C] uppercase tracking-wide">Filtros</span>
          {temFiltro && (
            <button onClick={limparFiltros} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Empresa</label>
            <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 bg-white">
              <option value="">Todas</option>
              {(data?.empresas ?? []).map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo de receita</label>
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 bg-white">
              <option value="">Todos</option>
              <option value="simples">Simples</option>
              <option value="especial">Especial</option>
              <option value="antimicrobiano">Antimicrobiano</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Busca por nome</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
              <input type="text" value={nomeInput} onChange={e => setNomeInput(e.target.value)}
                placeholder="Nome do paciente..."
                className="w-full text-xs border border-gray-200 rounded-lg pl-6 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 placeholder-gray-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Busca por medicamento</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
              <input type="text" value={medInput} onChange={e => setMedInput(e.target.value)}
                placeholder="Ex: Amoxicilina..."
                className="w-full text-xs border border-gray-200 rounded-lg pl-6 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 placeholder-gray-300" />
            </div>
          </div>
        </div>

        {temFiltro && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-purple-500 font-semibold">Filtros ativos:</span>
            <span className="text-xs text-gray-500">{descricaoFiltros()}</span>
            {!carregando && data && (
              <span className="ml-auto text-xs text-gray-400">{data.kpis.total} resultado{data.kpis.total !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {carregando && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      )}

      {erro && !carregando && (
        <div className="text-center py-16 text-red-500 text-sm">
          {erro}
          <button onClick={carregar} className="block mx-auto mt-3 text-purple-500 hover:underline flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </button>
        </div>
      )}

      {!carregando && data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total de Receitas" value={k.total} sub="emitidas no período" icon={Pill} color="#8B5CF6" highlight />
            <KpiCard label="Medicamentos" value={k.totalMedicamentos} sub="prescrições totais" icon={Package} color="#3B82F6" />
            <KpiCard label="Pacientes Atendidos" value={k.pacientesUnicos} sub="pacientes únicos" icon={Users} color="#F59E0B" />
            <KpiCard label="Valor Total" value={fmt(k.valorTotal)} sub="receitas emitidas" icon={DollarSign} color="#10B981" />
          </div>

          {k.total === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-50">
              <Pill className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                {temFiltro ? 'Nenhuma receita encontrada para estes filtros' : 'Nenhuma receita registrada ainda'}
              </p>
              {temFiltro && (
                <button onClick={limparFiltros} className="mt-3 text-sm text-purple-500 hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {k.total > 0 && (
            <>
              {/* Por mês */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Receitas por Mês" sub="Quantidade de receitas emitidas">
                  <BarV
                    data={data.porMes.map((d: any) => ({ ...d, mes: formatMes(d.mes) }))}
                    labelKey="mes" valueKey="receitas" color="#8B5CF6"
                  />
                </Card>
                <Card title="Medicamentos Prescritos por Mês" sub="Total de medicamentos por mês">
                  <BarV
                    data={data.porMes.map((d: any) => ({ ...d, mes: formatMes(d.mes) }))}
                    labelKey="mes" valueKey="medicamentos" color="#3B82F6"
                  />
                </Card>
              </div>

              {/* Tipo + Sexo */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card title="Por Tipo de Receita" sub="Distribuição por categoria">
                  <DonutChart slices={data.porTipo.map((d: any) => ({
                    label: TIPO_LABEL[d.tipo] ?? d.tipo,
                    value: d.receitas,
                    color: TIPO_COLOR[d.tipo] ?? '#9CA3AF',
                  }))} />
                </Card>
                <Card title="Receitas por Sexo" sub="Distribuição por gênero">
                  <DonutChart slices={data.porSexo.map((d: any) => ({
                    label: d.sexo,
                    value: d.receitas,
                    color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF',
                  }))} />
                </Card>
                <Card title="Medicamentos por Sexo" sub="Prescrições por gênero">
                  <DonutChart slices={data.porSexo.map((d: any) => ({
                    label: d.sexo,
                    value: d.medicamentos,
                    color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF',
                  }))} centerLabel={String(k.totalMedicamentos)} />
                </Card>
              </div>

              {/* Top medicamentos */}
              <Card title="Top Medicamentos Mais Prescritos" sub="Medicamentos com maior frequência de prescrição no período">
                <div className="space-y-2">
                  {data.topMedicamentos.map((m: any, i: number) => {
                    const max = data.topMedicamentos[0]?.receitas ?? 1
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-5 text-right shrink-0 font-semibold">{i + 1}</span>
                        <span className="text-xs font-mono font-medium text-[#1A3A2C] w-44 truncate shrink-0" title={m.nome}>{m.nome}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${(m.receitas / max) * 100}%`, backgroundColor: '#8B5CF6' }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-20 text-right shrink-0">
                          {m.receitas} prescr.
                        </span>
                      </div>
                    )
                  })}
                  {data.topMedicamentos.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-4">Sem dados</p>
                  )}
                </div>
              </Card>

              {/* Por médico + empresa */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Receitas por Médico" sub="Quantidade de receitas emitidas por médico">
                  <HBar data={data.porMedico} labelKey="nome" valueKey="receitas" color="#8B5CF6" />
                </Card>
                <Card title="Receitas por Empresa" sub="Quantidade de receitas por empresa/plano">
                  <HBar data={data.porEmpresa} labelKey="nome" valueKey="receitas" color="#10B981" />
                </Card>
              </div>

              {/* Medicamentos por médico + empresa */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card title="Medicamentos por Médico" sub="Total de itens prescritos por médico">
                  <HBar data={data.porMedico} labelKey="nome" valueKey="medicamentos" color="#6366F1" suffix=" meds" />
                </Card>
                <Card title="Medicamentos por Empresa" sub="Total de itens prescritos por empresa">
                  <HBar data={data.porEmpresa} labelKey="nome" valueKey="medicamentos" color="#F59E0B" suffix=" meds" />
                </Card>
              </div>

              {/* Top pacientes */}
              <Card title="Top Pacientes por Receitas" sub="Pacientes com maior número de receitas emitidas">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-2.5 text-left">#</th>
                        <th className="px-4 py-2.5 text-left">Paciente</th>
                        <th className="px-4 py-2.5 text-left">Empresa</th>
                        <th className="px-4 py-2.5 text-left">Tipo Freq.</th>
                        <th className="px-4 py-2.5 text-center">Receitas</th>
                        <th className="px-4 py-2.5 text-center">Medicamentos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.topPacientes.map((p: any, i: number) => (
                        <tr key={i} className={`hover:bg-gray-50 ${i === 0 ? 'bg-purple-50' : ''}`}>
                          <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-[#1A3A2C] text-sm">{p.nome}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{p.empresa ?? 'Particular'}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: `${TIPO_COLOR[p.tipoFreq] ?? '#9CA3AF'}20`, color: TIPO_COLOR[p.tipoFreq] ?? '#9CA3AF' }}>
                              {TIPO_LABEL[p.tipoFreq] ?? p.tipoFreq}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">{p.receitas}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{p.medicamentos}</span>
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

              {/* Lista completa */}
              <Card title={`Lista Completa de Receitas (${data.registros.length})`} sub="Todas as receitas do período com detalhes">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Data</th>
                        <th className="px-3 py-2.5 text-left">Paciente</th>
                        <th className="px-3 py-2.5 text-left">Médico</th>
                        <th className="px-3 py-2.5 text-left">Tipo</th>
                        <th className="px-3 py-2.5 text-left">Medicamentos</th>
                        <th className="px-3 py-2.5 text-center">Qtd</th>
                        <th className="px-3 py-2.5 text-left">Empresa</th>
                        <th className="px-3 py-2.5 text-left">Validade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.registros.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(r.data)}</td>
                          <td className="px-3 py-2 font-medium text-[#1A3A2C] whitespace-nowrap">{r.paciente}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.medico}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="font-semibold px-1.5 py-0.5 rounded text-xs"
                              style={{ backgroundColor: `${TIPO_COLOR[r.tipo?.toLowerCase()] ?? '#9CA3AF'}18`, color: TIPO_COLOR[r.tipo?.toLowerCase()] ?? '#9CA3AF' }}>
                              {r.tipo}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 font-mono max-w-xs">
                            <p className="truncate" title={r.medicamentos}>{r.medicamentos}</p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded">{r.qtdMedicamentos}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.empresa}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(r.validade)}</td>
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
