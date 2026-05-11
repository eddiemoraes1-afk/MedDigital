'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity, Building2, Users, Clock, CheckCircle2,
  Search, X, SlidersHorizontal, DollarSign, TrendingDown,
  TrendingUp, FileText, ClipboardList, FileSpreadsheet, Printer,
} from 'lucide-react'

// ── Types (exported so page.tsx can build them) ───────────────────────────────

export interface AtendimentoEnriquecido {
  id: string
  isoDate: string
  data: string
  hora: string
  pacienteId: string
  pacienteNome: string
  origemLabel: string
  origemTipo: 'empresa' | 'particular'
  empresaId: string | null
  valor: number
  custo: number
}

export interface AtestadoEnriquecido {
  id: string
  isoDate: string
  data: string
  pacienteId: string
  pacienteNome: string
  origemLabel: string
  origemTipo: 'empresa' | 'particular'
  empresaId: string | null
  dias: number | null
  cid: string | null
}

export interface ReceitaEnriquecida {
  id: string
  isoDate: string
  data: string
  pacienteId: string
  pacienteNome: string
  origemLabel: string
  origemTipo: 'empresa' | 'particular'
  empresaId: string | null
  status: string | null
  valor: number
  isRenovacao: boolean
}

interface Empresa { id: string; nome: string }

interface Props {
  atendimentos: AtendimentoEnriquecido[]
  atestados: AtestadoEnriquecido[]
  receitas: ReceitaEnriquecida[]
  empresas: Empresa[]
  custoConsulta: number
  custoReceita: number
  medicoId: string
  medicoNome: string
  sidebar: React.ReactNode
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isoToLocalDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  } catch { return '' }
}

type Filterable = {
  isoDate: string
  origemTipo: 'empresa' | 'particular'
  empresaId: string | null
  pacienteNome: string
}

