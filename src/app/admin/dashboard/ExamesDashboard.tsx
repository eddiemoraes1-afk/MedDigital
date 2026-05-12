'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, RefreshCw, FlaskConical, Calendar, Users,
  Filter, X, Download, Printer, AlertTriangle,
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
function fmtDate(d: string) {
  if (!d || d === '—') return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

const URGENCIA_LABEL: Record<string, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  emergencia: 'Emergência',
}
const URGENCIA_COLOR: Record<string, string> = {
  normal: '#5BBD9B',
  urgente: '#D97706',
  emergencia: '#DC2626',
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
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label} ({s.value})
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, color = '#5BBD9B', labelKey = 'label', valueKey = 'value', horizontal = false }: {
  data: any[]
  color?: string
  labelKey?: string
  valueKey?: string
  horizontal?: boolean
}) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const max = Math.max(...data.map(d => d[valueKey]))
  if (horizontal) {
    return (
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-36 truncate shrink-0">{d[labelKey]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all"
                style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }}
              >
                <span className="text-white text-xs font-bold">{d[valueKey]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 min-w-[40px]">
          <span className="text-xs font-bold text-[#1A3A2C]">{d[valueKey]}</span>
          <div
            className="w-8 rounded-t-md transition-all"
            style={{ height: `${Math.max(4, (d[valueKey] / max) * 120)}px`, background: color }}
            title={`${d[labelKey]}: ${d[valueKey]}`}
          />
          <span className="text-xs text-gray-400 text-center leading-tight" style={{ fontSize: '10px' }}>
            {d[labelKey]}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-[#1A3A2C] mt-1">{value}</p>
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: color + '18' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

// ── Exportar Excel ────────────────────────────────────────────────────────────
function exportarExcel(data: any, inicio: string, fim: string) {
  const wb = XLSX.utils.book_new()

  // Aba 1 — Solicitações
  const s1 = data.registros.map((r: any) => ({
    'Data': fmtDate(r.data),
    'Paciente': r.paciente,
    'CPF': r.cpf,
    'Sexo': r.sexo,
    'Médico': r.medico,
    'Especialidade': r.especialidade,
    'Empresa': r.empresa,
    'Urgência': URGENCIA_LABEL[r.urgencia] ?? r.urgencia,
    'Status': r.status,
    'Qtd Exames': r.total_exames,
    'Exames': r.exames,
    'Indicação Clínica': r.indicacao_clinica,
    'Observações': r.observacoes,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s1), 'Solicitações')

  // Aba 2 — Top Exames
  const s2 = data.topExames.map((e: any) => ({
    'Exame': e.nome,
    'Total Solicitações': e.total,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s2), 'Top Exames')

  // Aba 3 — Por Médico
  const s3 = data.porMedico.map((m: any) => ({
    'Médico': m.nome,
    'Solicitações': m.total,
    'Total Exames': m.exames,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s3), 'Por Médico')

  // Aba 4 — Por Empresa
  const s4 = data.porEmpresa.map((e: any) => ({
    'Empresa': e.nome,
    'Solicitações': e.total,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s4), 'Por Empresa')

  // Aba 5 — Top Pacientes
  const s5 = data.topPacientes.map((p: any) => ({
    'Paciente': p.nome,
    'Solicitações': p.total,
    'Urgentes/Emergência': p.urgentes,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s5), 'Top Pacientes')

  // Aba 6 — Resumo
  const s6 = [
    { Indicador: 'Total de Solicitações', Valor: data.kpis.totalSolicitacoes },
    { Indicador: 'Total de Exames', Valor: data.kpis.totalExames },
    { Indicador: 'Pacientes Únicos', Valor: data.kpis.pacientesUnicos },
    { Indicador: 'Urgentes/Emergência', Valor: data.kpis.urgentes },
    { Indicador: 'Período', Valor: `${fmtDate(inicio)} – ${fmtDate(fim)}` },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s6), 'Resumo')

  XLSX.writeFile(wb, `exames-${inicio}-${fim}.xlsx`)
}

// ── Exportar PDF ──────────────────────────────────────────────────────────────
function exportarPDF(data: any, inicio: string, fim: string) {
  const rows = data.registros.map((r: any) => `
    <tr>
      <td>${fmtDate(r.data)}</td>
      <td>${r.paciente}</td>
      <td>${r.medico}</td>
      <td>${r.empresa}</td>
      <td style="color:${URGENCIA_COLOR[r.urgencia] ?? '#222'}">${URGENCIA_LABEL[r.urgencia] ?? r.urgencia}</td>
      <td>${r.total_exames}</td>
      <td style="font-size:9px;max-width:200px">${r.exames.replace(/\n/g, ', ')}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <style>
    body{font-family:Arial,sans-serif;font-size:10px;color:#222;padding:20px}
    h1{color:#1A3A2C;font-size:16px;margin-bottom:4px}
    p.sub{color:#666;font-size:10px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#1A3A2C;color:white;padding:6px 8px;text-align:left;font-size:10px}
    td{border-bottom:1px solid #eee;padding:5px 8px;vertical-align:top}
    tr:nth-child(even) td{background:#F9F9F9}
    .kpis{display:flex;gap:16px;margin-bottom:16px}
    .kpi{background:#F0F9F5;border:1px solid #5BBD9B;border-radius:8px;padding:10px 14px;min-width:120px}
    .kpi .val{font-size:18px;font-weight:700;color:#1A3A2C}
    .kpi .lbl{font-size:9px;color:#666}
    @media print{body{padding:10px}}
  </style></head><body>
  <h1>Relatório de Solicitações de Exames</h1>
  <p class="sub">Período: ${fmtDate(inicio)} – ${fmtDate(fim)}</p>
  <div class="kpis">
    <div class="kpi"><div class="val">${data.kpis.totalSolicitacoes}</div><div class="lbl">Solicitações</div></div>
    <div class="kpi"><div class="val">${data.kpis.totalExames}</div><div class="lbl">Total Exames</div></div>
    <div class="kpi"><div class="val">${data.kpis.pacientesUnicos}</div><div class="lbl">Pacientes</div></div>
    <div class="kpi"><div class="val">${data.kpis.urgentes}</div><div class="lbl">Urgentes</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Data</th><th>Paciente</th><th>Médico</th><th>Empresa</th>
      <th>Urgência</th><th>Qtd</th><th>Exames</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
  </body></html>`

  const win = window.open('', '_blank', 'width=1100,height=800')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExamesDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  // Filtros — default: 1º do mês corrente até hoje
  const [inicio, setInicio] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  })
  const [fim, setFim] = useState(() => new Date().toISOString().split('T')[0])
  const [empresaId, setEmpresaId] = useState('')
  const [urgenciaFiltro, setUrgenciaFiltro] = useState('')
  const [nomePac, setNomePac] = useState('')
  const [nomeExame, setNomeExame] = useState('')

  const dNomePac  = useDebounce(nomePac, 350)
  const dNomeExame = useDebounce(nomeExame, 350)

  const carregar = useCallback(async (
    ini: string, fi: string, emp: string, urg: string, nome: string, exame: string
  ) => {
    setLoading(true)
    setErro('')
    try {
      const p = new URLSearchParams({ dataInicio: ini, dataFim: fi })
      if (emp)   p.set('empresa_id', emp)
      if (urg)   p.set('urgencia', urg)
      if (nome)  p.set('nome', nome)
      if (exame) p.set('exame', exame)

      const res = await fetch(`/api/admin/exames?${p}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar(inicio, fim, empresaId, urgenciaFiltro, dNomePac, dNomeExame)
  }, [inicio, fim, empresaId, urgenciaFiltro, dNomePac, dNomeExame, carregar])

  const temFiltros = !!(empresaId || urgenciaFiltro || nomePac || nomeExame)

  function limparFiltros() {
    setEmpresaId(''); setUrgenciaFiltro(''); setNomePac(''); setNomeExame('')
  }

  return (
    <div className="space-y-6">

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1A3A2C] shrink-0">
            <Filter className="w-4 h-4" /> Filtros
          </div>

          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />
          <span className="text-gray-400 text-sm">até</span>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />

          {data?.empresas?.length > 0 && (
            <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]">
              <option value="">Todas as empresas</option>
              <option value="__particular__">Particular</option>
              {data.empresas.map((e: any) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          )}

          <select value={urgenciaFiltro} onChange={e => setUrgenciaFiltro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]">
            <option value="">Todas as urgências</option>
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
            <option value="emergencia">Emergência</option>
          </select>

          <input type="text" value={nomePac} onChange={e => setNomePac(e.target.value)}
            placeholder="Buscar paciente..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />

          <input type="text" value={nomeExame} onChange={e => setNomeExame(e.target.value)}
            placeholder="Buscar exame..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />

          {temFiltros && (
            <button onClick={limparFiltros}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => exportarExcel(data, inicio, fim)} disabled={!data}
              className="flex items-center gap-1.5 border border-green-600 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={() => exportarPDF(data, inicio, fim)} disabled={!data}
              className="flex items-center gap-1.5 border border-red-500 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40">
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => carregar(inicio, fim, empresaId, urgenciaFiltro, dNomePac, dNomeExame)}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
          </div>
        </div>

        {/* Filtros ativos */}
        {(data || temFiltros) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <span>Período: <strong className="text-[#1A3A2C]">{fmtDate(inicio)} – {fmtDate(fim)}</strong></span>
            {temFiltros && <span className="text-amber-600 font-medium">· Filtros ativos</span>}
            {data && <span className="ml-auto text-gray-400">{data.kpis.totalSolicitacoes} solicitação(ões)</span>}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-600 font-medium">{erro}</p>
          <button onClick={() => carregar(inicio, fim, empresaId, urgenciaFiltro, dNomePac, dNomeExame)}
            className="mt-3 text-sm text-red-500 underline">Tentar novamente</button>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total de Solicitações" value={data.kpis.totalSolicitacoes} icon={FlaskConical} color="#5BBD9B" />
            <KpiCard label="Total de Exames" value={data.kpis.totalExames} icon={Calendar} color="#3B82F6" />
            <KpiCard label="Pacientes Únicos" value={data.kpis.pacientesUnicos} icon={Users} color="#8B5CF6" />
            <KpiCard label="Urgentes / Emergência" value={data.kpis.urgentes} icon={AlertTriangle} color="#D97706" />
          </div>

          {/* ── Linha 1: Por Mês + Por Urgência ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Solicitações por Mês</p>
              <BarChart
                data={data.porMes.map((d: any) => ({ label: formatMes(d.mes), value: d.total }))}
                color="#5BBD9B"
              />
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Por Urgência</p>
              <DonutChart
                slices={data.porUrgencia.map((d: any) => ({
                  label: URGENCIA_LABEL[d.urgencia] ?? d.urgencia,
                  value: d.total,
                  color: URGENCIA_COLOR[d.urgencia] ?? '#999',
                }))}
              />
            </div>
          </div>

          {/* ── Linha 2: Por Sexo + Por Empresa ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Por Sexo do Paciente</p>
              <DonutChart
                slices={data.porSexo.map((d: any, i: number) => ({
                  label: d.sexo,
                  value: d.total,
                  color: ['#5BBD9B', '#3B82F6', '#8B5CF6', '#D97706'][i % 4],
                }))}
              />
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Por Empresa</p>
              <BarChart
                data={data.porEmpresa.slice(0, 10).map((d: any) => ({ label: d.nome, value: d.total }))}
                color="#3B82F6"
                labelKey="label"
                valueKey="value"
                horizontal
              />
            </div>
          </div>

          {/* ── Linha 3: Top Exames ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Top 20 Exames mais Solicitados</p>
            <BarChart
              data={data.topExames.map((d: any) => ({ label: d.nome, value: d.total }))}
              color="#8B5CF6"
              horizontal
            />
          </div>

          {/* ── Linha 4: Por Médico ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Solicitações por Médico</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-4">Médico</th>
                    <th className="text-right text-xs font-semibold text-gray-400 py-2 pr-4">Solicitações</th>
                    <th className="text-right text-xs font-semibold text-gray-400 py-2">Total Exames</th>
                  </tr>
                </thead>
                <tbody>
                  {data.porMedico.map((m: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-700">{m.nome}</td>
                      <td className="py-2.5 pr-4 text-right text-[#1A3A2C] font-semibold">{m.total}</td>
                      <td className="py-2.5 text-right text-blue-600 font-semibold">{m.exames}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.porMedico.length === 0 && (
                <p className="text-center text-gray-300 py-8 text-sm">Sem dados</p>
              )}
            </div>
          </div>

          {/* ── Top Pacientes ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Top 10 Pacientes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-4">#</th>
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-4">Paciente</th>
                    <th className="text-right text-xs font-semibold text-gray-400 py-2 pr-4">Solicitações</th>
                    <th className="text-right text-xs font-semibold text-gray-400 py-2">Urgentes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPacientes.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium text-gray-700">{p.nome}</td>
                      <td className="py-2.5 pr-4 text-right text-[#1A3A2C] font-semibold">{p.total}</td>
                      <td className="py-2.5 text-right">
                        {p.urgentes > 0
                          ? <span className="text-red-500 font-semibold">{p.urgentes}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.topPacientes.length === 0 && (
                <p className="text-center text-gray-300 py-8 text-sm">Sem dados</p>
              )}
            </div>
          </div>

          {/* ── Lista Completa ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-[#1A3A2C] mb-4">
              Lista Completa de Solicitações
              <span className="ml-2 text-xs font-normal text-gray-400">({data.registros.length} registros)</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-3 whitespace-nowrap">Data</th>
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-3">Paciente</th>
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-3">Médico</th>
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-3">Empresa</th>
                    <th className="text-left text-xs font-semibold text-gray-400 py-2 pr-3">Urgência</th>
                    <th className="text-right text-xs font-semibold text-gray-400 py-2 pr-3">Exames</th>
                    <th className="text-left text-xs font-semibold text-gray-400 py-2">Lista</th>
                  </tr>
                </thead>
                <tbody>
                  {data.registros.slice(0, 50).map((r: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(r.data)}</td>
                      <td className="py-2 pr-3 font-medium text-gray-700 max-w-[140px] truncate">{r.paciente}</td>
                      <td className="py-2 pr-3 text-gray-600 max-w-[120px] truncate">{r.medico}</td>
                      <td className="py-2 pr-3 text-gray-600 max-w-[100px] truncate">{r.empresa}</td>
                      <td className="py-2 pr-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: (URGENCIA_COLOR[r.urgencia] ?? '#5BBD9B') + '20',
                            color: URGENCIA_COLOR[r.urgencia] ?? '#5BBD9B',
                          }}>
                          {URGENCIA_LABEL[r.urgencia] ?? r.urgencia}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right text-[#1A3A2C] font-semibold text-xs">{r.total_exames}</td>
                      <td className="py-2 text-xs text-gray-500 max-w-[200px]">
                        {r.exames.split('\n').slice(0, 2).join(', ')}
                        {r.exames.split('\n').length > 2 && ` +${r.exames.split('\n').length - 2} mais`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.registros.length === 0 && (
                <p className="text-center text-gray-300 py-8 text-sm">Nenhuma solicitação encontrada</p>
              )}
              {data.registros.length > 50 && (
                <p className="text-center text-xs text-gray-400 pt-3">
                  Mostrando 50 de {data.registros.length}. Exporte para Excel para ver todos.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
