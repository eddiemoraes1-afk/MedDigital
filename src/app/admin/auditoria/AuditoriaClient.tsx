'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Search, X, Download, ChevronDown, ChevronUp, ShieldCheck, RefreshCw } from 'lucide-react'

type Registro = {
  id: string
  criado_em: string
  tipo: string
  tipo_label: string
  status: string
  status_label: string
  paciente_nome: string
  paciente_cpf: string
  medico_nome: string
  detalhe: string
  texto_termo?: string
  versao_termo?: string
  referencia_id: string
}

const TIPO_COR: Record<string, string> = {
  lgpd_geral:    'bg-blue-100 text-blue-700 border-blue-200',
  telemedicina:  'bg-teal-100 text-teal-700 border-teal-200',
  video_voz:     'bg-purple-100 text-purple-700 border-purple-200',
  cid_autorizado:'bg-green-100 text-green-700 border-green-200',
  cid_negado:    'bg-red-100 text-red-700 border-red-200',
  cid_pendente:  'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const STATUS_COR: Record<string, string> = {
  aceito:     'text-green-600 font-semibold',
  autorizado: 'text-green-600 font-semibold',
  recusado:   'text-red-600 font-semibold',
  negado:     'text-red-600 font-semibold',
  pendente:   'text-yellow-600 font-semibold',
}

function fmtDH(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export default function AuditoriaClient() {
  const hoje = new Date().toISOString().split('T')[0]
  const umMesAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [registros, setRegistros]     = useState<Registro[]>([])
  const [contagem, setContagem]       = useState<Record<string, number>>({})
  const [carregando, setCarregando]   = useState(true)
  const [dataInicio, setDataInicio]   = useState(umMesAtras)
  const [dataFim, setDataFim]         = useState(hoje)
  const [tipoFiltro, setTipoFiltro]   = useState('')
  const [nomeFiltro, setNomeFiltro]   = useState('')
  const [expandido, setExpandido]     = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams()
    if (dataInicio)  p.set('dataInicio', dataInicio)
    if (dataFim)     p.set('dataFim',    dataFim)
    if (tipoFiltro)  p.set('tipo',       tipoFiltro)
    if (nomeFiltro)  p.set('nome',       nomeFiltro)
    const res = await fetch(`/api/admin/auditoria?${p}`)
    const d = await res.json()
    setRegistros(d.registros ?? [])
    setContagem(d.contagem ?? {})
    setCarregando(false)
  }, [dataInicio, dataFim, tipoFiltro, nomeFiltro])

  useEffect(() => { carregar() }, [carregar])

  function exportarCSV() {
    const linhas = [
      ['Data/Hora', 'Tipo', 'Status', 'Paciente', 'CPF', 'Médico', 'Detalhe', 'Versão Termo'],
      ...registros.map(r => [
        fmtDH(r.criado_em), r.tipo_label, r.status_label,
        r.paciente_nome, r.paciente_cpf, r.medico_nome,
        r.detalhe, r.versao_termo ?? '—',
      ]),
    ]
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria_consentimentos_${hoje}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#5BBD9B] focus:outline-none'

  return (
    <div className="space-y-5">
      {/* Cards de contagem */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { tipo: 'lgpd_geral',    label: 'LGPD Geral',       cor: 'bg-blue-50 border-blue-200 text-blue-700' },
          { tipo: 'telemedicina',  label: 'Telemedicina',      cor: 'bg-teal-50 border-teal-200 text-teal-700' },
          { tipo: 'video_voz',     label: 'Vídeo e Voz',       cor: 'bg-purple-50 border-purple-200 text-purple-700' },
          { tipo: 'cid_autorizado',label: 'CID Autorizado',    cor: 'bg-green-50 border-green-200 text-green-700' },
          { tipo: 'cid_negado',    label: 'CID Recusado',      cor: 'bg-red-50 border-red-200 text-red-700' },
          { tipo: 'cid_pendente',  label: 'CID Pendente',      cor: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
        ].map(c => (
          <button
            key={c.tipo}
            onClick={() => setTipoFiltro(t => t === c.tipo ? '' : c.tipo)}
            className={`rounded-xl border p-3 text-left transition-all ${c.cor} ${tipoFiltro === c.tipo ? 'ring-2 ring-offset-1 ring-[#5BBD9B]' : 'hover:shadow-sm'}`}
          >
            <p className="text-xl font-bold">{contagem[c.tipo] ?? 0}</p>
            <p className="text-[11px] font-medium leading-tight mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Tipo</label>
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              <option value="lgpd_geral">LGPD Geral</option>
              <option value="telemedicina">Telemedicina</option>
              <option value="video_voz">Vídeo e Voz</option>
              <option value="cid_autorizado">CID Autorizado</option>
              <option value="cid_negado">CID Recusado</option>
              <option value="cid_pendente">CID Pendente</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Paciente</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input
                type="text" value={nomeFiltro}
                onChange={e => setNomeFiltro(e.target.value)}
                placeholder="Buscar por nome..."
                className={`${inputCls} pl-7 w-full`}
              />
              {nomeFiltro && (
                <button onClick={() => setNomeFiltro('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <button onClick={carregar} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A3A2C] border border-gray-200 px-3 py-1.5 rounded-lg bg-white transition-colors self-end">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={exportarCSV} className="flex items-center gap-1.5 text-xs text-[#1A3A2C] border border-[#5BBD9B] px-3 py-1.5 rounded-lg bg-white hover:bg-[#F0F9F5] transition-colors self-end">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">{registros.length} registro{registros.length !== 1 ? 's' : ''} encontrado{registros.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum registro encontrado</p>
            <p className="text-xs text-gray-300 mt-1">Ajuste os filtros ou aguarde novos consentimentos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Data / Hora</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Paciente</th>
                  <th className="px-4 py-3 text-left">CPF</th>
                  <th className="px-4 py-3 text-left">Médico / Detalhe</th>
                  <th className="px-4 py-3 text-left w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registros.map(r => (
                  <>
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{fmtDH(r.criado_em)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${TIPO_COR[r.tipo] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {r.tipo_label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${STATUS_COR[r.status] ?? 'text-gray-600'}`}>
                        {r.status_label}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#1A3A2C] whitespace-nowrap">{r.paciente_nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{r.paciente_cpf}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.medico_nome !== '—' && <p className="font-medium text-gray-700">{r.medico_nome}</p>}
                        <p className="text-gray-400">{r.detalhe}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.texto_termo && (
                          <button
                            onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                            className="text-gray-400 hover:text-[#1A3A2C] transition-colors"
                            title="Ver texto do termo"
                          >
                            {expandido === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandido === r.id && r.texto_termo && (
                      <tr key={`${r.id}-exp`} className="bg-blue-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="flex gap-3 items-start">
                            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-blue-700 mb-1">
                                Texto integral do termo — versão {r.versao_termo}
                              </p>
                              <p className="text-xs text-blue-800 leading-relaxed max-w-3xl">{r.texto_termo}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
