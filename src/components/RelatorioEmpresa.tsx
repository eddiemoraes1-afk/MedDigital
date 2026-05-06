'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Users, Search, FileText, Loader2, TrendingUp, Receipt, Download, Printer } from 'lucide-react'

interface Consulta {
  id: string
  data: string
  tipo: 'virtual' | 'agendada'
  paciente_id: string
  paciente_nome: string
  medico_id: string
  medico_nome: string
  valor_cobrado: number
  valor_coparticipacao: number
}

interface RelatorioData {
  empresa: {
    id: string
    nome: string
    preco_mensalidade: number
    preco_consulta: number
    percentual_coparticipacao: number
  }
  consultas: Consulta[]
  funcionariosAtivos: number
  pacientesAtivos: number
  medicos: Array<{ id: string; nome: string }>
}

interface Props {
  apiUrl: string
  titulo?: string
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDataHora(iso: string) {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDataCurta(iso: string) {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RelatorioEmpresa({ apiUrl, titulo = 'Relatório Financeiro' }: Props) {
  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [de, setDe] = useState(primeiroDiaMes.toISOString().split('T')[0])
  const [ate, setAte] = useState(hoje.toISOString().split('T')[0])
  const [buscaFuncionario, setBuscaFuncionario] = useState('')
  const [medicoFiltro, setMedicoFiltro] = useState('')
  const [dados, setDados] = useState<RelatorioData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch(`${apiUrl}?de=${de}&ate=${ate}`)
      if (!res.ok) throw new Error('Erro ao carregar dados do relatório')
      setDados(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [apiUrl, de, ate])

  useEffect(() => { carregar() }, [carregar])

  const consultasFiltradas = (dados?.consultas ?? []).filter(c => {
    if (buscaFuncionario && !c.paciente_nome.toLowerCase().includes(buscaFuncionario.toLowerCase())) return false
    if (medicoFiltro && c.medico_id !== medicoFiltro) return false
    return true
  })

  const diffDays = Math.ceil((new Date(ate).getTime() - new Date(de).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const meses = Math.max(1, Math.ceil(diffDays / 30))

  const totalConsultas = consultasFiltradas.reduce((s, c) => s + (c.valor_cobrado || 0), 0)
  const totalCoparticipacao = consultasFiltradas.reduce((s, c) => s + (c.valor_coparticipacao || 0), 0)
  const totalMensalidade = (dados?.empresa?.preco_mensalidade ?? 0) * (dados?.funcionariosAtivos ?? 0) * meses
  const totalGeral = totalConsultas + totalMensalidade
  const percentualCopart = dados?.empresa?.percentual_coparticipacao ?? 0
  const temCoparticipacao = percentualCopart > 0

  const porPaciente: Record<string, { nome: string; qtd: number; total: number; copart: number }> = {}
  for (const c of consultasFiltradas) {
    if (!porPaciente[c.paciente_id]) porPaciente[c.paciente_id] = { nome: c.paciente_nome, qtd: 0, total: 0, copart: 0 }
    porPaciente[c.paciente_id].qtd++
    porPaciente[c.paciente_id].total += c.valor_cobrado || 0
    porPaciente[c.paciente_id].copart += c.valor_coparticipacao || 0
  }
  const listaPacientes = Object.values(porPaciente).sort((a, b) => b.total - a.total)

  // ─── Export Excel ────────────────────────────────────────────────────────────
  async function exportarExcel() {
    if (!dados) return
    setExportandoExcel(true)
    try {
      const XLSX = await import('xlsx')

      const wb = XLSX.utils.book_new()

      // ── Aba 1: Consultas ──────────────────────────────────────────────────
      const headersConsultas = ['Funcionário', 'Médico', 'Data / Hora', 'Tipo', 'Valor (R$)']
      if (temCoparticipacao) headersConsultas.push(`Co-part. ${percentualCopart}% (R$)`)
      const rowsConsultas: any[][] = [headersConsultas]
      for (const c of consultasFiltradas) {
        const row: any[] = [
          c.paciente_nome,
          `Dr(a). ${c.medico_nome}`,
          formatDataCurta(c.data),
          c.tipo === 'virtual' ? 'Virtual' : 'Agendada',
          c.valor_cobrado || 0,
        ]
        if (temCoparticipacao) row.push(c.valor_coparticipacao || 0)
        rowsConsultas.push(row)
      }
      const totalRowConsultas: any[] = ['', '', '', 'TOTAL', totalConsultas]
      if (temCoparticipacao) totalRowConsultas.push(totalCoparticipacao)
      rowsConsultas.push(totalRowConsultas)

      const wsConsultas = XLSX.utils.aoa_to_sheet(rowsConsultas)
      wsConsultas['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, ...(temCoparticipacao ? [{ wch: 18 }] : [])]
      XLSX.utils.book_append_sheet(wb, wsConsultas, 'Consultas')

      // ── Aba 2: Por funcionário ────────────────────────────────────────────
      const headersPac = ['Funcionário', 'Nº Consultas', 'Total Gasto (R$)']
      if (temCoparticipacao) headersPac.push(`Co-part. ${percentualCopart}% (R$)`)
      const rowsPac: any[][] = [headersPac]
      for (const p of listaPacientes) {
        const row: any[] = [p.nome, p.qtd, p.total]
        if (temCoparticipacao) row.push(p.copart)
        rowsPac.push(row)
      }
      const totalRowPac: any[] = ['TOTAL', listaPacientes.reduce((s, p) => s + p.qtd, 0), totalConsultas]
      if (temCoparticipacao) totalRowPac.push(totalCoparticipacao)
      rowsPac.push(totalRowPac)

      const wsPac = XLSX.utils.aoa_to_sheet(rowsPac)
      wsPac['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 18 }, ...(temCoparticipacao ? [{ wch: 18 }] : [])]
      XLSX.utils.book_append_sheet(wb, wsPac, 'Por Funcionário')

      // ── Aba 3: Resumo ─────────────────────────────────────────────────────
      const nomeEmpresa = dados.empresa?.nome || 'Empresa'
      const rowsResumo: any[][] = [
        ['RELATÓRIO DE COBRANÇA'],
        [''],
        ['Empresa', nomeEmpresa],
        ['Período', `${de} a ${ate}`],
        ['Gerado em', new Date().toLocaleDateString('pt-BR')],
        [''],
        ['─── CONSULTAS ───', ''],
        ['Consultas realizadas', consultasFiltradas.length],
        ['Preço por consulta (R$)', dados.empresa?.preco_consulta || 0],
        ['Total consultas (R$)', totalConsultas],
        ...(temCoparticipacao ? [
          [''],
          ['─── CO-PARTICIPAÇÃO ───', ''],
          [`Percentual de co-participação (%)`, percentualCopart],
          ['Total co-participação funcionários (R$)', totalCoparticipacao],
        ] : []),
        [''],
        ['─── MENSALIDADE ───', ''],
        ['Funcionários ativos', dados.funcionariosAtivos || 0],
        ['Mensalidade / funcionário / mês (R$)', dados.empresa?.preco_mensalidade || 0],
        ['Meses no período', meses],
        ['Total mensalidade (R$)', totalMensalidade],
        [''],
        ['TOTAL A PAGAR (R$)', totalGeral],
      ]
      const wsResumo = XLSX.utils.aoa_to_sheet(rowsResumo)
      wsResumo['!cols'] = [{ wch: 38 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

      const nomeArquivo = `relatorio-${nomeEmpresa.replace(/\s+/g, '-')}-${de}_${ate}.xlsx`
      XLSX.writeFile(wb, nomeArquivo)
    } finally {
      setExportandoExcel(false)
    }
  }

  // ─── Export PDF (via impressão) ───────────────────────────────────────────
  function exportarPDF() {
    if (!dados) return
    const nomeEmpresa = dados.empresa?.nome || 'Empresa'
    const geradoEm = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const linhasConsultas = consultasFiltradas.map(c => `
      <tr>
        <td>${c.paciente_nome}</td>
        <td>Dr(a). ${c.medico_nome}</td>
        <td>${formatDataCurta(c.data)}</td>
        <td><span class="badge ${c.tipo === 'virtual' ? 'badge-virtual' : 'badge-agendada'}">${c.tipo === 'virtual' ? 'Virtual' : 'Agendada'}</span></td>
        <td class="valor">${formatBRL(c.valor_cobrado || 0)}</td>
        ${temCoparticipacao ? `<td class="copart">${formatBRL(c.valor_coparticipacao || 0)}</td>` : ''}
      </tr>`).join('')

    const linhasPacientes = listaPacientes.map(p => `
      <tr>
        <td>${p.nome}</td>
        <td class="center">${p.qtd}</td>
        <td class="valor">${formatBRL(p.total)}</td>
        ${temCoparticipacao ? `<td class="copart">${formatBRL(p.copart)}</td>` : ''}
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Cobrança — ${nomeEmpresa}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
  h1 { font-size: 18px; color: #1A3A2C; margin-bottom: 4px; }
  .subtitulo { color: #555; font-size: 12px; margin-bottom: 16px; }
  .meta { display: flex; gap: 24px; margin-bottom: 20px; padding: 10px 14px; background: #f5f5f5; border-radius: 6px; }
  .meta div { display: flex; flex-direction: column; }
  .meta label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: .5px; }
  .meta span { font-size: 12px; font-weight: 600; color: #1A3A2C; }
  .cards { display: flex; gap: 12px; margin-bottom: 20px; }
  .card { flex: 1; padding: 10px 14px; border-radius: 8px; }
  .card.consultas { background: #e8f4ea; }
  .card.mensalidade { background: #ede9f6; }
  .card.total { background: #1A3A2C; color: white; }
  .card .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; opacity: .7; }
  .card .val { font-size: 18px; font-weight: 700; margin-top: 2px; }
  .card.consultas .val { color: #1a7340; }
  .card.mensalidade .val { color: #6d28d9; }
  .card.total .val { color: white; }
  .secao { margin-bottom: 20px; }
  .secao h2 { font-size: 12px; font-weight: 700; color: #1A3A2C; border-bottom: 2px solid #1A3A2C; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1A3A2C; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f9fafb; }
  .valor { text-align: right; font-weight: 600; }
  .center { text-align: center; }
  tfoot td { background: #f0faf4 !important; font-weight: 700; font-size: 12px; border-top: 2px solid #5BBD9B; }
  tfoot .valor { color: #1a7340; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 9px; font-weight: 600; }
  .badge-virtual { background: #dbeafe; color: #1d4ed8; }
  .badge-agendada { background: #ede9f6; color: #6d28d9; }
  .total-geral { background: #1A3A2C; color: white; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
  .total-geral .tg-lbl { font-size: 13px; font-weight: 600; }
  .total-geral .tg-sub { font-size: 10px; opacity: .7; margin-top: 2px; }
  .total-geral .tg-val { font-size: 22px; font-weight: 700; }
  .rodape { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 9px; color: #aaa; text-align: center; }
  .copart { text-align: right; font-weight: 600; color: #c05621; }
  th.copart-h { background: #7c3d12; }
  tfoot .copart { color: #c05621; font-size: 12px; }
  .copart-bloco { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px 14px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; }
  .copart-bloco .lbl { font-size: 11px; font-weight: 600; color: #c05621; }
  .copart-bloco .sub { font-size: 10px; color: #9a3412; margin-top: 2px; }
  .copart-bloco .val { font-size: 20px; font-weight: 700; color: #c05621; }
  @media print {
    body { padding: 10px; }
    @page { margin: 15mm; size: A4; }
    .no-print { display: none !important; }
    .secao { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>Relatório de Cobrança</h1>
  <div class="subtitulo">${titulo}</div>

  <div class="meta">
    <div><label>Empresa</label><span>${nomeEmpresa}</span></div>
    <div><label>Período</label><span>${de} a ${ate}</span></div>
    <div><label>Meses</label><span>${meses} ${meses === 1 ? 'mês' : 'meses'}</span></div>
    <div><label>Gerado em</label><span>${geradoEm}</span></div>
  </div>

  <div class="cards">
    <div class="card consultas">
      <div class="lbl">Total consultas</div>
      <div class="val">${formatBRL(totalConsultas)}</div>
      <div style="font-size:10px;color:#555;margin-top:2px">${consultasFiltradas.length} consulta${consultasFiltradas.length !== 1 ? 's' : ''} × ${formatBRL(dados.empresa?.preco_consulta || 0)}</div>
    </div>
    <div class="card mensalidade">
      <div class="lbl">Total mensalidade</div>
      <div class="val">${formatBRL(totalMensalidade)}</div>
      <div style="font-size:10px;color:#555;margin-top:2px">${dados.funcionariosAtivos} func. × ${formatBRL(dados.empresa?.preco_mensalidade || 0)} × ${meses} ${meses === 1 ? 'mês' : 'meses'}</div>
    </div>
    <div class="card total">
      <div class="lbl">Total a Pagar</div>
      <div class="val">${formatBRL(totalGeral)}</div>
    </div>
  </div>

  ${consultasFiltradas.length > 0 ? `
  <div class="secao">
    <h2>Consultas Realizadas (${consultasFiltradas.length})</h2>
    <table>
      <thead><tr><th>Funcionário</th><th>Médico</th><th>Data / Hora</th><th>Tipo</th><th style="text-align:right">Valor</th>${temCoparticipacao ? `<th class="copart-h" style="text-align:right">Co-part. ${percentualCopart}%</th>` : ''}</tr></thead>
      <tbody>${linhasConsultas}</tbody>
      <tfoot><tr><td colspan="4"><strong>Total (${consultasFiltradas.length} consulta${consultasFiltradas.length !== 1 ? 's' : ''})</strong></td><td class="valor">${formatBRL(totalConsultas)}</td>${temCoparticipacao ? `<td class="copart">${formatBRL(totalCoparticipacao)}</td>` : ''}</tr></tfoot>
    </table>
  </div>

  <div class="secao">
    <h2>Gastos por Funcionário</h2>
    <table>
      <thead><tr><th>Funcionário</th><th style="text-align:center">Consultas</th><th style="text-align:right">Total gasto</th>${temCoparticipacao ? `<th class="copart-h" style="text-align:right">Co-part. ${percentualCopart}%</th>` : ''}</tr></thead>
      <tbody>${linhasPacientes}</tbody>
      <tfoot><tr><td><strong>Total</strong></td><td class="center">${listaPacientes.reduce((s, p) => s + p.qtd, 0)}</td><td class="valor">${formatBRL(totalConsultas)}</td>${temCoparticipacao ? `<td class="copart">${formatBRL(totalCoparticipacao)}</td>` : ''}</tr></tfoot>
    </table>
  </div>` : `<p style="color:#888;font-style:italic;margin-bottom:16px">Nenhuma consulta registrada no período selecionado.</p>`}

  <div class="secao">
    <h2>Mensalidade do Sistema</h2>
    <table>
      <thead><tr><th>Funcionários ativos</th><th style="text-align:center">Valor/mês/funcionário</th><th style="text-align:center">Meses</th><th style="text-align:right">Total mensalidade</th></tr></thead>
      <tbody>
        <tr>
          <td>${dados.funcionariosAtivos} funcionário${(dados.funcionariosAtivos || 0) !== 1 ? 's' : ''}</td>
          <td class="center">${formatBRL(dados.empresa?.preco_mensalidade || 0)}</td>
          <td class="center">${meses}</td>
          <td class="valor">${formatBRL(totalMensalidade)}</td>
        </tr>
      </tbody>
      <tfoot><tr><td colspan="3"><strong>Total mensalidade</strong></td><td class="valor">${formatBRL(totalMensalidade)}</td></tr></tfoot>
    </table>
  </div>

  <div class="total-geral">
    <div>
      <div class="tg-lbl">Total a Pagar no período</div>
      <div class="tg-sub">${formatBRL(totalConsultas)} consultas + ${formatBRL(totalMensalidade)} mensalidade</div>
    </div>
    <div class="tg-val">${formatBRL(totalGeral)}</div>
  </div>

  ${temCoparticipacao ? `
  <div class="copart-bloco">
    <div>
      <div class="lbl">Co-participação dos funcionários (${percentualCopart}%)</div>
      <div class="sub">${consultasFiltradas.length} consulta${consultasFiltradas.length !== 1 ? 's' : ''} × ${percentualCopart}% do valor cobrado</div>
    </div>
    <div class="val">${formatBRL(totalCoparticipacao)}</div>
  </div>` : ''}

  <div class="rodape">Relatório gerado pelo sistema RovarisMed em ${geradoEm}</div>

  <script>window.onload = () => setTimeout(() => window.print(), 400)</script>
</body>
</html>`

    const popup = window.open('', '_blank', 'width=900,height=750,scrollbars=yes')
    if (popup) {
      popup.document.write(html)
      popup.document.close()
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#5BBD9B]" />
          {titulo}
        </h2>
        {!carregando && dados && (
          <div className="flex gap-2">
            <button
              onClick={exportarExcel}
              disabled={exportandoExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {exportandoExcel
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              Excel
            </button>
            <button
              onClick={exportarPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">De:</label>
          <input
            type="date" value={de} onChange={e => setDe(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Até:</label>
          <input
            type="date" value={ate} onChange={e => setAte(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          />
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar funcionário..."
            value={buscaFuncionario}
            onChange={e => setBuscaFuncionario(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-52 focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          />
        </div>
        {(dados?.medicos ?? []).length > 0 && (
          <select
            value={medicoFiltro}
            onChange={e => setMedicoFiltro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          >
            <option value="">Todos os médicos</option>
            {dados!.medicos.map(m => (
              <option key={m.id} value={m.id}>Dr(a). {m.nome}</option>
            ))}
          </select>
        )}
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        </div>
      ) : erro ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{erro}</div>
      ) : (
        <div className="space-y-6">

          {/* Cards de resumo */}
          <div className={`grid gap-4 ${temCoparticipacao ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs text-blue-500 font-medium mb-1">Consultas</p>
              <p className="text-2xl font-bold text-blue-700">{consultasFiltradas.length}</p>
              <p className="text-xs text-blue-400 mt-1">
                {dados?.empresa?.preco_consulta ? formatBRL(dados.empresa.preco_consulta) : '—'}/consulta
              </p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4">
              <p className="text-xs text-green-500 font-medium mb-1">Total consultas</p>
              <p className="text-2xl font-bold text-green-700">{formatBRL(totalConsultas)}</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4">
              <p className="text-xs text-purple-500 font-medium mb-1">Total mensalidade</p>
              <p className="text-2xl font-bold text-purple-700">{formatBRL(totalMensalidade)}</p>
              <p className="text-xs text-purple-400 mt-1">
                {dados?.funcionariosAtivos ?? 0} func. × {meses} {meses === 1 ? 'mês' : 'meses'}
              </p>
            </div>
            {temCoparticipacao && (
              <div className="bg-orange-50 rounded-2xl p-4">
                <p className="text-xs text-orange-500 font-medium mb-1">Co-participação ({percentualCopart}%)</p>
                <p className="text-xl font-bold text-orange-700 leading-tight">{formatBRL(totalCoparticipacao)}</p>
                <p className="text-xs text-orange-400 mt-1">cobrado dos funcionários</p>
              </div>
            )}
            <div className="bg-[#1A3A2C] rounded-2xl p-4">
              <p className="text-xs text-green-300 font-medium mb-1">Total a Pagar</p>
              <p className="text-xl font-bold text-white leading-tight">{formatBRL(totalGeral)}</p>
            </div>
          </div>

          {/* Tabela de consultas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5BBD9B]" />
                Consultas realizadas
              </p>
              <p className="text-xs text-gray-400">{consultasFiltradas.length} registro{consultasFiltradas.length !== 1 ? 's' : ''}</p>
            </div>

            {consultasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Nenhuma consulta no período selecionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Funcionário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Médico</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                      {temCoparticipacao && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-orange-500 uppercase tracking-wide">Co-part. ({percentualCopart}%)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {consultasFiltradas.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{c.paciente_nome}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">Dr(a). {c.medico_nome}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDataHora(c.data)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.tipo === 'virtual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {c.tipo === 'virtual' ? '📹 Virtual' : '📅 Agendada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1A3A2C]">
                          {formatBRL(c.valor_cobrado || 0)}
                        </td>
                        {temCoparticipacao && (
                          <td className="px-4 py-3 text-right font-semibold text-orange-600">
                            {formatBRL(c.valor_coparticipacao || 0)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-50 border-t border-green-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-bold text-[#1A3A2C]">
                        Total ({consultasFiltradas.length} consulta{consultasFiltradas.length !== 1 ? 's' : ''})
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1A3A2C] text-base">
                        {formatBRL(totalConsultas)}
                      </td>
                      {temCoparticipacao && (
                        <td className="px-4 py-3 text-right font-bold text-orange-600 text-base">
                          {formatBRL(totalCoparticipacao)}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Gastos por funcionário */}
          {listaPacientes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#5BBD9B]" />
                  Gastos por funcionário
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Funcionário</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total gasto</th>
                      {temCoparticipacao && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-orange-500 uppercase tracking-wide">Co-part. ({percentualCopart}%)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {listaPacientes.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{p.qtd}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1A3A2C]">{formatBRL(p.total)}</td>
                        {temCoparticipacao && (
                          <td className="px-4 py-3 text-right font-semibold text-orange-600">{formatBRL(p.copart)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensalidade */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Mensalidade do sistema
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Funcionários ativos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor/mês/funcionário</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Meses</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total mensalidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-4 font-medium text-gray-800">{dados?.funcionariosAtivos ?? 0} funcionários</td>
                  <td className="px-4 py-4 text-center text-gray-600">{formatBRL(dados?.empresa?.preco_mensalidade ?? 0)}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{meses} {meses === 1 ? 'mês' : 'meses'}</td>
                  <td className="px-4 py-4 text-right font-semibold text-purple-700">{formatBRL(totalMensalidade)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-purple-50 border-t border-purple-100">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-bold text-[#1A3A2C]">Total mensalidade</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700 text-base">{formatBRL(totalMensalidade)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Total geral */}
          <div className="bg-[#1A3A2C] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-semibold">Total a Pagar no período</p>
                <p className="text-xs text-green-400 mt-1">
                  {formatBRL(totalConsultas)} em consultas + {formatBRL(totalMensalidade)} em mensalidade
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{formatBRL(totalGeral)}</p>
              </div>
            </div>
            {temCoparticipacao && (
              <div className="border-t border-green-800 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm font-semibold">Co-participação dos funcionários ({percentualCopart}%)</p>
                  <p className="text-xs text-orange-400 mt-1">
                    {consultasFiltradas.length} consulta{consultasFiltradas.length !== 1 ? 's' : ''} × {percentualCopart}% do valor
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-300">{formatBRL(totalCoparticipacao)}</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
