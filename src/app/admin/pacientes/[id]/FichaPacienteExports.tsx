'use client'

import { FileSpreadsheet, Printer } from 'lucide-react'

export interface AtendimentoExport {
  data: string
  hora: string
  medicoNome: string
  tipo: string
  valor: number
}

export interface AtestadoExport {
  data: string
  medicoNome: string
  dias: number | null
  cid: string | null
}

export interface ReceitaExport {
  data: string
  medicoNome: string
  isRenovacao: boolean
  status: string | null
  valor: number
}

export interface ExameExport {
  data: string
  medicoNome: string
  exames: string
  urgencia: string
}

export interface TotaisExport {
  totalAtendimentos: number
  totalAtestados: number
  totalReceitas: number
  totalExames: number
  totalRenovacoes: number
  totalRecConsulta: number
  totalGastoConsultas: number
  totalGastoRenovacoes: number
  totalGasto: number
}

interface Props {
  pacienteNome: string
  empresaNome: string
  atendimentos: AtendimentoExport[]
  atestados: AtestadoExport[]
  receitas: ReceitaExport[]
  exames: ExameExport[]
  totais: TotaisExport
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FichaPacienteExports({
  pacienteNome, empresaNome, atendimentos, atestados, receitas, exames, totais,
}: Props) {

  // ── Excel ─────────────────────────────────────────────────────────────────
  async function exportExcel() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const XLSX: any = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // ── Aba: Resumo ──────────────────────────────────────────────────────
      const resumoRows: (string | number)[][] = [
        [`Ficha do Paciente — ${pacienteNome}`],
        ['Empresa / Origem:', empresaNome || 'Particular'],
        ['Gerado em:', new Date().toLocaleString('pt-BR')],
        [],
        ['RESUMO GERAL'],
        ['Consultas realizadas', totais.totalAtendimentos],
        ['Atestados emitidos',   totais.totalAtestados],
        ['Receitas emitidas',    totais.totalReceitas],
        ['  ↳ Renovações',       totais.totalRenovacoes],
        ['  ↳ Em consulta',      totais.totalRecConsulta],
        ['Exames solicitados',   totais.totalExames],
        [],
        ['RESUMO FINANCEIRO'],
        ['Total consultas (R$)',   totais.totalGastoConsultas],
        ['Total renovações (R$)',  totais.totalGastoRenovacoes],
        ['TOTAL GASTO (R$)',       totais.totalGasto],
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoRows), 'Resumo')

