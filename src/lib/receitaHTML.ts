// Utilitário compartilhado de geração de HTML da receita médica
// Espelha atestadoHTML.ts
import { drTitle } from '@/lib/medico-utils'

export interface ReceitaHTMLParams {
  paciente: {
    nome: string
    cpf?: string | null
    data_nascimento?: string | null
    sexo?: string | null
  }
  medico: {
    nome: string
    crm?: string | null
    crm_uf?: string | null
    especialidade?: string | null
    sexo?: string | null
  }
  tipo: 'simples' | 'especial' | 'antimicrobiano'
  medicamentos: string
  instrucoes: string
  observacoes?: string | null
  validade?: string | null
  dataEmissao: string
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function labelTipo(tipo: ReceitaHTMLParams['tipo']): string {
  const map: Record<string, string> = {
    simples: 'Receituário Médico',
    especial: 'Receituário Especial Controlado',
    antimicrobiano: 'Receituário de Antimicrobiano',
  }
  return map[tipo] ?? 'Receituário Médico'
}

function labelTipoBadge(tipo: ReceitaHTMLParams['tipo']): string {
  const map: Record<string, string> = {
    simples: 'Receita Simples',
    especial: 'Receita Especial',
    antimicrobiano: 'Receita Antimicrobiano (2 vias)',
  }
  return map[tipo] ?? 'Receita Simples'
}

// Formata medicamentos: cada linha vira um item com ℞
function formatMedicamentos(texto: string): string {
  return texto
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<div class="med-item"><span class="rx">℞</span><span>${l.trim()}</span></div>`)
    .join('')
}

export function gerarHTMLReceita(p: ReceitaHTMLParams, comAutoprint = false): string {
  const { paciente, medico, tipo, medicamentos, instrucoes, observacoes, validade, dataEmissao } = p
  const titulo = labelTipo(tipo)
  const badge = labelTipoBadge(tipo)

  const isEspecial = tipo === 'especial' || tipo === 'antimicrobiano'
  const corTitulo = isEspecial ? '#7C3AED' : '#1A3A2C'
  const corLinha = isEspecial ? '#7C3AED' : '#5BBD9B'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${titulo} — ${paciente.nome}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;font-size:11pt;color:#222;background:#fff}
  .page{width:210mm;min-height:297mm;padding:20mm 20mm 18mm;margin:0 auto;display:flex;flex-direction:column}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${corTitulo};padding-bottom:14px;margin-bottom:24px}
  .header-left{display:flex;align-items:center;gap:12px}
  .logo-box{width:48px;height:48px;background:#1A3A2C;border-radius:10px;display:flex;align-items:center;justify-content:center}
  .logo-box svg{width:28px;height:28px}
  .clinic-name{font-size:15pt;font-weight:700;color:#1A3A2C;line-height:1.2}
  .clinic-sub{font-size:8pt;color:#5BBD9B;font-weight:500;letter-spacing:.5px;text-transform:uppercase}
  .doc-info{font-size:8pt;color:#999;text-align:right;line-height:1.6}
  .title-block{text-align:center;margin-bottom:24px}
  .title{font-size:16pt;font-weight:700;color:${corTitulo};letter-spacing:2px;text-transform:uppercase}
  .title-line{width:60px;height:3px;background:${corLinha};margin:8px auto 0}
  .tipo-badge{display:inline-block;background:${isEspecial ? '#EDE9FE' : '#F0F9F5'};color:${isEspecial ? '#7C3AED' : '#1A3A2C'};border:1px solid ${isEspecial ? '#C4B5FD' : '#5BBD9B'};border-radius:20px;padding:3px 14px;font-size:8.5pt;font-weight:600;margin-top:8px}
  .paciente-box{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;padding:12px 16px;margin-bottom:20px}
  .pac-label{font-size:8pt;color:#9CA3AF;text-transform:uppercase;font-weight:600;letter-spacing:.5px;margin-bottom:4px}
  .pac-nome{font-size:12pt;font-weight:700;color:#1A3A2C}
  .pac-info{font-size:9pt;color:#6B7280;margin-top:2px}
  .section-label{font-size:8.5pt;font-weight:700;color:${corTitulo};text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .section-label::after{content:'';flex:1;height:1px;background:#E5E7EB}
  .med-list{margin-bottom:20px;padding-left:0;list-style:none}
  .med-item{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px dashed #F3F4F6;font-size:11pt;color:#1F2937;line-height:1.5}
  .med-item:last-child{border-bottom:none}
  .rx{font-size:14pt;font-weight:700;color:${corLinha};line-height:1;flex-shrink:0;width:20px}
  .instrucoes-box{background:#F8F8F8;border-left:3px solid ${corLinha};padding:10px 14px;font-size:10pt;color:#374151;border-radius:0 6px 6px 0;margin-bottom:16px;line-height:1.7;white-space:pre-line}
  .obs-box{background:#FFF9C4;border-left:3px solid #F59E0B;padding:10px 14px;font-size:9.5pt;color:#555;border-radius:0 6px 6px 0;margin-bottom:16px;line-height:1.6}
  .validade-box{display:inline-flex;align-items:center;gap:6px;font-size:9pt;color:${isEspecial ? '#7C3AED' : '#1A3A2C'};background:${isEspecial ? '#EDE9FE' : '#F0F9F5'};padding:5px 12px;border-radius:20px;font-weight:600;margin-bottom:16px}
  ${isEspecial ? `.aviso-box{background:#FFF3CD;border:1px solid #F59E0B;border-radius:8px;padding:10px 14px;font-size:9pt;color:#92400E;margin-bottom:16px}` : ''}
  .spacer{flex:1}
  .footer{border-top:1px solid #E5E7EB;padding-top:24px;display:flex;justify-content:space-between;align-items:flex-end}
  .city-date{font-size:9.5pt;color:#666;line-height:1.7}
  .sig-block{text-align:center}
  .sig-line{width:200px;border-top:1px solid #333;margin:0 auto 6px}
  .sig-name{font-size:10pt;font-weight:600;color:#1A3A2C}
  .sig-crm{font-size:8.5pt;color:#666}
  .sig-spec{font-size:8.5pt;color:#5BBD9B;font-weight:500}
  @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{margin:0;padding:16mm 18mm 14mm}}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="logo-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <div>
        <div class="clinic-name">RovarisMed</div>
        <div class="clinic-sub">Saúde Digital Corporativa</div>
      </div>
    </div>
    <div class="doc-info">
      Emitido em: ${fmtData(dataEmissao)}<br/>
      Documento médico oficial
    </div>
  </div>

  <div class="title-block">
    <div class="title">${titulo}</div>
    <div class="title-line"></div>
    <div><span class="tipo-badge">${badge}</span></div>
  </div>

  <div class="paciente-box">
    <div class="pac-label">Paciente</div>
    <div class="pac-nome">${paciente.nome}</div>
    <div class="pac-info">
      ${paciente.cpf ? `CPF: ${paciente.cpf}` : ''}
      ${paciente.data_nascimento ? `${paciente.cpf ? ' · ' : ''}Nascimento: ${fmtData(paciente.data_nascimento)}` : ''}
    </div>
  </div>

  ${isEspecial ? `<div class="aviso-box">⚠ Este receituário é de uso controlado. Duas vias devem ser retidas: uma pela farmácia e outra pelo paciente.</div>` : ''}

  <div class="section-label">Medicamentos prescritos</div>
  <div class="med-list">
    ${formatMedicamentos(medicamentos)}
  </div>

  ${instrucoes ? `
  <div class="section-label">Modo de uso</div>
  <div class="instrucoes-box">${instrucoes.replace(/\n/g, '<br/>')}</div>
  ` : ''}

  ${validade ? `<div class="validade-box">📅 Válida até: ${fmtData(validade)}</div>` : ''}

  ${observacoes ? `
  <div class="obs-box"><strong>Observações:</strong> ${observacoes}</div>
  ` : ''}

  <div class="spacer"></div>

  <div class="footer">
    <div class="city-date">
      Local e data da emissão:<br/>
      <strong>${fmtData(dataEmissao)}</strong>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${drTitle(medico.sexo)} ${medico.nome}</div>
      ${medico.crm ? `<div class="sig-crm">CRM-${medico.crm_uf ?? 'BR'} ${medico.crm}</div>` : ''}
      ${medico.especialidade ? `<div class="sig-spec">${medico.especialidade}</div>` : ''}
    </div>
  </div>

</div>
${comAutoprint ? '<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>' : ''}
</body>
</html>`
}

export function nomeArquivoReceita(paciente: { nome: string }, dataEmissao: string): string {
  const nome = paciente.nome.replace(/\s+/g, '-').toLowerCase()
  return `receita-${nome}-${dataEmissao}.html`
}

/** Abre janela de impressão */
export function imprimirReceita(params: ReceitaHTMLParams): void {
  const html = gerarHTMLReceita(params, true)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) { win.document.write(html); win.document.close() }
}

/** Download do arquivo HTML */
export function baixarReceita(params: ReceitaHTMLParams): void {
  const html = gerarHTMLReceita(params, false)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivoReceita(params.paciente, params.dataEmissao)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Cria um File pronto para compartilhamento */
export function criarArquivoReceita(params: ReceitaHTMLParams): File {
  const html = gerarHTMLReceita(params, false)
  const blob = new Blob([html], { type: 'text/html' })
  return new File([blob], nomeArquivoReceita(params.paciente, params.dataEmissao), { type: 'text/html' })
}

export function textoResumidoReceita(params: ReceitaHTMLParams): string {
  const { paciente, medico, tipo, medicamentos, instrucoes } = params
  const badge = labelTipoBadge(tipo)
  return [
    `${badge} — RovarisMed`,
    `Paciente: ${paciente.nome}`,
    `Médico: ${drTitle(medico.sexo)} ${medico.nome}${medico.crm ? ` (CRM-${medico.crm_uf ?? 'BR'} ${medico.crm})` : ''}`,
    '',
    'Medicamentos:',
    medicamentos,
    instrucoes ? `\nModo de uso:\n${instrucoes}` : '',
  ].filter(s => s !== undefined).join('\n')
}
