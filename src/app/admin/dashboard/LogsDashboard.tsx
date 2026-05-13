'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, RefreshCw, ScrollText,
  X, Download, Printer, Search,
  Stethoscope, FileText, Pill, FlaskConical, ClipboardList, ListCheck,
  ChevronLeft, ChevronRight, UserPlus, SlidersHorizontal,
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
function fmtTs(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}
function fmtTime(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ── Tipos de evento ───────────────────────────────────────────────────────────
type TipoEvento =
  | 'entrada_fila'
  | 'consulta_inicio'
  | 'consulta_fim'
  | 'encaminhamento_virtual'
  | 'encaminhamento_agendado'
  | 'atestado'
  | 'receita'
  | 'exame'
  | 'triagem'

const TIPO_CONFIG: Record<TipoEvento, { label: string; cor: string; bg: string; icon: React.ReactNode }> = {
  entrada_fila:           { label: 'Entrada na Fila',        cor: '#6366f1', bg: '#ede9fe', icon: <ListCheck   className="w-3.5 h-3.5" /> },
  consulta_inicio:        { label: 'Consulta Iniciada',      cor: '#0ea5e9', bg: '#e0f2fe', icon: <Stethoscope  className="w-3.5 h-3.5" /> },
  consulta_fim:           { label: 'Consulta Concluída',     cor: '#10b981', bg: '#d1fae5', icon: <Stethoscope  className="w-3.5 h-3.5" /> },
  encaminhamento_virtual: { label: 'Encaminh. Virtual',      cor: '#f97316', bg: '#ffedd5', icon: <UserPlus     className="w-3.5 h-3.5" /> },
  encaminhamento_agendado:{ label: 'Encaminh. Agendado',     cor: '#ea580c', bg: '#fed7aa', icon: <UserPlus     className="w-3.5 h-3.5" /> },
  atestado:               { label: 'Atestado Emitido',       cor: '#f59e0b', bg: '#fef3c7', icon: <FileText     className="w-3.5 h-3.5" /> },
  receita:                { label: 'Receita Emitida',        cor: '#8b5cf6', bg: '#ede9fe', icon: <Pill          className="w-3.5 h-3.5" /> },
  exame:                  { label: 'Exame Solicitado',       cor: '#3b82f6', bg: '#dbeafe', icon: <FlaskConical  className="w-3.5 h-3.5" /> },
  triagem:                { label: 'Triagem Realizada',      cor: '#ec4899', bg: '#fce7f3', icon: <ClipboardList className="w-3.5 h-3.5" /> },
}

const TODOS_TIPOS = Object.entries(TIPO_CONFIG).map(([k, v]) => ({ key: k as TipoEvento, label: v.label }))

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: string
  criado_em: string
  tipo: TipoEvento
  tipo_label: string
  descricao: string
  paciente_nome: string
  medico_nome: string
  medico_esp: string
  empresa_nome: string
  referencia_id: string
  detalhe: string
}
interface ApiResp {
  logs: LogEntry[]
  total: number
  contagem: Record<string, number>
  empresas:  { id: string; nome: string }[]
  medicos:   { id: string; nome: string }[]
  pacientes: { id: string; nome: string }[]
}