function applyFilters<T extends Filterable>(
  items: T[], dateFrom: string, dateTo: string, origem: string, busca: string,
): T[] {
  const buscaLow = busca.trim().toLowerCase()
  return items.filter(item => {
    const d = isoToLocalDate(item.isoDate)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (origem === 'particular' && item.origemTipo !== 'particular') return false
    if (origem !== 'all' && origem !== 'particular' && item.empresaId !== origem) return false
    if (buscaLow && !item.pacienteNome.toLowerCase().includes(buscaLow)) return false
    return true
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FichaMedicoContent({
  atendimentos, atestados, receitas, empresas,
  custoConsulta, custoReceita, medicoId, medicoNome, sidebar,
}: Props) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [origem, setOrigem] = useState('all')
  const [busca, setBusca] = useState('')

  const isFiltered = !!(dateFrom || dateTo || origem !== 'all' || busca.trim())

  const filteredAts    = useMemo(() => applyFilters(atendimentos, dateFrom, dateTo, origem, busca), [atendimentos, dateFrom, dateTo, origem, busca])
  const filteredAtests = useMemo(() => applyFilters(atestados,    dateFrom, dateTo, origem, busca), [atestados,    dateFrom, dateTo, origem, busca])
  const filteredRecs   = useMemo(() => applyFilters(receitas,     dateFrom, dateTo, origem, busca), [receitas,     dateFrom, dateTo, origem, busca])

  // Sets for per-row indicators (within filtered period)
  const filteredAtestPacientes = useMemo(() => new Set(filteredAtests.map(a => a.pacienteId)), [filteredAtests])
  const filteredRecPacientes   = useMemo(() => new Set(filteredRecs.map(r => r.pacienteId)),   [filteredRecs])

  // Dynamic KPIs
  const totalConsultas       = filteredAts.length
  const filteredRenovacoes   = useMemo(() => filteredRecs.filter(r => r.isRenovacao),  [filteredRecs])
  const filteredRecConsulta  = useMemo(() => filteredRecs.filter(r => !r.isRenovacao), [filteredRecs])
  const totalRenovacoes      = filteredRenovacoes.length
  const totalRecConsulta     = filteredRecConsulta.length
  const totalReceitas        = filteredRecs.length
  const faturamentoConsultas = filteredAts.reduce((s, a) => s + a.valor, 0)
  const faturamentoRenovacoes = filteredRenovacoes.reduce((s, r) => s + r.valor, 0)
  const faturamento          = faturamentoConsultas + faturamentoRenovacoes
  const custoConsultas       = filteredAts.reduce((s, a) => s + a.custo, 0)
  const custoReceitasVal     = custoReceita > 0 ? totalRenovacoes * custoReceita : 0
  const custoTotal           = custoConsultas + custoReceitasVal
  const lucro                = faturamento - custoTotal
  const totalAtestados       = filteredAtests.length

  function clearFilters() {
    setDateFrom(''); setDateTo(''); setOrigem('all'); setBusca('')
  }

  const origemLabel = origem === 'all' ? 'Todas'
    : origem === 'particular' ? 'Particular'
    : (empresas.find(e => e.id === origem)?.nome ?? origem)

  // ── Excel export ─────────────────────────────────────────────────────────────
  async function exportExcel() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const XLSX: any = await import('xlsx')
      const rows: (string | number)[][] = [
        [`Produção Médica — ${medicoNome}`],
        ['Período:', dateFrom ? `${dateFrom} a ${dateTo || 'hoje'}` : 'Todo o período'],
        ['Origem:', origemLabel],
        ...(busca ? [['Paciente:', busca]] : []),
        ['Gerado em:', new Date().toLocaleString('pt-BR')],
        [],
        ['RESUMO'],
        ['Consultas', 'Fat. Consultas', 'Renovações', 'Fat. Renovações', 'Faturamento Total', 'Custo', 'Margem Bruta', 'Atestados', 'Receitas', 'Renovações'],
        [totalConsultas, faturamentoConsultas, totalRenovacoes, faturamentoRenovacoes, faturamento, custoTotal, lucro, totalAtestados, totalReceitas, totalRenovacoes],
        [],
        ['CONSULTAS'],
        ['Data', 'Hora', 'Paciente', 'Origem', 'Faturado (R$)', ...(custoConsulta > 0 ? ['Custo (R$)'] : [])],
        ...filteredAts.map(a => [a.data, a.hora, a.pacienteNome || '—', a.origemLabel, a.valor, ...(custoConsulta > 0 ? [a.custo] : [])]),
        ['', '', '', 'TOTAL', faturamento, ...(custoConsulta > 0 ? [custoConsultas] : [])],
      ]
      if (filteredAtests.length > 0) {
        rows.push([], ['ATESTADOS'], ['Data', 'Paciente', 'Origem', 'Dias', 'CID'])
        filteredAtests.forEach(a => rows.push([a.data, a.pacienteNome, a.origemLabel, a.dias ?? '', a.cid ?? '']))
      }
      if (filteredRecs.length > 0) {
        rows.push([], ['RECEITAS'], ['Data', 'Paciente', 'Origem', 'Tipo', 'Status', 'Valor (R$)'])
        filteredRecs.forEach(r => rows.push([r.data, r.pacienteNome, r.origemLabel, r.isRenovacao ? 'Renovação' : 'Em consulta', r.status ?? '—', r.isRenovacao ? r.valor : '—']))
      }
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Produção')
      XLSX.writeFile(wb, `producao-${medicoNome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      console.error('Erro ao exportar Excel:', e)
      alert('Erro ao gerar planilha.')
    }
  }

  // ── PDF (print window) ───────────────────────────────────────────────────────
  function exportPDF() {
    const consultaRows = filteredAts.map(a => `
      <tr>
        <td>${a.data}<br><span class="sub">${a.hora}</span></td>
        <td>${a.pacienteNome || '—'}</td>
        <td>${a.origemLabel}</td>
        <td class="num">${a.valor > 0 ? formatBRL(a.valor) : '—'}</td>
        ${custoConsulta > 0 ? `<td class="num">${formatBRL(a.custo)}</td>` : ''}
      </tr>`).join('')

    const atestHTML = filteredAtests.length > 0 ? `
      <h3>Atestados Emitidos (${filteredAtests.length})</h3>
      <table>
        <thead><tr><th>Data</th><th>Paciente</th><th>Origem</th><th>Dias</th><th>CID</th></tr></thead>
        <tbody>${filteredAtests.map(a => `<tr><td>${a.data}</td><td>${a.pacienteNome}</td><td>${a.origemLabel}</td><td class="num">${a.dias ?? '—'}</td><td>${a.cid ?? '—'}</td></tr>`).join('')}</tbody>
      </table>` : ''

    const recHTML = filteredRecs.length > 0 ? `
      <h3>Receitas Emitidas (${filteredRecs.length} — ${totalRenovacoes} renovação · ${totalRecConsulta} em consulta)</h3>
      <table>
        <thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Status</th><th class="num">Valor</th></tr></thead>
        <tbody>${filteredRecs.map(r => `<tr><td>${r.data}</td><td>${r.pacienteNome}</td><td>${r.isRenovacao ? '<span style="color:#ea580c;font-weight:600">Renovação</span>' : '<span style="color:#9333ea">Em consulta</span>'}</td><td>${r.status ?? '—'}</td><td class="num">${r.isRenovacao && r.valor > 0 ? formatBRL(r.valor) : '—'}</td></tr>`).join('')}</tbody>
      </table>` : ''

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Produção — ${medicoNome}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px 28px}
  h1{font-size:16px;color:#1A3A2C;margin:0 0 2px}
  .meta{color:#6b7280;font-size:10px;margin-bottom:16px}
  .kpis{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;min-width:110px}
  .kpi-label{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em}
  .kpi-value{font-size:15px;font-weight:700;color:#1A3A2C;margin-top:2px}
  .orange{color:#ea580c}.green{color:#16a34a}.amber{color:#d97706}.purple{color:#9333ea}
  h3{font-size:12px;color:#1A3A2C;font-weight:700;margin:20px 0 6px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
  table{width:100%;border-collapse:collapse}
  th{background:#f9fafb;text-align:left;padding:5px 8px;font-size:9px;color:#6b7280;text-transform:uppercase}
  td{padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:10px}
  tfoot td{font-weight:bold;background:#f9fafb}
  .num{text-align:right}.sub{color:#9ca3af;font-size:9px}
  @media print{body{padding:10px 16px}}
</style></head><body>
  <h1>Produção Médica — ${medicoNome}</h1>
  <div class="meta">
    Período: ${dateFrom ? `${dateFrom}${dateTo ? ` a ${dateTo}` : ''}` : 'Todo o período'}
    ${origem !== 'all' ? ` | Origem: ${origemLabel}` : ''}
    ${busca ? ` | Paciente: ${busca}` : ''}
     | Gerado em ${new Date().toLocaleString('pt-BR')}
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Consultas</div><div class="kpi-value">${totalConsultas}</div></div>
    <div class="kpi"><div class="kpi-label">Faturamento</div><div class="kpi-value">${formatBRL(faturamento)}</div></div>
    ${custoConsulta > 0 ? `
    <div class="kpi"><div class="kpi-label">Custo</div><div class="kpi-value orange">${formatBRL(custoTotal)}</div></div>
    <div class="kpi"><div class="kpi-label">Margem</div><div class="kpi-value ${lucro >= 0 ? 'green' : 'orange'}">${formatBRL(lucro)}</div></div>` : ''}
    <div class="kpi"><div class="kpi-label">Atestados</div><div class="kpi-value amber">${totalAtestados}</div></div>
    <div class="kpi"><div class="kpi-label">Receitas</div><div class="kpi-value purple">${totalReceitas}</div></div>
    ${totalRenovacoes > 0 ? `<div class="kpi"><div class="kpi-label">Renovações</div><div class="kpi-value orange">${totalRenovacoes} · ${formatBRL(faturamentoRenovacoes)}</div></div>` : ''}
  </div>
  <h3>Consultas Realizadas (${totalConsultas})</h3>
  <table>
    <thead><tr><th>Data / Hora</th><th>Paciente</th><th>Origem</th><th class="num">Faturado</th>${custoConsulta > 0 ? '<th class="num">Custo</th>' : ''}</tr></thead>
    <tbody>${consultaRows || `<tr><td colspan="${custoConsulta > 0 ? 5 : 4}" style="text-align:center;color:#9ca3af;padding:12px">Nenhuma consulta</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td class="num">${formatBRL(faturamento)}</td>${custoConsulta > 0 ? `<td class="num">${formatBRL(custoConsultas)}</td>` : ''}</tr></tfoot>
  </table>
  ${atestHTML}${recHTML}
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  // ── Filter bar ───────────────────────────────────────────────────────────────
  const filterBar = (
    <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1.5 self-center mt-4">
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400 font-medium">Filtros</span>
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">De</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white" />
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">Até</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white" />
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">Origem</label>
        <select value={origem} onChange={e => setOrigem(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white">
          <option value="all">Todas</option>
          <option value="particular">Particular</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="text-[10px] text-gray-400 block mb-0.5">Paciente</label>
        <div className="relative">
          <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Buscar por nome…" value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg pl-7 pr-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white" />
        </div>
      </div>
      {isFiltered && (
        <button onClick={clearFilters}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-3.5">
          <X className="w-3.5 h-3.5" /> Limpar
        </button>
      )}
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Dynamic KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#1A3A2C] rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-green-300 font-medium">Consultas</p>
              <p className="text-2xl font-bold text-white mt-1">{totalConsultas}</p>
              <p className="text-xs text-green-300 mt-0.5">realizadas</p>
            </div>
            <div className="p-2 rounded-xl bg-white/10"><Activity className="w-4 h-4 text-[#5BBD9B]" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Faturamento</p>
              <p className="text-lg font-bold text-[#1A3A2C] mt-1 leading-tight">{formatBRL(faturamento)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {faturamentoRenovacoes > 0
                  ? `consultas + ${formatBRL(faturamentoRenovacoes)} renov.`
                  : 'receita gerada'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-green-50"><DollarSign className="w-4 h-4 text-[#5BBD9B]" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Custo</p>
              <p className="text-lg font-bold text-orange-600 mt-1 leading-tight">
                {custoConsulta > 0 ? formatBRL(custoTotal) : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {custoConsulta > 0 ? `${formatBRL(custoConsulta)}/consulta` : 'não configurado'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-orange-50"><TrendingDown className="w-4 h-4 text-orange-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Margem bruta</p>
              <p className={`text-lg font-bold mt-1 leading-tight ${custoConsulta > 0 ? (lucro >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-300'}`}>
                {custoConsulta > 0 ? formatBRL(lucro) : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {custoConsulta > 0 && faturamento > 0 ? `${Math.round((lucro / faturamento) * 100)}% margem` : 'faturamento - custo'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50"><TrendingUp className="w-4 h-4 text-blue-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Atestados</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{totalAtestados}</p>
              <p className="text-xs text-gray-400 mt-0.5">emitidos</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-50"><FileText className="w-4 h-4 text-amber-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Receitas</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{totalReceitas}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {totalRenovacoes > 0 ? `${totalRenovacoes} renov. · ${totalRecConsulta} em consulta` : 'emitidas'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-purple-50"><ClipboardList className="w-4 h-4 text-purple-500" /></div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Consultation table card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-[#5BBD9B]" />
                Histórico de Consultas
                <span className="text-xs text-gray-400 font-normal">
                  ({isFiltered ? `${filteredAts.length} de ${atendimentos.length}` : atendimentos.length})
                </span>
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                {atendimentos.length > 0 && (
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {formatBRL(faturamento)} faturado
                    {custoConsulta > 0 && ` · ${formatBRL(custoConsultas)} custo`}
                  </span>
                )}
                <button onClick={exportExcel}
                  className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
                <button onClick={exportPDF}
                  className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                  <Printer className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>

            {filterBar}

            {filteredAts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Data</th>
                      <th className="px-5 py-3 text-left">Paciente</th>
                      <th className="px-5 py-3 text-left">Origem</th>
                      <th className="px-5 py-3 text-right">Faturado</th>
                      {custoConsulta > 0 && <th className="px-5 py-3 text-right">Custo</th>}
                      <th className="px-5 py-3 text-center">Atestado</th>
                      <th className="px-5 py-3 text-center">Receita</th>
                      <th className="px-5 py-3 text-center">Exame</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAts.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800 text-xs">{a.data}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {a.hora}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          {a.pacienteId && a.pacienteNome ? (
                            <Link href={`/admin/pacientes/${a.pacienteId}?back=${encodeURIComponent(`/admin/medicos/${medicoId}`)}&medico_id=${medicoId}`}
                              className="text-sm text-[#5BBD9B] hover:underline font-medium">
                              {a.pacienteNome}
                            </Link>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${a.origemTipo === 'empresa' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {a.origemTipo === 'empresa' ? <Building2 className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                            {a.origemLabel.length > 18 ? a.origemLabel.slice(0, 16) + '…' : a.origemLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-[#1A3A2C]">
                          {a.valor > 0 ? formatBRL(a.valor) : '—'}
                        </td>
                        {custoConsulta > 0 && (
                          <td className="px-5 py-3 text-right text-xs text-orange-500 font-medium">
                            {formatBRL(a.custo)}
                          </td>
                        )}
                        <td className="px-5 py-3 text-center">
                          {filteredAtestPacientes.has(a.pacienteId)
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100"><CheckCircle2 className="w-3 h-3 text-amber-600" /></span>
                            : <span className="text-gray-200 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {filteredRecPacientes.has(a.pacienteId)
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100"><CheckCircle2 className="w-3 h-3 text-purple-600" /></span>
                            : <span className="text-gray-200 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-gray-200 text-xs">—</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total ({filteredAts.length} {filteredAts.length === 1 ? 'consulta' : 'consultas'})
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-[#1A3A2C]">
                        {formatBRL(faturamentoConsultas)}
                      </td>
                      {custoConsulta > 0 && (
                        <td className="px-5 py-3 text-right text-sm font-bold text-orange-600">
                          {formatBRL(custoConsultas)}
                        </td>
                      )}
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : isFiltered ? (
              <div className="py-12 text-center">
                <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum resultado para os filtros aplicados</p>
                <button onClick={clearFilters} className="mt-2 text-xs text-[#5BBD9B] hover:underline">Limpar filtros</button>
              </div>
            ) : (
              <div className="py-14 text-center">
                <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
              </div>
            )}
          </div>

          {/* Atestados */}
          {atestados.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Atestados Emitidos
                  <span className="text-xs text-gray-400 font-normal">
                    ({isFiltered ? `${filteredAtests.length} de ${atestados.length}` : atestados.length})
                  </span>
                </h2>
              </div>
              {filteredAtests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Paciente</th>
                        <th className="px-5 py-3 text-center">Dias</th>
                        <th className="px-5 py-3 text-left">CID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAtests.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-xs text-gray-600">{a.data}</td>
                          <td className="px-5 py-3">
                            {a.pacienteId && a.pacienteNome ? (
                              <Link href={`/admin/pacientes/${a.pacienteId}?back=${encodeURIComponent(`/admin/medicos/${medicoId}`)}&medico_id=${medicoId}`}
                                className="text-sm text-[#5BBD9B] hover:underline">{a.pacienteNome}</Link>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              {a.dias ?? '—'} dias
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500 font-mono">{a.cid || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">Nenhum atestado no período selecionado</p>
                </div>
              )}
            </div>
          )}

          {/* Receitas */}
          {receitas.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                  <ClipboardList className="w-4 h-4 text-purple-500" />
                  Receitas Emitidas
                  <span className="text-xs text-gray-400 font-normal">
                    ({isFiltered ? `${filteredRecs.length} de ${receitas.length}` : receitas.length})
                  </span>
                </h2>
                {totalRenovacoes > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{totalRenovacoes} renovação</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{totalRecConsulta} em consulta</span>
                  </div>
                )}
              </div>
              {filteredRecs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Paciente</th>
                        <th className="px-5 py-3 text-center">Tipo</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredRecs.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-xs text-gray-600">{r.data}</td>
                          <td className="px-5 py-3">
                            {r.pacienteId && r.pacienteNome ? (
                              <Link href={`/admin/pacientes/${r.pacienteId}?back=${encodeURIComponent(`/admin/medicos/${medicoId}`)}`}
                                className="text-sm text-[#5BBD9B] hover:underline">{r.pacienteNome}</Link>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {r.isRenovacao ? (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Renovação</span>
                            ) : (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Em consulta</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'emitida' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {r.status === 'emitida' ? 'Emitida' : r.status ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-semibold text-[#1A3A2C]">
                            {r.isRenovacao && r.valor > 0 ? formatBRL(r.valor) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                      <tr>
                        <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Total
                        </td>
                        <td colSpan={2} className="px-5 py-3 text-xs text-gray-400">
                          {totalRenovacoes > 0
                            ? `${totalRenovacoes} renovação · ${totalRecConsulta} em consulta`
                            : `${filteredRecs.length} ${filteredRecs.length === 1 ? 'receita' : 'receitas'}`}
                        </td>
                        <td className="px-5 py-3" />
                        <td className="px-5 py-3 text-right text-sm font-bold text-[#1A3A2C]">
                          {faturamentoRenovacoes > 0 ? formatBRL(faturamentoRenovacoes) : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">Nenhuma receita no período selecionado</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {sidebar}

          {/* Dynamic resumo financeiro */}
          {custoConsulta > 0 && totalConsultas > 0 && (
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#1A3A2C] text-xs uppercase tracking-wide mb-3 flex items-center gap-1">
                Resumo Financeiro
                {isFiltered && <span className="text-[9px] text-[#5BBD9B] bg-[#5BBD9B]/10 px-1.5 py-0.5 rounded-full normal-case font-medium">filtrado</span>}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Faturamento consultas</span>
                  <span className="font-semibold text-[#1A3A2C]">{formatBRL(faturamentoConsultas)}</span>
                </div>
                {faturamentoRenovacoes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Faturamento renovações ({totalRenovacoes})</span>
                    <span className="font-semibold text-[#1A3A2C]">{formatBRL(faturamentoRenovacoes)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Custo consultas ({totalConsultas} × {formatBRL(custoConsulta)})</span>
                  <span className="font-semibold text-orange-600">- {formatBRL(custoConsultas)}</span>
                </div>
                {custoReceita > 0 && totalRenovacoes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Custo renovações ({totalRenovacoes} × {formatBRL(custoReceita)})</span>
                    <span className="font-semibold text-orange-600">- {formatBRL(custoReceitasVal)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-[#1A3A2C]">Margem bruta</span>
                  <span className={`font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatBRL(lucro)}</span>
                </div>
                {faturamento > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">% margem</span>
                    <span className={`font-semibold ${lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {Math.round((lucro / faturamento) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