      // ── Aba: Consultas ───────────────────────────────────────────────────
      if (atendimentos.length > 0) {
        const rows: (string | number)[][] = [
          ['Data', 'Hora', 'Médico', 'Tipo', 'Valor (R$)'],
          ...atendimentos.map(a => [a.data, a.hora, a.medicoNome || '—', a.tipo, a.valor]),
          [],
          ['', '', '', 'TOTAL', totais.totalGastoConsultas],
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Consultas')
      }

      // ── Aba: Atestados ───────────────────────────────────────────────────
      if (atestados.length > 0) {
        const rows: (string | number)[][] = [
          ['Data', 'Médico', 'Dias', 'CID'],
          ...atestados.map(a => [a.data, a.medicoNome || '—', a.dias ?? '—', a.cid ?? '—']),
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Atestados')
      }

      // ── Aba: Receitas ────────────────────────────────────────────────────
      if (receitas.length > 0) {
        const rows: (string | number)[][] = [
          ['Data', 'Médico', 'Tipo', 'Status', 'Valor (R$)'],
          ...receitas.map(r => [
            r.data,
            r.medicoNome || '—',
            r.isRenovacao ? 'Renovação' : 'Em consulta',
            r.status ?? '—',
            r.isRenovacao ? r.valor : '—',
          ]),
          [],
          ['', '', '', 'Total renovações', totais.totalGastoRenovacoes],
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Receitas')
      }

      // ── Aba: Exames ──────────────────────────────────────────────────────
      if (exames.length > 0) {
        const rows: (string | number)[][] = [
          ['Data', 'Médico', 'Exames Solicitados', 'Urgência'],
          ...exames.map(e => [e.data, e.medicoNome || '—', e.exames, e.urgencia]),
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Exames')
      }

      const fileName = `ficha-${pacienteNome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (e) {
      console.error('Erro ao exportar Excel:', e)
      alert('Erro ao gerar planilha.')
    }
  }

  // ── PDF (print window) ────────────────────────────────────────────────────
  function exportPDF() {
    const consultaRows = atendimentos.map(a => `
      <tr>
        <td>${a.data}<br><span class="sub">${a.hora}</span></td>
        <td>${a.medicoNome || '—'}</td>
        <td><span class="badge blue">${a.tipo}</span></td>
        <td class="num">${a.valor > 0 ? formatBRL(a.valor) : '—'}</td>
      </tr>`).join('')

    const atestHTML = atestados.length > 0 ? `
      <h3>Atestados Emitidos (${atestados.length})</h3>
      <table>
        <thead><tr><th>Data</th><th>Médico</th><th>Dias</th><th>CID</th></tr></thead>
        <tbody>${atestados.map(a => `
          <tr>
            <td>${a.data}</td>
            <td>${a.medicoNome || '—'}</td>
            <td class="num">${a.dias ?? '—'}</td>
            <td>${a.cid ?? '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''

    const examHTML = exames.length > 0 ? `
      <h3>Exames Solicitados (${exames.length})</h3>
      <table>
        <thead><tr><th>Data</th><th>Médico</th><th>Exames</th><th>Urgência</th></tr></thead>
        <tbody>${exames.map(e => `
          <tr>
            <td>${e.data}</td>
            <td>${e.medicoNome || '—'}</td>
            <td>${e.exames.replace(/\n/g, '<br>')}</td>
            <td>${e.urgencia === 'emergencia' ? '<span style="color:#dc2626;font-weight:600">Emergência</span>'
              : e.urgencia === 'urgente' ? '<span style="color:#d97706;font-weight:600">Urgente</span>'
              : 'Normal'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''

    const recHTML = receitas.length > 0 ? `
      <h3>Receitas Emitidas (${receitas.length} — ${totais.totalRenovacoes} renovação · ${totais.totalRecConsulta} em consulta)</h3>
      <table>
        <thead><tr><th>Data</th><th>Médico</th><th>Tipo</th><th>Status</th><th class="num">Valor</th></tr></thead>
        <tbody>${receitas.map(r => `
          <tr>
            <td>${r.data}</td>
            <td>${r.medicoNome || '—'}</td>
            <td>${r.isRenovacao
              ? '<span style="color:#ea580c;font-weight:600">Renovação</span>'
              : '<span style="color:#9333ea">Em consulta</span>'}</td>
            <td>${r.status ?? '—'}</td>
            <td class="num">${r.isRenovacao && r.valor > 0 ? formatBRL(r.valor) : '—'}</td>
          </tr>`).join('')}
        </tbody>
        ${totais.totalRenovacoes > 0 ? `
        <tfoot>
          <tr><td colspan="4"><strong>Total renovações</strong></td><td class="num"><strong>${formatBRL(totais.totalGastoRenovacoes)}</strong></td></tr>
        </tfoot>` : ''}
      </table>` : ''

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ficha — ${pacienteNome}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px 28px}
  h1{font-size:16px;color:#1A3A2C;margin:0 0 2px}
  .meta{color:#6b7280;font-size:10px;margin-bottom:16px}
  .kpis{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;min-width:110px}
  .kpi-label{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em}
  .kpi-value{font-size:15px;font-weight:700;color:#1A3A2C;margin-top:2px}
  .kpi-value.green{color:#16a34a}.kpi-value.amber{color:#d97706}
  .kpi-value.purple{color:#9333ea}.kpi-value.orange{color:#ea580c}
  .resumo{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:20px;max-width:340px}
  .resumo-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:6px}
  .resumo-row{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px}
  .resumo-row.total{font-weight:700;padding-top:5px;border-top:1px solid #e5e7eb;margin-top:5px;font-size:11px}
  h3{font-size:12px;color:#1A3A2C;font-weight:700;margin:20px 0 6px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
  table{width:100%;border-collapse:collapse}
  th{background:#f9fafb;text-align:left;padding:5px 8px;font-size:9px;color:#6b7280;text-transform:uppercase}
  td{padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:10px}
  tfoot td{font-weight:bold;background:#f9fafb}
  .num{text-align:right}.sub{color:#9ca3af;font-size:9px}
  .badge{font-size:9px;padding:2px 6px;border-radius:20px;font-weight:600}
  .badge.blue{background:#eff6ff;color:#1d4ed8}
  @media print{body{padding:10px 16px}}
</style></head><body>
  <h1>Ficha do Paciente — ${pacienteNome}</h1>
  <div class="meta">
    ${empresaNome ? `Empresa: ${empresaNome} · ` : ''}Gerado em ${new Date().toLocaleString('pt-BR')}
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Consultas</div><div class="kpi-value">${totais.totalAtendimentos}</div></div>
    <div class="kpi"><div class="kpi-label">Atestados</div><div class="kpi-value amber">${totais.totalAtestados}</div></div>
    <div class="kpi"><div class="kpi-label">Receitas</div><div class="kpi-value purple">${totais.totalReceitas}</div></div>
    ${totais.totalExames > 0 ? `<div class="kpi"><div class="kpi-label">Exames</div><div class="kpi-value" style="color:#2563eb">${totais.totalExames}</div></div>` : ''}
    ${totais.totalRenovacoes > 0 ? `<div class="kpi"><div class="kpi-label">Renovações</div><div class="kpi-value orange">${totais.totalRenovacoes}</div></div>` : ''}
  </div>

  <div class="resumo">
    <div class="resumo-title">Resumo Financeiro</div>
    ${totais.totalAtendimentos > 0 ? `<div class="resumo-row"><span>Consultas (${totais.totalAtendimentos})</span><span>${formatBRL(totais.totalGastoConsultas)}</span></div>` : ''}
    ${totais.totalRenovacoes > 0 ? `<div class="resumo-row"><span>Renovações (${totais.totalRenovacoes})</span><span style="color:#ea580c">${formatBRL(totais.totalGastoRenovacoes)}</span></div>` : ''}
    <div class="resumo-row total"><span>Total gasto</span><span>${formatBRL(totais.totalGasto)}</span></div>
  </div>

  <h3>Consultas Realizadas (${totais.totalAtendimentos})</h3>
  <table>
    <thead><tr><th>Data / Hora</th><th>Médico</th><th>Tipo</th><th class="num">Valor</th></tr></thead>
    <tbody>${consultaRows || `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:12px">Nenhuma consulta</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td class="num">${formatBRL(totais.totalGastoConsultas)}</td></tr></tfoot>
  </table>
  ${atestHTML}
  ${recHTML}
  ${examHTML}
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportExcel}
        className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-xl transition-colors font-medium shadow-sm"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
      </button>
      <button
        onClick={exportPDF}
        className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl transition-colors font-medium shadow-sm"
      >
        <Printer className="w-3.5 h-3.5" /> PDF
      </button>
    </div>
  )
}
