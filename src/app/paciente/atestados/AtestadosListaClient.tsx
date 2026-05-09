'use client'

import { useState } from 'react'
import { Printer, Download, Share2, Eye, Lock, CheckCircle2, Clock, FileText, Mail, MessageCircle, Copy, X, Check } from 'lucide-react'

interface AtestadoItem {
  id: string
  data_emissao: string
  data_inicio: string
  data_fim: string
  dias: number
  cid?: string | null
  texto_complementar?: string | null
  observacoes?: string | null
  valido: boolean
  medicos: {
    nome: string
    crm?: string | null
    crm_uf?: string | null
    especialidade?: string | null
  } | null
}

interface Paciente {
  nome: string
  cpf?: string | null
  data_nascimento?: string | null
  sexo?: string | null
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function extensoDias(n: number) {
  const map: Record<number, string> = {
    1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',
    11:'onze',12:'doze',13:'treze',14:'quatorze',15:'quinze',16:'dezesseis',17:'dezessete',
    18:'dezoito',19:'dezenove',20:'vinte',30:'trinta',60:'sessenta',90:'noventa',
  }
  return map[n] ?? String(n)
}

function gerarHTML(at: AtestadoItem, paciente: Paciente): string {
  const m = at.medicos
  const diasExt = extensoDias(at.dias)
  const sexoPac = paciente.sexo === 'feminino' ? 'a paciente' : 'o paciente'
  const nascFormatado = paciente.data_nascimento
    ? `nascido(a) em ${fmtData(paciente.data_nascimento)}, `
    : ''
  const dataFimDate = new Date(at.data_inicio + 'T12:00:00')
  dataFimDate.setDate(dataFimDate.getDate() + at.dias - 1)
  const dataFim = dataFimDate.toISOString().split('T')[0]

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Atestado Médico — ${paciente.nome}</title>
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
      Emitido em: ${fmtData(at.data_emissao)}<br/>
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
    <span class="highlight">${at.dias} (${diasExt}) ${at.dias === 1 ? 'dia' : 'dias'}</span>,
    a contar de <span class="highlight">${fmtData(at.data_inicio)}</span> a <span class="highlight">${fmtData(dataFim)}</span>.
  </p>

  ${at.cid ? `<div><div class="cid-box">CID-10: ${at.cid}</div></div>` : ''}
  ${at.texto_complementar ? `<p class="body-text">${at.texto_complementar}</p>` : ''}
  ${at.observacoes ? `<div class="obs-box"><strong>Observações:</strong> ${at.observacoes}</div>` : ''}

  <div class="spacer"></div>

  <div class="footer">
    <div class="city-date">
      Local e data da emissão:<br/>
      <strong>${fmtData(at.data_emissao)}</strong>
    </div>
    <div class="signature-block">
      <div class="sig-line"></div>
      ${m ? `<div class="sig-name">Dr(a). ${m.nome}</div>` : ''}
      ${m?.crm ? `<div class="sig-crm">CRM-${m.crm_uf ?? 'BR'} ${m.crm}</div>` : ''}
      ${m?.especialidade ? `<div class="sig-spec">${m.especialidade}</div>` : ''}
    </div>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body>
</html>`
}

function textoCompartilhamento(at: AtestadoItem, paciente: Paciente): string {
  const dataFimDate = new Date(at.data_inicio + 'T12:00:00')
  dataFimDate.setDate(dataFimDate.getDate() + at.dias - 1)
  const dataFim = dataFimDate.toISOString().split('T')[0]
  const medNome = at.medicos?.nome ? `Dr(a). ${at.medicos.nome}` : 'médico(a)'
  return `Atestado Médico — RovarisMed\n\nPaciente: ${paciente.nome}\nPeríodo de afastamento: ${at.dias} dia(s)\nDe ${fmtData(at.data_inicio)} a ${fmtData(dataFim)}\nEmitido por ${medNome}${at.medicos?.crm ? ` (CRM-${at.medicos.crm_uf ?? 'BR'} ${at.medicos.crm})` : ''}\n${at.cid ? `CID-10: ${at.cid}\n` : ''}${at.texto_complementar ? `\n${at.texto_complementar}` : ''}`
}

export default function AtestadosListaClient({
  atestados,
  paciente,
}: {
  atestados: AtestadoItem[]
  paciente: Paciente
}) {
  const [shareTarget, setShareTarget] = useState<AtestadoItem | null>(null)
  const [copiado, setCopiado] = useState(false)

  function imprimir(at: AtestadoItem) {
    const html = gerarHTML(at, paciente)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (win) { win.document.write(html); win.document.close() }
  }

  function baixar(at: AtestadoItem) {
    const html = gerarHTML(at, paciente)
    // Remove auto-print do script para o download
    const htmlSemPrint = html.replace('<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>', '')
    const blob = new Blob([htmlSemPrint], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atestado-${paciente.nome.replace(/\s+/g, '-').toLowerCase()}-${at.data_emissao}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function copiarTexto(at: AtestadoItem) {
    const texto = textoCompartilhamento(at, paciente)
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  async function tentarNativeShare(at: AtestadoItem) {
    if (!navigator.share) return false
    const html = gerarHTML(at, paciente)
    const htmlSemPrint = html.replace('<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>', '')
    const blob = new Blob([htmlSemPrint], { type: 'text/html' })
    const file = new File([blob], `atestado-${paciente.nome.replace(/\s+/g, '-').toLowerCase()}.html`, { type: 'text/html' })
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Atestado Médico — RovarisMed' })
        return true
      }
      // Fallback: share só texto
      await navigator.share({
        title: 'Atestado Médico — RovarisMed',
        text: textoCompartilhamento(at, paciente),
      })
      return true
    } catch {
      return false
    }
  }

  async function abrirEncaminhar(at: AtestadoItem) {
    // Em mobile, tenta native share primeiro
    if ('share' in navigator) {
      const ok = await tentarNativeShare(at)
      if (ok) return
    }
    // Desktop: abre modal com opções
    setShareTarget(at)
  }

  if (atestados.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
        <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-400 font-medium">Nenhum atestado emitido</p>
        <p className="text-sm text-gray-300 mt-1">Atestados emitidos pelo médico durante suas consultas aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {atestados.map(at => {
          const medico = at.medicos
          const valido = at.valido

          return (
            <div key={at.id} className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${valido ? 'border-green-200' : 'border-gray-100'}`}>
              {/* Status banner */}
              <div className={`px-5 py-2.5 flex items-center justify-between ${valido ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  {valido ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-bold text-green-700">Atestado válido</span>
                      <span className="text-xs text-green-600">· válido até {fmtData(at.data_fim)}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500">Atestado encerrado</span>
                      <span className="text-xs text-gray-400">· encerrou em {fmtData(at.data_fim)}</span>
                    </>
                  )}
                </div>
                {!valido && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="w-3 h-3" /> somente visualização
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${valido ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {at.dias} dia{at.dias !== 1 ? 's' : ''} de afastamento
                      </span>
                      {at.cid && (
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                          CID: {at.cid}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700">
                      <span className="text-gray-400">Período: </span>
                      <strong>{fmtData(at.data_inicio)}</strong>
                      <span className="text-gray-400"> até </span>
                      <strong>{fmtData(at.data_fim)}</strong>
                    </p>

                    {medico && (
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <span className="text-gray-400">Médico: </span>
                        Dr(a). {medico.nome}
                        {medico.especialidade && <span className="text-gray-400">· {medico.especialidade}</span>}
                        {medico.crm && <span className="text-gray-400">· CRM-{medico.crm_uf ?? 'BR'} {medico.crm}</span>}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">Emitido em {fmtData(at.data_emissao)}</p>

                    {at.texto_complementar && (
                      <p className="text-xs text-gray-600 mt-3 italic bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                        "{at.texto_complementar}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {valido ? (
                      <>
                        <button
                          onClick={() => imprimir(at)}
                          className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimir
                        </button>
                        <button
                          onClick={() => baixar(at)}
                          className="flex items-center gap-1.5 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-green-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Baixar
                        </button>
                        <button
                          onClick={() => abrirEncaminhar(at)}
                          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Encaminhar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => imprimir(at)}
                        className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de encaminhamento */}
      {shareTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShareTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#1A3A2C] text-sm">Encaminhar atestado</p>
                <p className="text-xs text-gray-400 mt-0.5">{shareTarget.dias} dia(s) · {fmtData(shareTarget.data_inicio)} a {fmtData(shareTarget.data_fim)}</p>
              </div>
              <button onClick={() => setShareTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent('Atestado Médico — RovarisMed')}&body=${encodeURIComponent(textoCompartilhamento(shareTarget, paciente))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors text-sm font-medium text-gray-700"
              >
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">E-mail</p>
                  <p className="text-xs text-gray-400">Enviar por e-mail</p>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(textoCompartilhamento(shareTarget, paciente))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4.5 h-4.5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-700">WhatsApp</p>
                  <p className="text-xs text-gray-400">Enviar via WhatsApp Web</p>
                </div>
              </a>

              {/* Baixar arquivo (para depois encaminhar) */}
              <button
                onClick={() => { baixar(shareTarget); setShareTarget(null) }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                  <Download className="w-4.5 h-4.5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-700">Baixar arquivo</p>
                  <p className="text-xs text-gray-400">Salva o arquivo para encaminhar</p>
                </div>
              </button>

              {/* Copiar texto */}
              <button
                onClick={() => copiarTexto(shareTarget)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${copiado ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {copiado ? <Check className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5 text-gray-600" />}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-700">{copiado ? 'Copiado!' : 'Copiar texto'}</p>
                  <p className="text-xs text-gray-400">Copia os dados do atestado</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
