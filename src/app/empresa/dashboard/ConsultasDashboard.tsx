'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Loader2, RefreshCw, Download,
  Stethoscope, X, FileText, ClipboardList, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Consulta {
  id: string
  data: string
  tipo: 'Agendada' | 'Virtual'
  funcionario: string
  relacao: string
  cargo: string
  secretaria: string
  medico: string
  especialidade: string
  receitas: number
  atestados: number
  atestado_dias: number
  atestado_cid: string | null
}

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

function formatDH(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ConsultasDashboard() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  // Período
  const [periodo, setPeriodo] = useState('12m')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroMedico, setFiltroMedico] = useState('')
  const [filtroSecretaria, setFiltroSecretaria] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Agendada' | 'Virtual'>('todos')
  const [filtroAtestado, setFiltroAtestado] = useState(false)
  const [filtroReceita, setFiltroReceita] = useState(false)

  // Ordenação
  const [sortKey, setSortKey] = useState<keyof Consulta>('data')
  const [sortAsc, setSortAsc] = useState(false)

  const carregar = useCallback(async (p: string, ini?: string, fi?: string) => {
    setLoading(true)
    setErro(null)
    try {
      const [de, ate] = p === 'custom' ? [ini!, fi!] : calcRange(p)
      const res = await fetch(`/api/empresa/consultas?de=${de}&ate=${ate}`)
      if (!res.ok) throw new Error('Erro ao carregar consultas')
      const json = await res.json()
      setConsultas(json.consultas ?? [])
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

  function handleCustomApply() {
    if (inicio && fim) carregar('custom', inicio, fim)
  }

  // Opções de filtro derivadas dos dados
  const medicos = [...new Set(consultas.map(c => c.medico).filter(Boolean))].sort()
  const secretarias = [...new Set(consultas.map(c => c.secretaria).filter(s => s && s !== '—'))].sort()

  // Aplicar filtros
  const filtradas = consultas
    .filter(c => {
      if (busca) {
        const q = busca.toLowerCase()
        if (!c.funcionario.toLowerCase().includes(q) && !c.medico.toLowerCase().includes(q)) return false
      }
      if (filtroMedico && c.medico !== filtroMedico) return false
      if (filtroSecretaria && c.secretaria !== filtroSecretaria) return false
      if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false
      if (filtroAtestado && c.atestados === 0) return false
      if (filtroReceita && c.receitas === 0) return false
      return true
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
      return sortAsc ? cmp : -cmp
    })

  function toggleSort(key: keyof Consulta) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  const temFiltro = busca || filtroMedico || filtroSecretaria || filtroTipo !== 'todos' || filtroAtestado || filtroReceita

  // Export Excel
  async function exportarExcel() {
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      const linhas = filtradas.map(c => ({
        'Data / Hora': formatDH(c.data),
        'Tipo': c.tipo,
        'Funcionário': c.funcionario,
        'Relação': c.relacao,
        'Cargo': c.cargo,
        'Secretaria': c.secretaria,
        'Médico': c.medico,
        'Especialidade': c.especialidade,
        'Receitas emitidas': c.receitas,
        'Atestados': c.atestados,
        'Dias atestado': c.atestado_dias || '',
        'CID': c.atestado_cid || '',
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      ws['!cols'] = [
        { wch: 18 }, { wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 20 },
        { wch: 28 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Consultas')
      XLSX.writeFile(wb, `consultas-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExportando(false)
    }
  }

  function SortIcon({ k }: { k: keyof Consulta }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-20" />
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-[#5BBD9B]" />
      : <ChevronDown className="w-3 h-3 text-[#5BBD9B]" />
  }

  function Th({ label, k, right }: { label: string; k: keyof Consulta; right?: boolean }) {
    return (
      <th
        className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1">
          {label} <SortIcon k={k} />
        </span>
      </th>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Carregando consultas...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Stethoscope className="w-10 h-10 opacity-30" />
        <p className="text-sm">{erro}</p>
        <button onClick={() => carregar(periodo)} className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Barra de período ── */}
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
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
            <span className="text-gray-400 text-xs">até</span>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
            <button onClick={handleCustomApply}
              className="bg-[#5BBD9B] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#4aab8a] transition-colors">
              Aplicar
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-[#1A3A2C]">{filtradas.length}</span> de {consultas.length} consultas
          </span>
          <button onClick={exportarExcel} disabled={exportando || filtradas.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors">
            {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Excel
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar funcionário ou médico..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40" />
        </div>

        <select value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
          <option value="">Todos os médicos</option>
          {medicos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {secretarias.length > 0 && (
          <select value={filtroSecretaria} onChange={e => setFiltroSecretaria(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
            <option value="">Todas as secretarias</option>
            {secretarias.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40">
          <option value="todos">Todos os tipos</option>
          <option value="Agendada">Agendada</option>
          <option value="Virtual">Virtual / Fila</option>
        </select>

        <button onClick={() => setFiltroAtestado(p => !p)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${filtroAtestado ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          <ClipboardList className="w-3.5 h-3.5" /> Com atestado
        </button>

        <button onClick={() => setFiltroReceita(p => !p)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${filtroReceita ? 'bg-cyan-50 border-cyan-300 text-cyan-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          <FileText className="w-3.5 h-3.5" /> Com receita
        </button>

        {temFiltro && (
          <button onClick={() => { setBusca(''); setFiltroMedico(''); setFiltroSecretaria(''); setFiltroTipo('todos'); setFiltroAtestado(false); setFiltroReceita(false) }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <Stethoscope className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {temFiltro ? 'Nenhuma consulta encontrada para os filtros aplicados.' : 'Nenhuma consulta registrada no período.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <Th label="Data / Hora" k="data" />
                  <Th label="Tipo" k="tipo" />
                  <Th label="Funcionário" k="funcionario" />
                  <Th label="Relação" k="relacao" />
                  <Th label="Secretaria" k="secretaria" />
                  <Th label="Médico" k="medico" />
                  <Th label="Especialidade" k="especialidade" />
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Receitas</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Atestado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDH(c.data)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.tipo === 'Agendada'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-[#1A3A2C] text-sm leading-tight">{c.funcionario}</p>
                      {c.cargo && c.cargo !== '—' && (
                        <p className="text-xs text-gray-400 mt-0.5">{c.cargo}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.relacao?.toLowerCase() === 'funcionário' || c.relacao?.toLowerCase() === 'funcionario'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {c.relacao || 'Funcionário'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{c.secretaria !== '—' ? c.secretaria : '—'}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-gray-800 leading-tight">{c.medico}</p>
                      {c.especialidade && (
                        <p className="text-xs text-gray-400 mt-0.5">{c.especialidade}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{c.especialidade || '—'}</td>
                    <td className="px-3 py-3 text-center">
                      {c.receitas > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">
                          <FileText className="w-3 h-3" /> {c.receitas}
                        </span>
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {c.atestados > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                            <ClipboardList className="w-3 h-3" />
                            {c.atestado_dias > 0 ? `${c.atestado_dias}d` : '✓'}
                          </span>
                          {c.atestado_cid && (
                            <span className="text-xs text-gray-400">{c.atestado_cid}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
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
