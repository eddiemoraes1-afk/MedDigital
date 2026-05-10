'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity, Building2, Users, Clock, CheckCircle2,
  Search, X, SlidersHorizontal,
} from 'lucide-react'

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
  hasAtestado: boolean
  hasReceita: boolean
}

interface Props {
  atendimentos: AtendimentoEnriquecido[]
  empresas: { id: string; nome: string }[]
  custoConsulta: number
  medicoId: string
  faturamentoTotal: number
  custoTotal: number
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FichaConsultasClient({
  atendimentos,
  empresas,
  custoConsulta,
  medicoId,
  faturamentoTotal,
  custoTotal,
}: Props) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [origem, setOrigem] = useState('all') // 'all' | 'particular' | empresaId
  const [busca, setBusca] = useState('')

  const filtered = useMemo(() => {
    return atendimentos.filter(a => {
      if (dateFrom) {
        const d = new Date(a.isoDate)
        const from = new Date(dateFrom + 'T00:00:00-03:00')
        if (d < from) return false
      }
      if (dateTo) {
        const d = new Date(a.isoDate)
        const to = new Date(dateTo + 'T23:59:59-03:00')
        if (d > to) return false
      }
      if (origem === 'particular') {
        if (a.origemTipo !== 'particular') return false
      } else if (origem !== 'all') {
        if (a.empresaId !== origem) return false
      }
      if (busca.trim()) {
        if (!a.pacienteNome.toLowerCase().includes(busca.trim().toLowerCase())) return false
      }
      return true
    })
  }, [atendimentos, dateFrom, dateTo, origem, busca])

  const isFiltered = !!(dateFrom || dateTo || origem !== 'all' || busca.trim())

  const filteredFaturamento = filtered.reduce((s, a) => s + a.valor, 0)
  const filteredCusto = filtered.reduce((s, a) => s + a.custo, 0)

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setOrigem('all')
    setBusca('')
  }

  const displayFaturamento = isFiltered ? filteredFaturamento : faturamentoTotal
  const displayCusto = isFiltered ? filteredCusto : custoTotal

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-[#5BBD9B]" />
          Histórico de Consultas
          <span className="text-xs text-gray-400 font-normal">
            ({isFiltered
              ? `${filtered.length} de ${atendimentos.length}`
              : atendimentos.length})
          </span>
        </h2>
        {atendimentos.length > 0 && (
          <span className="text-xs text-gray-400">
            {formatBRL(displayFaturamento)} faturado
            {custoConsulta > 0 && ` · ${formatBRL(displayCusto)} custo`}
          </span>
        )}
      </div>

      {/* ── Filter bar ── */}
      {atendimentos.length > 0 && (
        <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 self-center mt-4">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Filtros</span>
          </div>

          {/* De */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white"
            />
          </div>

          {/* Até */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white"
            />
          </div>

          {/* Origem */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Origem</label>
            <select
              value={origem}
              onChange={e => setOrigem(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white"
            >
              <option value="all">Todas</option>
              <option value="particular">Particular</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          {/* Paciente */}
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] text-gray-400 block mb-0.5">Paciente</label>
            <div className="relative">
              <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg pl-7 pr-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white"
              />
            </div>
          </div>

          {/* Clear */}
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-3.5"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
      )}

      {/* ── Table / Empty states ── */}
      {filtered.length > 0 ? (
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
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800 text-xs">{a.data}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {a.hora}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    {a.pacienteId && a.pacienteNome ? (
                      <Link
                        href={`/admin/pacientes/${a.pacienteId}?back=${encodeURIComponent(`/admin/medicos/${medicoId}`)}`}
                        className="text-sm text-[#5BBD9B] hover:underline font-medium"
                      >
                        {a.pacienteNome}
                      </Link>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.origemTipo === 'empresa'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {a.origemTipo === 'empresa'
                        ? <Building2 className="w-3 h-3" />
                        : <Users className="w-3 h-3" />}
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
                    {a.hasAtestado
                      ? <span title="Atestado emitido" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100">
                          <CheckCircle2 className="w-3 h-3 text-amber-600" />
                        </span>
                      : <span className="text-gray-200 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {a.hasReceita
                      ? <span title="Receita emitida" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100">
                          <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        </span>
                      : <span className="text-gray-200 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-gray-200 text-xs">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : isFiltered ? (
        <div className="py-12 text-center">
          <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum resultado para os filtros aplicados</p>
          <button
            onClick={clearFilters}
            className="mt-2 text-xs text-[#5BBD9B] hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="py-14 text-center">
          <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
        </div>
      )}
    </div>
  )
}
