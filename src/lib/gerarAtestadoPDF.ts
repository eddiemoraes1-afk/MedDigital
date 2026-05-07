// Geração de PDF de atestado médico (usado em múltiplos painéis)

export interface AtestadoPDFParams {
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
  dias: number
  dataInicio: string
  dataFim: string
  dataEmissao: string
  cid?: string | null
  textoComplementar?: string | null
  observacoes?: string | null
}

function extensoDias(n: number): string {
  const map: Record<number, string> = {
    1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',
    11:'onze',12:'doze',13:'treze',14:'quatorze',15:'quinze',16:'dezesseis',17:'dezessete',18:'dezoito',19:'dezenove',20:'vinte',
    21:'vinte e um',22:'vinte e dois',23:'vinte e três',24:'vinte e quatro',25:'vinte e cinco',
    26:'vinte e seis',27:'vinte e sete',28:'vinte e oito',29:'vinte e nove',30:'trinta',
    31:'trinta e um',60:'sessenta',90:'noventa',
  }
  return map[n] ?? String(n)
}

export function fmtDataLonga(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function gerarAtestadoPDF(params: AtestadoPDFParams) {
  const { paciente, medico, dias, dataInicio, dataFim, dataEmissao, cid, textoComplementar, observacoes } = params
  const diasExt = extensoDias(dias)
  const sexoPac = paciente.sexo === 'feminino' ? 'a paciente' : 'o paciente'
  const nascFormatado = paciente.data_nascimento
    ? `nascido(a) em ${fmtDataLonga(paciente.data_nascimento)}, `
    : ''

  const html = `<!DOCTYPE html>
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
  .title-block{text-align:center;margin-bottom:28px}
  .title{font-size:16pt;font-weight:700;color:#1A3A2C;letter-spacing:2px;text-transform:uppercase}
  .title-line{width:60px;height:3px;background:#5BBD9B;margin:8px auto 0}
  .body-text{font-size:11pt;line-height:1.9;text-align:justify;color:#333;margin-bottom:20px}
  .highlight{font-weight:600;color:#1A3A2C}
  .cid-box{display:inline-block;background:#F0F9F5;border:1px solid #5BBD9B;border-radius:6px;padding:4px 12px;font-size:9pt;color:#1A3A2C;font-weight:600;margin-bottom:16px}
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
      Emitido em: ${fmtDataLonga(dataEmissao)}<br/>
      Documento médico oficial
    </div>
  </div>

  <div class="title-block">
    <div class="title">Atestado Médico</div>
    <div class="title-line"></div>
  </div>

  <p class="body-text">
    Atesto, para os devidos fins, que ${sexoPac} <span class="highlight">${paciente.nome}</span>${paciente.cpf ? `, portador(a) do CPF nº <span class="highlight">${paciente.cpf}</span>,` : ','}
    ${nascFormatado}esteve sob minha assistência médica e encontra-se
    impossibilitado(a) de comparecer às suas atividades laborais pelo período de
    <span class="highlight">${dias} (${diasExt}) ${dias === 1 ? 'dia' : 'dias'}</span>,
    a contar de <span class="highlight">${fmtDataLonga(dataInicio)}</span> a <span class="highlight">${fmtDataLonga(dataFim)}</span>.
  </p>

  ${cid ? `<div><div class="cid-box">CID-10: ${cid}</div></div>` : ''}

  ${textoComplementar ? `<p class="body-text">${textoComplementar}</p>` : ''}

  ${observacoes ? `<div class="obs-box"><strong>Observações:</strong> ${observacoes}</div>` : ''}

  <div class="spacer"></div>

  <div class="footer">
    <div class="city-date">
      Local e data da emissão:<br/>
      <strong>${fmtDataLonga(dataEmissao)}</strong>
    </div>
    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-name">Dr(a). ${medico.nome}</div>
      ${medico.crm ? `<div class="sig-crm">CRM-${medico.crm_uf ?? 'BR'} ${medico.crm}</div>` : ''}
      ${medico.especialidade ? `<div class="sig-spec">${medico.especialidade}</div>` : ''}
    </div>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) { win.document.write(html); win.document.close() }
}
