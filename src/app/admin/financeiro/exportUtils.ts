import * as XLSX from 'xlsx'

// ─── Excel ─────────────────────────────────────────────────────────────────
export function exportarExcel(
  linhas: Record<string, unknown>[],
  nomeArquivo: string,
  nomeAba = 'Relatório',
) {
  if (!linhas.length) return
  const ws = XLSX.utils.json_to_sheet(linhas)

  // Auto-largura das colunas
  const headers = Object.keys(linhas[0])
  ws['!cols'] = headers.map(h => ({
    wch: Math.min(
      Math.max(h.length, ...linhas.map(r => String(r[h] ?? '').length)) + 2,
      55,
    ),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, nomeAba.slice(0, 31))
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}

// ─── PDF (print window) ────────────────────────────────────────────────────
export type LinhaPDF = {
  cells: string[]
  negrito?: boolean
  corFundo?: string   // hex sem '#', ex: '1A3A2C'
  corTexto?: string   // hex sem '#', ex: 'FFFFFF'
  indentado?: boolean
}

export function exportarPDF(
  titulo: string,
  colunas: string[],
  linhas: LinhaPDF[],
  rodape?: string,
) {
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const thead = `<tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr>`
  const tbody = linhas.map(l => {
    const style = [
      l.corFundo  ? `background:#${l.corFundo};`         : '',
      l.corTexto  ? `color:#${l.corTexto};`              : '',
      l.negrito   ? 'font-weight:bold;'                  : '',
    ].join('')
    const tdStyle = l.indentado ? 'padding-left:24px;' : ''
    const cells = l.cells.map((c, i) => `<td style="${i === 0 ? tdStyle : ''}">${c}</td>`).join('')
    return `<tr style="${style}">${cells}</tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:16px 20px}
    h1{font-size:14px;color:#1A3A2C;margin-bottom:2px}
    .sub{font-size:9px;color:#777;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#1A3A2C;color:#fff;padding:5px 7px;text-align:left;font-size:9px;white-space:nowrap}
    td{padding:4px 7px;border-bottom:1px solid #e5e7eb;font-size:9.5px;vertical-align:middle}
    tr:nth-child(even) td{background:#f9fafb}
    .rodape{margin-top:10px;font-size:8px;color:#aaa;text-align:right}
    @media print{body{padding:0} .no-print{display:none}}
  </style>
</head>
<body>
  <h1>${titulo}</h1>
  <p class="sub">Gerado em ${geradoEm}</p>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  ${rodape ? `<p class="rodape">${rodape}</p>` : ''}
  <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=960,height=720')
  if (w) { w.document.write(html); w.document.close() }
}

// ─── Helpers de formatação ─────────────────────────────────────────────────
export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtDataBR = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