// ── Badge de tipo ─────────────────────────────────────────────────────────────
function TipoBadge({ tipo }: { tipo: TipoEvento }) {
  const cfg = TIPO_CONFIG[tipo]
  if (!cfg) return <span className="text-xs text-gray-400">{tipo}</span>
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.cor }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ── Gráfico de barras horizontais por tipo ────────────────────────────────────
function BarChart({ contagem }: { contagem: Record<string, number> }) {
  const entries = TODOS_TIPOS
    .map(t => ({ ...t, value: contagem[t.key] ?? 0 }))
    .filter(t => t.value > 0)
    .sort((a, b) => b.value - a.value)
  const max = Math.max(...entries.map(e => e.value), 1)
  if (entries.length === 0) return <div className="text-xs text-gray-300 py-4 text-center">Sem dados</div>
  return (
    <div className="space-y-2.5">
      {entries.map(e => {
        const cfg = TIPO_CONFIG[e.key]
        const pct = (e.value / max) * 100
        return (
          <div key={e.key} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-36 shrink-0 truncate">{cfg.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.cor }} />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-8 text-right">{e.value}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Timeline diária ───────────────────────────────────────────────────────────
function TimelineBar({ logs }: { logs: LogEntry[] }) {
  const byDate: Record<string, number> = {}
  for (const l of logs) {
    const d = l.criado_em?.slice(0, 10)
    if (d) byDate[d] = (byDate[d] ?? 0) + 1
  }
  const dates = Object.keys(byDate).sort().slice(-30)
  if (dates.length === 0) return null
  const max = Math.max(...dates.map(d => byDate[d]))
  return (
    <div className="flex items-end gap-0.5 h-14">
      {dates.map(d => {
        const h = Math.max(4, Math.round((byDate[d] / max) * 56))
        return (
          <div key={d} className="flex-1 flex flex-col items-center justify-end" title={`${fmtDate(d + 'T12:00:00')}: ${byDate[d]} eventos`}>
            <div className="w-full rounded-t" style={{ height: h, background: '#1A3A2C', opacity: 0.7 }} />
          </div>
        )
      })}
    </div>
  )
}

// ── Label de input ────────────────────────────────────────────────────────────
function FLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>
}
function FInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white"
    />
  )
}
function FSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white"
    >
      {children}
    </select>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50

export default function LogsDashboard() {
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtros server-side
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim,    setDataFim]    = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim,    setHoraFim]    = useState('')
  const [empresaId,  setEmpresaId]  = useState('')
  const [medicoId,   setMedicoId]   = useState('')

  // Filtros client-side
  const [tipoFiltro,    setTipoFiltro]    = useState<TipoEvento | ''>('')
  const [busca,         setBusca]         = useState('')
  const [pacienteFiltro,setPacienteFiltro]= useState('')
  const dbBusca = useDebounce(busca, 300)

  // Paginação
  const [pagina, setPagina] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const p = new URLSearchParams()
      if (dataInicio) p.set('dataInicio', dataInicio)
      if (dataFim)    p.set('dataFim',    dataFim)
      if (horaInicio) p.set('horaInicio', horaInicio)
      if (horaFim)    p.set('horaFim',    horaFim)
      if (empresaId)  p.set('empresa_id', empresaId)
      if (medicoId)   p.set('medico_id',  medicoId)
      const res = await fetch(`/api/admin/logs?${p}`)
      if (!res.ok) throw new Error('Erro ao buscar logs')
      setData(await res.json())
      setPagina(1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim, horaInicio, horaFim, empresaId, medicoId])

  useEffect(() => { fetchData() }, [fetchData])

  // Filtros client-side aplicados
  const logsFiltrados = useMemo(() => {
    if (!data) return []
    let arr = data.logs
    if (tipoFiltro) arr = arr.filter(l => l.tipo === tipoFiltro)
    if (pacienteFiltro) arr = arr.filter(l => l.paciente_nome === pacienteFiltro)
    if (dbBusca) {
      const q = dbBusca.toLowerCase()
      arr = arr.filter(l =>
        l.paciente_nome.toLowerCase().includes(q) ||
        l.medico_nome.toLowerCase().includes(q) ||
        l.descricao.toLowerCase().includes(q) ||
        l.empresa_nome.toLowerCase().includes(q)
      )
    }
    return arr
  }, [data, tipoFiltro, dbBusca, pacienteFiltro])

  const contagemFiltrada = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of logsFiltrados) c[l.tipo] = (c[l.tipo] ?? 0) + 1
    return c
  }, [logsFiltrados])

  const totalPags = Math.max(1, Math.ceil(logsFiltrados.length / PAGE_SIZE))
  const logsPagina = logsFiltrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  const temFiltroAtivo = !!(dataInicio || dataFim || horaInicio || horaFim || empresaId || medicoId || tipoFiltro || busca || pacienteFiltro)

  function limparFiltros() {
    setDataInicio(''); setDataFim('')
    setHoraInicio(''); setHoraFim('')
    setEmpresaId(''); setMedicoId('')
    setTipoFiltro(''); setBusca('')
    setPacienteFiltro(''); setPagina(1)
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  function exportarExcel() {
    if (!logsFiltrados.length) return
    const wb = XLSX.utils.book_new()

    const ws1Data = logsFiltrados.map(l => ({
      'Data/Hora':    fmtTs(l.criado_em),
      'Tipo':         l.tipo_label,
      'Descrição':    l.descricao,
      'Paciente':     l.paciente_nome,
      'Médico':       l.medico_nome === '—' ? '' : l.medico_nome,
      'Especialidade':l.medico_esp,
      'Empresa':      l.empresa_nome,
      'Detalhe':      l.detalhe,
      'ID Referência':l.referencia_id,
    }))
    const ws1 = XLSX.utils.json_to_sheet(ws1Data)
    ws1['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 60 }, { wch: 30 }, { wch: 28 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 38 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Todos os Logs')

    const tiposData = TODOS_TIPOS.map(t => ({ 'Tipo de Evento': t.label, 'Total': contagemFiltrada[t.key] ?? 0 }))
    const ws2 = XLSX.utils.json_to_sheet(tiposData)
    ws2['!cols'] = [{ wch: 25 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por Tipo')

    const medBucket: Record<string, number> = {}
    for (const l of logsFiltrados) if (l.medico_nome && l.medico_nome !== '—') medBucket[l.medico_nome] = (medBucket[l.medico_nome] ?? 0) + 1
    const ws3 = XLSX.utils.json_to_sheet(Object.entries(medBucket).sort((a, b) => b[1] - a[1]).map(([nome, total]) => ({ 'Médico': nome, 'Total de Ações': total })))
    ws3['!cols'] = [{ wch: 30 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Médico')

    const pacBucket: Record<string, number> = {}
    for (const l of logsFiltrados) if (l.paciente_nome && l.paciente_nome !== 'Desconhecido') pacBucket[l.paciente_nome] = (pacBucket[l.paciente_nome] ?? 0) + 1
    const ws4 = XLSX.utils.json_to_sheet(Object.entries(pacBucket).sort((a, b) => b[1] - a[1]).slice(0, 100).map(([nome, total]) => ({ 'Paciente': nome, 'Total de Eventos': total })))
    ws4['!cols'] = [{ wch: 30 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Por Paciente')

    const empBucket: Record<string, number> = {}
    for (const l of logsFiltrados) empBucket[l.empresa_nome] = (empBucket[l.empresa_nome] ?? 0) + 1
    const ws5 = XLSX.utils.json_to_sheet(Object.entries(empBucket).sort((a, b) => b[1] - a[1]).map(([nome, total]) => ({ 'Empresa': nome, 'Total de Eventos': total })))
    ws5['!cols'] = [{ wch: 30 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws5, 'Por Empresa')

    const dataBucket: Record<string, number> = {}
    for (const l of logsFiltrados) { const d = fmtDate(l.criado_em); dataBucket[d] = (dataBucket[d] ?? 0) + 1 }
    const ws6 = XLSX.utils.json_to_sheet(Object.entries(dataBucket).sort(([a], [b]) => b.localeCompare(a)).map(([data, total]) => ({ 'Data': data, 'Total de Eventos': total })))
    ws6['!cols'] = [{ wch: 15 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws6, 'Por Data')

    XLSX.writeFile(wb, `logs_sistema_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Export PDF ───────────────────────────────────────────────────────────
  function exportarPDF() {
    const w = window.open('', '_blank')!
    const rows = logsFiltrados.slice(0, 2000)
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Log do Sistema</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 20px; }
  h1 { font-size: 16px; color: #1A3A2C; margin-bottom: 4px; }
  .sub { font-size: 9px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1A3A2C; color: white; padding: 5px 6px; text-align: left; font-size: 9px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 8px; font-weight: 600; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<h1>Log do Sistema</h1>
<p class="sub">Gerado em: ${fmtTs(new Date().toISOString())} · Total: ${rows.length} registros</p>
<table>
<thead><tr>
  <th>Data/Hora</th><th>Tipo</th><th>Descrição</th><th>Paciente</th><th>Médico</th><th>Empresa</th>
</tr></thead>
<tbody>
${rows.map(l => `<tr>
  <td>${fmtDate(l.criado_em)}<br/><small>${fmtTime(l.criado_em)}</small></td>
  <td><span class="badge" style="background:${TIPO_CONFIG[l.tipo]?.bg ?? '#eee'};color:${TIPO_CONFIG[l.tipo]?.cor ?? '#333'}">${l.tipo_label}</span></td>
  <td>${l.descricao}</td>
  <td>${l.paciente_nome}</td>
  <td>${l.medico_nome === '—' ? '' : l.medico_nome}</td>
  <td>${l.empresa_nome}</td>
</tr>`).join('')}
</tbody>
</table>
<script>window.onload=()=>window.print()</script>
</body>
</html>`)
    w.document.close()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Barra de filtros horizontal ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#1A3A2C]">
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </span>
          <div className="flex gap-2">
            {temFiltroAtivo && (
              <button onClick={limparFiltros} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 transition">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
            <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-[#1A3A2C] hover:bg-[#2a5040] transition disabled:opacity-60">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Atualizar
            </button>
            <button onClick={exportarExcel} disabled={!logsFiltrados.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={exportarPDF} disabled={!logsFiltrados.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-40">
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Grid de campos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 items-end">
          {/* Empresa */}
          <div className="lg:col-span-2">
            <FLabel>Empresa</FLabel>
            <FSelect value={empresaId} onChange={e => setEmpresaId(e.target.value)}>
              <option value="">Todas</option>
              <option value="__particular__">Particular</option>
              {(data?.empresas ?? []).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </FSelect>
          </div>

          {/* Médico */}
          <div className="lg:col-span-2">
            <FLabel>Médico</FLabel>
            <FSelect value={medicoId} onChange={e => setMedicoId(e.target.value)}>
              <option value="">Todos</option>
              {(data?.medicos ?? []).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </FSelect>
          </div>

          {/* Paciente */}
          <div className="lg:col-span-2">
            <FLabel>Paciente</FLabel>
            <FSelect value={pacienteFiltro} onChange={e => { setPacienteFiltro(e.target.value); setPagina(1) }}>
              <option value="">Todos</option>
              {(data?.pacientes ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
            </FSelect>
          </div>

          {/* Data início */}
          <div>
            <FLabel>Data início</FLabel>
            <FInput type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>

          {/* Data fim */}
          <div>
            <FLabel>Data fim</FLabel>
            <FInput type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>

        {/* Segunda linha: hora + tipo + busca */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 items-end mt-3">
          <div>
            <FLabel>Hora início</FLabel>
            <FInput type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
          </div>
          <div>
            <FLabel>Hora fim</FLabel>
            <FInput type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} />
          </div>
          <div className="lg:col-span-2">
            <FLabel>Tipo de evento</FLabel>
            <FSelect value={tipoFiltro} onChange={e => { setTipoFiltro(e.target.value as TipoEvento | ''); setPagina(1) }}>
              <option value="">Todos</option>
              {TODOS_TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </FSelect>
          </div>
          <div className="lg:col-span-4">
            <FLabel>Busca livre</FLabel>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={e => { setBusca(e.target.value); setPagina(1) }}
                placeholder="Nome de paciente, médico, descrição..."
                className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
          </div>
        ) : (
          <>
            {/* ── KPI cards ── */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              <div className="col-span-1 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Total</div>
                <div className="text-3xl font-bold text-[#1A3A2C]">{logsFiltrados.length.toLocaleString('pt-BR')}</div>
              </div>
              {TODOS_TIPOS.filter(t => (contagemFiltrada[t.key] ?? 0) > 0).slice(0, 8).map(t => {
                const cfg = TIPO_CONFIG[t.key]
                return (
                  <div key={t.key} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-1 mb-1">
                      <span style={{ color: cfg.cor }}>{cfg.icon}</span>
                      <span className="text-[10px] text-gray-400 truncate leading-tight">{cfg.label}</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: cfg.cor }}>{contagemFiltrada[t.key]}</div>
                  </div>
                )
              })}
            </div>

            {/* ── Gráficos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#1A3A2C] mb-4">Eventos por tipo</div>
                <BarChart contagem={contagemFiltrada} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="text-sm font-semibold text-[#1A3A2C] mb-2">Eventos por dia (últimos 30 dias)</div>
                <TimelineBar logs={logsFiltrados} />
                <div className="text-xs text-gray-400 mt-2">Passe o mouse nas barras para ver detalhes</div>
              </div>
            </div>

            {/* ── Tabela ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-[#1A3A2C]" />
                  <span className="font-semibold text-[#1A3A2C] text-sm">Linha do Tempo</span>
                  <span className="text-xs text-gray-400 ml-1">({logsFiltrados.length.toLocaleString('pt-BR')} registros)</span>
                </div>
                <div className="text-xs text-gray-400">Página {pagina} de {totalPags}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Hora</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Descrição</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Paciente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Médico</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsPagina.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                          Nenhum evento encontrado para os filtros selecionados
                        </td>
                      </tr>
                    ) : (
                      logsPagina.map(l => {
                        const isEnc = l.tipo === 'encaminhamento_virtual' || l.tipo === 'encaminhamento_agendado'
                        return (
                          <tr
                            key={l.id}
                            className={`border-b border-gray-50 transition-colors ${isEnc ? 'bg-orange-50/40 hover:bg-orange-50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(l.criado_em)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{fmtTime(l.criado_em)}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><TipoBadge tipo={l.tipo} /></td>
                            <td className="px-4 py-3 text-xs text-gray-700 max-w-xs">
                              {l.descricao}
                              {l.detalhe && isEnc && (
                                <p className="text-[10px] text-orange-500 mt-0.5">{l.detalhe}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{l.paciente_nome}</td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {l.medico_nome === '—' ? <span className="text-gray-300">—</span> : l.medico_nome}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{l.empresa_nome}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPags > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(7, totalPags) }, (_, i) => {
                      let p: number
                      if (totalPags <= 7)        p = i + 1
                      else if (pagina <= 4)      p = i + 1
                      else if (pagina >= totalPags - 3) p = totalPags - 6 + i
                      else                       p = pagina - 3 + i
                      return (
                        <button
                          key={p}
                          onClick={() => setPagina(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                            p === pagina ? 'bg-[#1A3A2C] text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setPagina(p => Math.min(totalPags, p + 1))}
                    disabled={pagina === totalPags}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    Próxima <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
