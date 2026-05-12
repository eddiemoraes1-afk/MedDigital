// ── examesHTML.ts ────────────────────────────────────────────────────────────
// Gerador de HTML/PDF para Solicitações de Exames

export interface ExamesHTMLParams {
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
  }
  exames: string              // lista de exames (um por linha)
  indicacaoClinica?: string | null
  observacoes?: string | null
  urgencia?: string | null    // normal | urgente | emergencia
  dataSolicitacao: string     // ISO date
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

const URGENCIA_LABEL: Record<string, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  emergencia: 'Emergência',
}

const URGENCIA_COLOR: Record<string, string> = {
  normal: '#1A3A2C',
  urgente: '#D97706',
  emergencia: '#DC2626',
}

export function nomeArquivoExames(paciente: { nome: string }, data: string) {
  const slug = paciente.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `solicitacao-exames-${slug}-${data}.pdf`
}

export function gerarHTMLExames(params: ExamesHTMLParams, inline = true): string {
  const { paciente, medico, exames, indicacaoClinica, observacoes, urgencia, dataSolicitacao } = params

  const urgLabel = URGENCIA_LABEL[urgencia ?? 'normal'] ?? 'Normal'
  const urgColor = URGENCIA_COLOR[urgencia ?? 'normal'] ?? '#1A3A2C'
  const urgIsAlt = urgencia === 'urgente' || urgencia === 'emergencia'

  // Formatar lista de exames em itens HTML
  const examesList = exames
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => `<li>${l}</li>`)
    .join('\n')

  const script = inline
    ? `<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;font-size:11pt;color:#222;background:#fff;padding:0}
  .page{width:210mm;min-height:297mm;padding:20mm 20mm 18mm;margin:0 auto;display:flex;flex-direction:column}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1A3A2C;padding-bottom:14px;margin-bottom:24px}
  .header-left{display:flex;align-items:center;gap:12px}
  .logo-box{width:48px;height:48px;background:#1A3A2C;border-radius:10px;display:flex;align-items:center;justify-content:center}
  .logo-box svg{width:28px;height:28px}
  .clinic-name{font-size:15pt;font-weight:700;color:#1A3A2C;line-height:1.2}
  .clinic-sub{font-size:8pt;color:#5BBD9B;font-weight:500;letter-spacing:.5px;text-transform:uppercase}
  .doc-number{font-size:8pt;color:#999;text-align:right}
  .title-block{text-align:center;margin-bottom:24px}
  .title{font-size:16pt;font-weight:700;color:#1A3A2C;letter-spacing:2px;text-transform:uppercase}
  .title-line{width:60px;height:3px;background:#5BBD9B;margin:8px auto 0}
  .urgencia-badge{display:inline-block;background:${urgColor}18;border:1.5px solid ${urgColor};border-radius:20px;padding:4px 14px;font-size:9pt;color:${urgColor};font-weight:700;margin-bottom:16px}
  .paciente-box{background:#F0F9F5;border:1px solid #5BBD9B;border-radius:8px;padding:12px 16px;margin-bottom:20px}
  .paciente-box .label{font-size:8pt;color:#5BBD9B;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .paciente-box .nome{font-size:12pt;font-weight:700;color:#1A3A2C}
  .paciente-box .info{font-size:9pt;color:#555;margin-top:2px}
  .section-title{font-size:9pt;font-weight:700;color:#1A3A2C;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;border-bottom:1px solid #E5E7EB;padding-bottom:4px}
  .exames-list{list-style:none;margin-bottom:20px}
  .exames-list li{display:flex;align-items:flex-start;gap:10px;padding:8px 12px;border-radius:6px;font-size:11pt;color:#222;margin-bottom:4px;background:#F8F8F8;border:1px solid #E5E7EB}
  .exames-list li::before{content:"□";font-size:14pt;color:#1A3A2C;margin-top:-1px;flex-shrink:0}
  .indicacao-box{background:#FFF9F0;border-left:3px solid #D97706;padding:10px 14px;font-size:9.5pt;color:#555;border-radius:0 6px 6px 0;margin-bottom:16px;line-height:1.6}
  .obs-box{background:#F8F8F8;border-left:3px solid #5BBD9B;padding:10px 14px;font-size:9.5pt;color:#555;border-radius:0 6px 6px 0;margin-bottom:20px;line-height:1.6}
  .spacer{flex:1}
  .footer{border-top:1px solid #E5E7EB;padding-top:24px;display:flex;justify-content:space-between;align-items:flex-end}
  .city-date{font-size:9.5pt;color:#666}
  .signature-block{text-align:center}
  .sig-line{width:200px;border-top:1px solid #333;margin:0 auto 6px}
  .sig-name{font-size:10pt;font-weight:600;color:#1A3A2C}
  .sig-crm{font-size:8.5pt;color:#666}
  .sig-spec{font-size:8.5pt;color:#5BBD9B;font-weight:500}
  @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{margin:0;padding:16mm 18mm 14mm}}
</style>
</head>
<body>
<div class="page">

  <!-- Cabeçalho -->
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
    <div class="doc-number">
      Emitido em: ${fmtData(dataSolicitacao)}<br/>
      Documento médico oficial
    </div>
  </div>

  <!-- Título -->
  <div class="title-block">
    <div class="title">Solicitação de Exames</div>
    <div class="title-line"></div>
  </div>

  ${urgIsAlt ? `<div style="text-align:center;margin-bottom:16px"><span class="urgencia-badge">⚠ Urgência: ${urgLabel}</span></div>` : ''}

  <!-- Dados do paciente -->
  <div class="paciente-box">
    <div class="label">Paciente</div>
    <div class="nome">${paciente.nome}</div>
    <div class="info">${[
      paciente.cpf ? `CPF: ${paciente.cpf}` : '',
      paciente.data_nascimento ? `Nasc.: ${fmtData(paciente.data_nascimento)}` : '',
      paciente.sexo ? `Sexo: ${paciente.sexo}` : '',
    ].filter(Boolean).join(' · ')}</div>
  </div>

  <!-- Exames solicitados -->
  <div class="section-title">Exames solicitados</div>
  <ul class="exames-list">
    ${examesList}
  </ul>

  ${indicacaoClinica ? `
  <div class="section-title">Indicação clínica / Hipótese diagnóstica</div>
  <div class="indicacao-box">${indicacaoClinica}</div>
  ` : ''}

  ${observacoes ? `
  <div class="section-title">Orientações e observações</div>
  <div class="obs-box">${observacoes}</div>
  ` : ''}

  <div class="spacer"></div>

  <!-- Rodapé -->
  <div class="footer">
    <div class="city-date">
      Data da solicitação:<br/>
      <strong>${fmtData(dataSolicitacao)}</strong>
    </div>
    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-name">Dr(a). ${medico.nome}</div>
      ${medico.crm ? `<div class="sig-crm">CRM-${medico.crm_uf ?? 'BR'} ${medico.crm}</div>` : ''}
      ${medico.especialidade ? `<div class="sig-spec">${medico.especialidade}</div>` : ''}
    </div>
  </div>
</div>
${script}
</body>
</html>`
}

export function imprimirExames(params: ExamesHTMLParams) {
  const html = gerarHTMLExames(params, true)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) { win.document.write(html); win.document.close() }
}
