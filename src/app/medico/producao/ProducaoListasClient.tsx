'use client'

import { useState, useMemo } from 'react'
import { Search, FileText, ClipboardList, CheckCircle2, FileSpreadsheet, Printer, FlaskConical, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { drTitle } from '@/lib/medico-utils'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConsultaRow {
  id: string
  finalizado_em: string
  paciente_id: string
  paciente_nome: string
  tem_atestado: boolean
  tem_receita: boolean
  tem_exame: boolean
  tem_exclusao: boolean
  custo: number
}

export interface AtestadoRow {
  id: string
  criado_em: string
  paciente_id: string
  paciente_nome: string
  dias: number
  cid: string | null
}

export interface ReceitaRow {
  id: string
  criado_em: string
  paciente_id: string
  paciente_nome: string
  tipo: string
  valor_medico: number | null   // null = receita de consulta (sem ganho); > 0 = renovação com ganho
}

export interface ExameRow {
  id: string
  data_solicitacao: string
  paciente_id: string
  paciente_nome: string
  exames: string
  urgencia: string
}

export interface ExclusaoRow {
  id: string
  criado_em: string
  paciente_id: string
  paciente_nome: string
  status: string       // 'apto' | 'apto_ressalvas' | 'nao_apto' | 'emergencia'
  motivos: string[]
  conduta: string
}

const STATUS_EXCL_LABEL: Record<string, string> = {
  apto: 'Apto', apto_ressalvas: 'Ressalvas', nao_apto: 'Não apto', emergencia: 'Emergência',
}
const STATUS_EXCL_COR: Record<string, string> = {
  apto:           'bg-green-100 text-green-700',
  apto_ressalvas: 'bg-yellow-100 text-yellow-700',
  nao_apto:       'bg-orange-100 text-orange-700',
  emergencia:     'bg-red-100 text-red-700',
}

interface Props {
  consultas:  ConsultaRow[]
  atestados:  AtestadoRow[]
  receitas:   ReceitaRow[]
  exames:     ExameRow[]
  exclusoes:  ExclusaoRow[]
  custoConsulta: number
  periodo:    string
  medicoNome: string
  medicoSexo?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const LABEL_TIPO: Record<string, string> = {
  simples:        'Receita Simples',
  especial:       'Receita Especial',
  antimicrobiano: 'Antimicrobiano',
}

// ── CSV download ───────────────────────────────────────────────────────────────

function gerarCSV(
  consultas: ConsultaRow[], atestados: AtestadoRow[], receitas: ReceitaRow[], exames: ExameRow[],
  exclusoes: ExclusaoRow[], periodo: string, medicoNome: string, custoConsulta: number,
  medicoSexo?: string | null,
) {
  const linhas: string[] = []
  linhas.push(`Produção Médica — ${drTitle(medicoSexo)} ${medicoNome} — ${periodo}`)
  linhas.push('')

  linhas.push('CONSULTAS CONCLUÍDAS')
  linhas.push('Data,Hora,Paciente,Atestado,Receita,Exame,Prot.Exclusão,Valor')
  consultas.forEach(c => {
    linhas.push([
      fmtData(c.finalizado_em),
      fmtHora(c.finalizado_em),
      `"${c.paciente_nome}"`,
      c.tem_atestado  ? 'Sim' : 'Não',
      c.tem_receita   ? 'Sim' : 'Não',
      c.tem_exame     ? 'Sim' : 'Não',
      c.tem_exclusao  ? 'Sim' : 'Não',
      custoConsulta > 0 ? formatBRL(custoConsulta) : '—',
    ].join(','))
  })
  if (custoConsulta > 0) {
    linhas.push(`,,,,,Total,${formatBRL(consultas.length * custoConsulta)}`)
  }
  linhas.push('')

  linhas.push('ATESTADOS EMITIDOS')
  linhas.push('Data,Paciente,Dias de afastamento,CID')
  atestados.forEach(a => {
    linhas.push([
      fmtData(a.criado_em),
      `"${a.paciente_nome}"`,
      a.dias,
      a.cid || '—',
    ].join(','))
  })
  linhas.push('')

  linhas.push('RECEITAS EMITIDAS')
  linhas.push('Data,Paciente,Tipo,Origem,Ganho')
  receitas.forEach(r => {
    const isRenovacao = Number(r.valor_medico ?? 0) > 0
    linhas.push([
      fmtData(r.criado_em),
      `"${r.paciente_nome}"`,
      LABEL_TIPO[r.tipo] || r.tipo,
      isRenovacao ? 'Renovação' : 'Em consulta',
      isRenovacao ? formatBRL(Number(r.valor_medico)) : '—',
    ].join(','))
  })
  const totalGanhoRec = receitas.reduce((s, r) => s + (Number(r.valor_medico) || 0), 0)
  if (totalGanhoRec > 0) {
    linhas.push(`,,,,Total renovações,${formatBRL(totalGanhoRec)}`)
  }
  linhas.push('')

  linhas.push('SOLICITAÇÕES DE EXAMES')
  linhas.push('Data,Paciente,Exames,Urgência')
  exames.forEach(e => {
    const lista = e.exames.split('\n').map(l => l.trim()).filter(Boolean).join('; ')
    linhas.push([
      fmtData(e.data_solicitacao + 'T12:00:00'),
      `"${e.paciente_nome}"`,
      `"${lista}"`,
      e.urgencia || 'normal',
    ].join(','))
  })
  linhas.push('')

  linhas.push('PROTOCOLOS DE EXCLUSÃO DE TELEMEDICINA')
  linhas.push('Data,Paciente,Status,Motivos,Conduta')
  exclusoes.forEach(ex => {
    linhas.push([
      fmtData(ex.criado_em),
      `"${ex.paciente_nome}"`,
      STATUS_EXCL_LABEL[ex.status] || ex.status,
      `"${ex.motivos.join('; ')}"`,
      `"${ex.conduta}"`,
    ].join(','))
  })

  return '﻿' + linhas.join('\r\n')
}

// ── PDF print ─────────────────────────────────────────────────────────────────

function imprimirRelatorio(
  consultas: ConsultaRow[], atestados: AtestadoRow[], receitas: ReceitaRow[], exames: ExameRow[],
  exclusoes: ExclusaoRow[], periodo: string, medicoNome: string, custoConsulta: number,
  medicoSexo?: string | null,
) {
  const totalConsultas = consultas.length * custoConsulta

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Produção — ${drTitle(medicoSexo)} ${medicoNome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1A3A2C; padding: 24px; }
    h1  { font-size: 17px; margin-bottom: 2px; }
    .sub { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
    h2  { font-size: 12px; margin: 18px 0 8px; color: #5BBD9B; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 5px 8px; }
    td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
    .badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; }
    .bg-amber  { background:#fef3c7; color:#92400e; }
    .bg-purple { background:#ede9fe; color:#5b21b6; }
    .bg-green  { background:#d1fae5; color:#065f46; }
    .total-row td { font-weight: bold; border-top: 2px solid #e5e7eb; background: #f9fafb; }
    .val { font-weight: 700; color: #059669; }
    @media print { @page { margin: 14mm; } }
  </style>
</head>
<body>
  <h1>Produção Médica</h1>
  <p class="sub">${drTitle(medicoSexo)} ${medicoNome} &nbsp;·&nbsp; ${periodo}</p>

  <h2>Consultas Concluídas (${consultas.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>Hora</th><th>Paciente</th>
        <th>Atestado</th><th>Receita</th><th>Exame</th><th>Excl.</th>
        ${custoConsulta > 0 ? '<th>Valor</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${consultas.map(c => `
      <tr>
        <td>${fmtData(c.finalizado_em)}</td>
        <td>${fmtHora(c.finalizado_em)}</td>
        <td>${c.paciente_nome}</td>
        <td>${c.tem_atestado  ? '<span class="badge bg-amber">Sim</span>' : '—'}</td>
        <td>${c.tem_receita   ? '<span class="badge bg-purple">Sim</span>' : '—'}</td>
        <td>${c.tem_exame     ? '<span class="badge bg-green">Sim</span>' : '—'}</td>
        <td>${c.tem_exclusao  ? '<span class="badge" style="background:#ccfbf1;color:#0f766e">Sim</span>' : '—'}</td>
        ${custoConsulta > 0 ? `<td class="val">${formatBRL(custoConsulta)}</td>` : ''}
      </tr>`).join('')}
      ${custoConsulta > 0 ? `
      <tr class="total-row">
        <td colspan="${custoConsulta > 0 ? 7 : 6}">Total</td>
        <td class="val">${formatBRL(totalConsultas)}</td>
      </tr>` : ''}
    </tbody>
  </table>

  <h2>Atestados Emitidos (${atestados.length})</h2>
  <table>
    <thead><tr><th>Data</th><th>Paciente</th><th>Dias</th><th>CID</th></tr></thead>
    <tbody>
      ${atestados.map(a => `
      <tr>
        <td>${fmtData(a.criado_em)}</td>
        <td>${a.paciente_nome}</td>
        <td><span class="badge bg-amber">${a.dias} dia${a.dias !== 1 ? 's' : ''}</span></td>
        <td>${a.cid || '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h2>Receitas Emitidas (${receitas.length})</h2>
  <table>
    <thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Origem</th><th>Ganho</th></tr></thead>
    <tbody>
      ${receitas.map(r => {
        const isRenovacao = Number(r.valor_medico ?? 0) > 0
        return `
      <tr>
        <td>${fmtData(r.criado_em)}</td>
        <td>${r.paciente_nome}</td>
        <td>${LABEL_TIPO[r.tipo] || r.tipo}</td>
        <td>${isRenovacao ? '<span class="badge bg-purple">Renovação</span>' : '<span class="badge" style="background:#f3f4f6;color:#6b7280">Em consulta</span>'}</td>
        <td>${isRenovacao ? `<span class="val">${formatBRL(Number(r.valor_medico))}</span>` : '—'}</td>
      </tr>`
      }).join('')}
      ${receitas.some(r => Number(r.valor_medico ?? 0) > 0) ? `
      <tr class="total-row">
        <td colspan="4">Total renovações</td>
        <td class="val">${formatBRL(receitas.reduce((s, r) => s + (Number(r.valor_medico) || 0), 0))}</td>
      </tr>` : ''}
    </tbody>
  </table>

  <h2>Solicitações de Exames (${exames.length})</h2>
  <table>
    <thead><tr><th>Data</th><th>Paciente</th><th>Exames</th><th>Urgência</th></tr></thead>
    <tbody>
      ${exames.map(e => {
        const lista = e.exames.split('\n').map((l: string) => l.trim()).filter(Boolean).join(', ')
        const urgBadge = e.urgencia === 'emergencia'
          ? '<span class="badge" style="background:#fee2e2;color:#991b1b">Emergência</span>'
          : e.urgencia === 'urgente'
          ? '<span class="badge" style="background:#fef9c3;color:#854d0e">Urgente</span>'
          : '<span class="badge" style="background:#f3f4f6;color:#6b7280">Normal</span>'
        return `
      <tr>
        <td>${e.data_solicitacao.slice(8, 10)}/${e.data_solicitacao.slice(5, 7)}/${e.data_solicitacao.slice(0, 4)}</td>
        <td>${e.paciente_nome}</td>
        <td>${lista}</td>
        <td>${urgBadge}</td>
      </tr>`
      }).join('')}
    </tbody>
  </table>

  <h2>Protocolos de Exclusão de Telemedicina (${exclusoes.length})</h2>
  <table>
    <thead><tr><th>Data</th><th>Paciente</th><th>Status</th><th>Motivos</th><th>Conduta</th></tr></thead>
    <tbody>
      ${exclusoes.map(ex => {
        const statusCor = ex.status === 'emergencia'
          ? 'background:#fee2e2;color:#991b1b'
          : ex.status === 'nao_apto'
          ? 'background:#ffedd5;color:#c2410c'
          : ex.status === 'apto_ressalvas'
          ? 'background:#fef9c3;color:#854d0e'
          : 'background:#d1fae5;color:#065f46'
        return `
      <tr>
        <td>${fmtData(ex.criado_em)}</td>
        <td>${ex.paciente_nome}</td>
        <td><span class="badge" style="${statusCor}">${STATUS_EXCL_LABEL[ex.status] || ex.status}</span></td>
        <td style="font-size:9px">${ex.motivos.join('; ') || '—'}</td>
        <td style="font-size:9px">${ex.conduta}</td>
      </tr>`
      }).join('')}
    </tbody>
  </table>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 600)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProducaoListasClient({
  consultas, atestados, receitas, exames, exclusoes, custoConsulta, periodo, medicoNome, medicoSexo,
}: Props) {
  const [buscaC, setBuscaC] = useState('')
  const [buscaA, setBuscaA] = useState('')
  const [buscaR, setBuscaR] = useState('')
  const [buscaE, setBuscaE] = useState('')
  const [buscaX, setBuscaX] = useState('')

  const consultasFiltradas = useMemo(
    () => consultas.filter(c => c.paciente_nome.toLowerCase().includes(buscaC.toLowerCase())),
    [consultas, buscaC],
  )
  const atestadosFiltrados = useMemo(
    () => atestados.filter(a => a.paciente_nome.toLowerCase().includes(buscaA.toLowerCase())),
    [atestados, buscaA],
  )
  const receitasFiltradas = useMemo(
    () => receitas.filter(r => r.paciente_nome.toLowerCase().includes(buscaR.toLowerCase())),
    [receitas, buscaR],
  )
  const examesFiltrados = useMemo(
    () => exames.filter(e => e.paciente_nome.toLowerCase().includes(buscaE.toLowerCase())),
    [exames, buscaE],
  )
  const exclusoesFiltradas = useMemo(
    () => exclusoes.filter(ex => ex.paciente_nome.toLowerCase().includes(buscaX.toLowerCase())),
    [exclusoes, buscaX],
  )

  function baixarCSV() {
    const csv = gerarCSV(consultas, atestados, receitas, exames, exclusoes, periodo, medicoNome, custoConsulta, medicoSexo)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `producao-${medicoNome.split(' ')[0].toLowerCase()}-${periodo.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function imprimir() {
    imprimirRelatorio(consultas, atestados, receitas, exames, exclusoes, periodo, medicoNome, custoConsulta, medicoSexo)
  }

  // ── Search input ──────────────────────────────────────────────────────────────
  function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar paciente…"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 w-44"
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Cabeçalho com botões de download */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#1A3A2C] text-sm px-1">Histórico Detalhado</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={baixarCSV}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> Excel
          </button>
          <button
            onClick={imprimir}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" /> PDF
          </button>
        </div>
      </div>

      {/* ── Consultas ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#5BBD9B]" />
            <h3 className="font-bold text-[#1A3A2C] text-sm">
              Consultas ({consultasFiltradas.length}{buscaC ? ` de ${consultas.length}` : ''})
            </h3>
          </div>
          <SearchInput value={buscaC} onChange={setBuscaC} />
        </div>

        {consultasFiltradas.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {buscaC ? 'Nenhum paciente encontrado com esse nome' : 'Nenhuma consulta no período'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {consultasFiltradas.map((c, idx) => (
              <div key={c.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <span className="text-xs text-gray-300 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                <span className="text-xs text-gray-400 font-mono shrink-0 w-28">
                  {fmtData(c.finalizado_em)} {fmtHora(c.finalizado_em)}
                </span>
                <Link
                  href={`/medico/pacientes/${c.paciente_id}?back=${encodeURIComponent('/medico/producao')}`}
                  className="flex-1 text-sm font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                >
                  {c.paciente_nome}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.tem_atestado && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Atestado</span>
                  )}
                  {c.tem_receita && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Receita</span>
                  )}
                  {c.tem_exame && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Exame</span>
                  )}
                  {c.tem_exclusao && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Exclusão</span>
                  )}
                </div>
                {custoConsulta > 0 && (
                  <span className="text-sm font-bold text-green-600 shrink-0">{formatBRL(custoConsulta)}</span>
                )}
              </div>
            ))}
            {custoConsulta > 0 && consultasFiltradas.length > 0 && (
              <div className="px-6 py-3 flex items-center justify-between bg-green-50">
                <span className="text-xs font-bold text-[#1A3A2C]">
                  Subtotal ({consultasFiltradas.length} consulta{consultasFiltradas.length !== 1 ? 's' : ''})
                </span>
                <span className="text-sm font-bold text-green-700">
                  {formatBRL(consultasFiltradas.length * custoConsulta)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Atestados ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-[#1A3A2C] text-sm">
              Atestados ({atestadosFiltrados.length}{buscaA ? ` de ${atestados.length}` : ''})
            </h3>
          </div>
          <SearchInput value={buscaA} onChange={setBuscaA} />
        </div>

        {atestadosFiltrados.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {buscaA ? 'Nenhum paciente encontrado com esse nome' : 'Nenhum atestado no período'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {atestadosFiltrados.map((a, idx) => (
              <div key={a.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <span className="text-xs text-gray-300 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                <span className="text-xs text-gray-400 shrink-0">{fmtData(a.criado_em)}</span>
                <Link
                  href={`/medico/pacientes/${a.paciente_id}?back=${encodeURIComponent('/medico/producao')}`}
                  className="flex-1 text-sm font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                >
                  {a.paciente_nome}
                </Link>
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                  {a.dias} dia{a.dias !== 1 ? 's' : ''}
                </span>
                {a.cid && (
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-mono shrink-0">
                    CID {a.cid}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Receitas ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-[#1A3A2C] text-sm">
              Receitas ({receitasFiltradas.length}{buscaR ? ` de ${receitas.length}` : ''})
            </h3>
          </div>
          <SearchInput value={buscaR} onChange={setBuscaR} />
        </div>

        {receitasFiltradas.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {buscaR ? 'Nenhum paciente encontrado com esse nome' : 'Nenhuma receita no período'}
          </div>
        ) : (() => {
          const totalGanhoRenovacoes = receitasFiltradas.reduce((s, r) => s + (Number(r.valor_medico) || 0), 0)
          const qtdRenovacoes = receitasFiltradas.filter(r => (r.valor_medico ?? 0) > 0).length
          return (
            <div className="divide-y divide-gray-50">
              {receitasFiltradas.map((r, idx) => {
                const isRenovacao = Number(r.valor_medico ?? 0) > 0
                return (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <span className="text-xs text-gray-300 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                    <span className="text-xs text-gray-400 w-20 shrink-0">{fmtData(r.criado_em)}</span>
                    <Link
                      href={`/medico/pacientes/${r.paciente_id}?back=${encodeURIComponent('/medico/producao')}`}
                      className="flex-1 text-sm font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                    >
                      {r.paciente_nome}
                    </Link>
                    <span className="w-24 flex justify-center shrink-0">
                      {isRenovacao ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-bold">
                          Renovação
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">
                          Em consulta
                        </span>
                      )}
                    </span>
                    <span className="w-28 flex justify-center shrink-0">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        r.tipo === 'simples'        ? 'bg-green-100 text-green-700'  :
                        r.tipo === 'especial'       ? 'bg-purple-100 text-purple-700' :
                                                     'bg-blue-100 text-blue-700'
                      }`}>
                        {LABEL_TIPO[r.tipo] || r.tipo}
                      </span>
                    </span>
                    <span className="w-20 text-right shrink-0">
                      {isRenovacao
                        ? <span className="text-sm font-bold text-green-600">{formatBRL(Number(r.valor_medico))}</span>
                        : <span className="text-gray-300 text-sm">—</span>
                      }
                    </span>
                  </div>
                )
              })}
              {totalGanhoRenovacoes > 0 && (
                <div className="px-6 py-3 flex items-center justify-between bg-purple-50">
                  <span className="text-xs font-bold text-[#1A3A2C]">
                    Subtotal renovações ({qtdRenovacoes})
                  </span>
                  <span className="text-sm font-bold text-green-700">
                    {formatBRL(totalGanhoRenovacoes)}
                  </span>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── Exames ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-[#1A3A2C] text-sm">
              Exames ({examesFiltrados.length}{buscaE ? ` de ${exames.length}` : ''})
            </h3>
          </div>
          <SearchInput value={buscaE} onChange={setBuscaE} />
        </div>

        {examesFiltrados.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {buscaE ? 'Nenhum paciente encontrado com esse nome' : 'Nenhuma solicitação de exames no período'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {examesFiltrados.map((e, idx) => {
              const lista = e.exames.split('\n').map((l: string) => l.trim()).filter(Boolean)
              const isUrgente = e.urgencia === 'urgente' || e.urgencia === 'emergencia'
              return (
                <div key={e.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <span className="text-xs text-gray-300 font-mono w-5 text-right shrink-0 mt-0.5">{idx + 1}</span>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {e.data_solicitacao.slice(8, 10)}/{e.data_solicitacao.slice(5, 7)}
                  </span>
                  <Link
                    href={`/medico/pacientes/${e.paciente_id}?back=${encodeURIComponent('/medico/producao')}`}
                    className="text-sm font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors shrink-0"
                  >
                    {e.paciente_nome}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{lista.join(' · ')}</p>
                  </div>
                  {isUrgente && (
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      e.urgencia === 'emergencia' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {e.urgencia === 'emergencia' ? 'Emergência' : 'Urgente'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Protocolos de Exclusão ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-[#1A3A2C] text-sm">
              Prot. Exclusão ({exclusoesFiltradas.length}{buscaX ? ` de ${exclusoes.length}` : ''})
            </h3>
          </div>
          <SearchInput value={buscaX} onChange={setBuscaX} />
        </div>

        {exclusoesFiltradas.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {buscaX ? 'Nenhum paciente encontrado com esse nome' : 'Nenhum protocolo de exclusão no período'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {exclusoesFiltradas.map((ex, idx) => (
              <div key={ex.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <span className="text-xs text-gray-300 font-mono w-5 text-right shrink-0 mt-0.5">{idx + 1}</span>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {new Date(ex.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}
                </span>
                <Link
                  href={`/medico/pacientes/${ex.paciente_id}?back=${encodeURIComponent('/medico/producao')}`}
                  className="text-sm font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors shrink-0"
                >
                  {ex.paciente_nome}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 line-clamp-1">{ex.conduta}</p>
                  {ex.motivos.length > 0 && (
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {ex.motivos.length} motivo{ex.motivos.length !== 1 ? 's' : ''} · {ex.motivos[0]}{ex.motivos.length > 1 ? '…' : ''}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_EXCL_COR[ex.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_EXCL_LABEL[ex.status] ?? ex.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
