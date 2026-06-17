'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, X, RefreshCw, ChevronDown, ChevronUp, ClipboardEdit, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string
  criado_em: string
  campos_alterados: { campo: string; de: string | null; para: string | null }[]
  ip_address: string | null
  medicos:   { id: string; nome: string; crm?: string | null; crm_uf?: string | null; sexo?: string | null } | null
  pacientes: { id: string; nome: string; cpf?: string | null } | null
}

// ── Labels dos campos ──────────────────────────────────────────────────────────

const CAMPO_LABEL: Record<string, string> = {
  alergias:                'Alergias e Reações Adversas',
  hpp:                     'HPP — História Patológica Pregressa',
  medicamentos_em_uso:     'Medicamentos em Uso',
  historia_familiar:       'Antecedentes Familiares',
  historia_social:         'Hábitos de Vida',
  comorbidades:            'Comorbidades / Doenças Ativas',
  antecedentes_cirurgicos: 'Antecedentes Cirúrgicos',
  imunizacoes:             'Imunizações',
  historico_ginecologico:  'Histórico Ginecológico e Obstétrico',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDH(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function prefixo(sexo: string | null | undefined) {
  return sexo === 'feminino' ? 'Dra.' : 'Dr.'
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function LogsAntecedentesClient({ logsIniciais }: { logsIniciais: LogEntry[] }) {
  const hoje         = new Date().toISOString().split('T')[0]
  const umMesAtras   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [logs,           setLogs]          = useState<LogEntry[]>(logsIniciais)
  const [carregando,     setCarregando]    = useState(false)
  const [dataInicio,     setDataInicio]    = useState(umMesAtras)
  const [dataFim,        setDataFim]       = useState(hoje)
  const [filtroPaciente, setFiltroPaciente] = useState('')
  const [filtroMedico,   setFiltroMedico]  = useState('')
  const [expandido,      setExpandido]     = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams()
    if (dataInicio)     p.set('dataInicio', dataInicio)
    if (dataFim)        p.set('dataFim',    dataFim)
    if (filtroPaciente) p.set('paciente',   filtroPaciente)
    if (filtroMedico)   p.set('medico',     filtroMedico)
    const res = await fetch(`/api/admin/logs-antecedentes?${p}`)
    const d   = await res.json()
    setLogs(d.logs ?? [])
    setCarregando(false)
  }, [dataInicio, dataFim, filtroPaciente, filtroMedico])

  useEffect(() => { carregar() }, [carregar])

  function exportarExcel() {
    const dados = logs.flatMap(log =>
      (log.campos_alterados ?? []).map(item => ({
        'Data/Hora':   fmtDH(log.criado_em),
        'Paciente':    log.pacientes?.nome ?? '—',
        'CPF':         log.pacientes?.cpf  ?? '—',
        'Médico':      log.medicos ? `${prefixo(log.medicos.sexo)} ${log.medicos.nome}` : '—',
        'CRM':         log.medicos?.crm ? `CRM-${log.medicos.crm_uf ?? 'BR'} ${log.medicos.crm}` : '—',
        'IP':          log.ip_address ?? '—',
        'Campo':       CAMPO_LABEL[item.campo] ?? item.campo,
        'Antes':       item.de   ?? '(vazio)',
        'Depois':      item.para ?? '(vazio)',
      }))
    )

    const ws = XLSX.utils.json_to_sheet(dados)
    ws['!cols'] = [
      { wch: 22 }, // Data/Hora
      { wch: 28 }, // Paciente
      { wch: 16 }, // CPF
      { wch: 28 }, // Médico
      { wch: 20 }, // CRM
      { wch: 16 }, // IP
      { wch: 32 }, // Campo
      { wch: 45 }, // Antes
      { wch: 45 }, // Depois
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Edições Antecedentes')
    const buf  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `audit_antecedentes_${hoje}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#5BBD9B] focus:outline-none'

  return (
    <div className="space-y-5">
      {/* Card contador */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardEdit className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A3A2C]">{logs.length}</p>
            <p className="text-xs text-gray-400">edições no período</p>
          </div>
        </div>
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
          <div className="flex flex-col gap-0.5 flex-1 min-w-[140px]">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Paciente</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input type="text" value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} placeholder="Buscar..." className={`${inputCls} pl-7 w-full`} />
              {filtroPaciente && <button onClick={() => setFiltroPaciente('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>}
            </div>
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-[140px]">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Médico</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input type="text" value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)} placeholder="Buscar..." className={`${inputCls} pl-7 w-full`} />
              {filtroMedico && <button onClick={() => setFiltroMedico('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>}
            </div>
          </div>
          <button onClick={carregar} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A3A2C] border border-gray-200 px-3 py-1.5 rounded-lg bg-white transition-colors self-end">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 text-xs text-[#1A3A2C] border border-[#5BBD9B] px-3 py-1.5 rounded-lg bg-white hover:bg-[#F0F9F5] transition-colors self-end">
            <Download className="w-3.5 h-3.5" /> Exportar Excel
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">{logs.length} edição{logs.length !== 1 ? 'ões' : ''} encontrada{logs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardEdit className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhuma edição encontrada</p>
            <p className="text-xs text-gray-300 mt-1">Ajuste os filtros ou aguarde novas edições</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Data / Hora</th>
                  <th className="px-4 py-3 text-left">Paciente</th>
                  <th className="px-4 py-3 text-left">Médico</th>
                  <th className="px-4 py-3 text-left">CRM</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">Campos</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                        {fmtDH(log.criado_em)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-[#1A3A2C] whitespace-nowrap">{log.pacientes?.nome ?? '—'}</p>
                        {log.pacientes?.cpf && <p className="text-[10px] text-gray-400 font-mono">{log.pacientes.cpf}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        {log.medicos ? `${prefixo(log.medicos.sexo)} ${log.medicos.nome}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                        {log.medicos?.crm ? `CRM-${log.medicos.crm_uf ?? 'BR'} ${log.medicos.crm}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {log.ip_address ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {log.campos_alterados.length} campo{log.campos_alterados.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandido(expandido === log.id ? null : log.id)}
                          className="text-gray-400 hover:text-[#1A3A2C] transition-colors"
                        >
                          {expandido === log.id
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {expandido === log.id && (
                      <tr key={`${log.id}-exp`}>
                        <td colSpan={7} className="bg-blue-50 px-6 py-4">
                          <p className="text-xs font-bold text-blue-700 mb-3 uppercase tracking-wide">
                            Campos alterados nesta edição
                          </p>
                          <div className="space-y-3">
                            {log.campos_alterados.map((item, i) => (
                              <div key={i}>
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                  {CAMPO_LABEL[item.campo] ?? item.campo}
                                </p>
                                <div className="grid grid-cols-2 gap-2 max-w-2xl">
                                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold text-red-400 uppercase mb-0.5">Antes</p>
                                    <p className="text-xs text-red-700 whitespace-pre-wrap">
                                      {item.de ?? <em className="text-red-300">vazio</em>}
                                    </p>
                                  </div>
                                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold text-green-400 uppercase mb-0.5">Depois</p>
                                    <p className="text-xs text-green-700 whitespace-pre-wrap">
                                      {item.para ?? <em className="text-green-300">vazio</em>}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
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
