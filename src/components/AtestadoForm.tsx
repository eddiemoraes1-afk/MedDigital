'use client'

import { useState } from 'react'
import {
  Loader2, FileText, Download, CheckCircle2, X, AlertCircle,
  BriefcaseMedical, CalendarCheck, Users,
} from 'lucide-react'
import { drTitle } from '@/lib/medico-utils'

type TipoAtestado = 'afastamento' | 'comparecimento' | 'acompanhamento'

interface AtestadoFormProps {
  atendimentoId: string
  pacienteId: string
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
  onFechar?: () => void
  onSalvo?: (atestado: any) => void
}

const RELACOES = [
  'Pai',
  'Mãe',
  'Cônjuge/Companheiro(a)',
  'Filho(a)',
  'Irmão/Irmã',
  'Responsável Legal',
  'Outro',
] as const

const TITULOS_PDF: Record<TipoAtestado, string> = {
  afastamento:    'Atestado de Afastamento do Trabalho',
  comparecimento: 'Atestado de Comparecimento',
  acompanhamento: 'Atestado de Acompanhamento',
}

function extensoDias(n: number) {
  const map: Record<number, string> = {
    1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',
    11:'onze',12:'doze',13:'treze',14:'quatorze',15:'quinze',16:'dezesseis',17:'dezessete',18:'dezoito',19:'dezenove',20:'vinte',
    21:'vinte e um',22:'vinte e dois',23:'vinte e três',24:'vinte e quatro',25:'vinte e cinco',26:'vinte e seis',27:'vinte e sete',28:'vinte e oito',29:'vinte e nove',30:'trinta',
    31:'trinta e um',60:'sessenta',90:'noventa',
  }
  return map[n] ?? String(n)
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcDataFim(inicio: string, dias: number): string {
  const d = new Date(inicio + 'T12:00:00')
  d.setDate(d.getDate() + dias - 1)
  return d.toISOString().split('T')[0]
}

function gerarPDF(params: {
  tipo: TipoAtestado
  paciente: AtestadoFormProps['paciente']
  medico: AtestadoFormProps['medico']
  dias: number
  dataInicio: string
  dataEmissao: string
  cid: string
  textComplementar: string
  observacoes: string
  horaInicio: string
  horaFim: string
  nomeAcompanhante: string
  relacaoAcompanhante: string
}) {
  const {
    tipo, paciente, medico, dias, dataInicio, dataEmissao, cid, textComplementar,
    observacoes, horaInicio, horaFim, nomeAcompanhante, relacaoAcompanhante,
  } = params

  const sexoPac = paciente.sexo === 'feminino' ? 'a paciente' : 'o paciente'
  const nascFormatado = paciente.data_nascimento
    ? `nascido(a) em ${fmtData(paciente.data_nascimento)}, `
    : ''
  const cpfTrecho = paciente.cpf ? `, portador(a) do CPF nº <span class="highlight">${paciente.cpf}</span>,` : ','

  let corpo = ''
  if (tipo === 'afastamento') {
    const dataFim = calcDataFim(dataInicio, dias)
    const diasExt = extensoDias(dias)
    corpo = `
    Atesto, para os devidos fins, que ${sexoPac} <span class="highlight">${paciente.nome}</span>${cpfTrecho}
    ${nascFormatado}esteve sob minha assistência médica e encontra-se
    impossibilitado(a) de comparecer às suas atividades laborais pelo período de
    <span class="highlight">${dias} (${diasExt}) ${dias === 1 ? 'dia' : 'dias'}</span>,
    a contar de <span class="highlight">${fmtData(dataInicio)}</span> a <span class="highlight">${fmtData(dataFim)}</span>.`
  } else if (tipo === 'comparecimento') {
    corpo = `
    Atesto, para os devidos fins, que ${sexoPac} <span class="highlight">${paciente.nome}</span>${cpfTrecho}
    ${nascFormatado}compareceu à consulta médica nesta Unidade no dia
    <span class="highlight">${fmtData(dataEmissao)}</span>, no período das
    <span class="highlight">${horaInicio}</span> às <span class="highlight">${horaFim}</span>.`
  } else {
    corpo = `
    Atesto, para os devidos fins, que <span class="highlight">${nomeAcompanhante}</span>,
    ${relacaoAcompanhante} do(a) paciente <span class="highlight">${paciente.nome}</span>${cpfTrecho}
    ${nascFormatado}acompanhou o(a) mesmo(a) durante consulta médica realizada nesta Unidade no dia
    <span class="highlight">${fmtData(dataEmissao)}</span>, no período das
    <span class="highlight">${horaInicio}</span> às <span class="highlight">${horaFim}</span>.`
  }

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
      Emitido em: ${fmtData(dataEmissao)}<br/>
      Documento médico oficial
    </div>
  </div>

  <div class="title-block">
    <div class="title">${TITULOS_PDF[tipo]}</div>
    <div class="title-line"></div>
  </div>

  <p class="body-text">${corpo}
  </p>

  ${cid ? `<div><div class="cid-box">CID-10: ${cid}</div></div>` : ''}

  ${textComplementar ? `<p class="body-text">${textComplementar}</p>` : ''}

  ${observacoes ? `<div class="obs-box"><strong>Observações:</strong> ${observacoes}</div>` : ''}

  <div class="spacer"></div>

  <div class="footer">
    <div class="city-date">
      Local e data da emissão:<br/>
      <strong>${fmtData(dataEmissao)}</strong>
    </div>
    <div class="signature-block">
      <div class="sig-line"></div>
      <div class="sig-name">${drTitle(medico.sexo)} ${medico.nome}</div>
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

export default function AtestadoForm({ atendimentoId, pacienteId, paciente, medico, onFechar, onSalvo }: AtestadoFormProps) {
  const hoje = new Date().toISOString().split('T')[0]

  const [tipo, setTipo] = useState<TipoAtestado>('afastamento')

  // Afastamento
  const [dias, setDias] = useState(1)
  const [dataInicio, setDataInicio] = useState(hoje)
  const [cid, setCid] = useState('')
  const [textComplementar, setTextComplementar] = useState('')

  // Comparecimento / Acompanhamento
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')

  // Acompanhamento
  const [nomeAcompanhante, setNomeAcompanhante] = useState('')
  const [relacaoAcompanhante, setRelacaoAcompanhante] = useState('')

  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [atestadoSalvo, setAtestadoSalvo] = useState<any>(null)
  const [erro, setErro] = useState('')

  const dataFim = calcDataFim(dataInicio, dias)

  const valido =
    tipo === 'afastamento'
      ? !!dias && !!dataInicio && !!cid.trim()
      : tipo === 'comparecimento'
        ? !!horaInicio && !!horaFim
        : !!nomeAcompanhante.trim() && !!relacaoAcompanhante && !!horaInicio && !!horaFim

  function resetar() {
    setSalvo(false); setAtestadoSalvo(null)
    setDias(1); setDataInicio(hoje); setCid(''); setTextComplementar('')
    setHoraInicio(''); setHoraFim('')
    setNomeAcompanhante(''); setRelacaoAcompanhante('')
    setObservacoes('')
  }

  async function salvar() {
    if (!valido) return
    setSalvando(true)
    setErro('')
    try {
      const afast = tipo === 'afastamento'
      const res = await fetch('/api/medico/atestados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          atendimento_id: atendimentoId,
          tipo,
          data_emissao: hoje,
          data_inicio: hoje,
          data_fim: afast ? calcDataFim(hoje, dias) : hoje,
          dias: afast ? dias : 1,
          cid: tipo !== 'acompanhamento' && cid ? cid : null,
          texto_complementar: afast && textComplementar ? textComplementar : null,
          observacoes: observacoes || null,
          hora_inicio: !afast ? horaInicio : null,
          hora_fim: !afast ? horaFim : null,
          nome_acompanhante: tipo === 'acompanhamento' ? nomeAcompanhante.trim() : null,
          relacao_acompanhante: tipo === 'acompanhamento' ? relacaoAcompanhante : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSalvo(true)
      setAtestadoSalvo(data.atestado)
      onSalvo?.(data.atestado)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function baixarPDF() {
    gerarPDF({
      tipo, paciente, medico, dias, dataInicio, dataEmissao: hoje,
      cid: tipo === 'acompanhamento' ? '' : cid,
      textComplementar: tipo === 'afastamento' ? textComplementar : '',
      observacoes, horaInicio, horaFim,
      nomeAcompanhante: nomeAcompanhante.trim(), relacaoAcompanhante,
    })
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]'

  if (salvo) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold text-sm">Atestado salvo com sucesso!</p>
        </div>
        <p className="text-xs text-green-600">
          {tipo === 'afastamento'
            ? `${dias} dia(s) — de ${fmtData(dataInicio)} a ${fmtData(dataFim)}`
            : `${TITULOS_PDF[tipo]} — ${fmtData(hoje)}, das ${horaInicio} às ${horaFim}`}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={baixarPDF}
            className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </button>
          <button
            onClick={resetar}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Novo atestado
          </button>
          {onFechar && (
            <button onClick={onFechar} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2">Fechar</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {onFechar && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[#1A3A2C] flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#5BBD9B]" /> Emitir Atestado
          </h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Seletor de tipo */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { t: 'afastamento',    icon: <BriefcaseMedical className="w-4 h-4" />, label: 'Afastamento',    ativo: 'bg-[#1A3A2C] border-[#1A3A2C] text-white', inativo: 'border-gray-200 text-gray-500 hover:border-[#1A3A2C] hover:text-[#1A3A2C]' },
          { t: 'comparecimento', icon: <CalendarCheck className="w-4 h-4" />,    label: 'Comparecimento', ativo: 'bg-blue-600 border-blue-600 text-white',   inativo: 'border-gray-200 text-gray-500 hover:border-blue-600 hover:text-blue-600' },
          { t: 'acompanhamento', icon: <Users className="w-4 h-4" />,            label: 'Acompanhamento', ativo: 'bg-orange-500 border-orange-500 text-white', inativo: 'border-gray-200 text-gray-500 hover:border-orange-500 hover:text-orange-500' },
        ] as { t: TipoAtestado; icon: React.ReactNode; label: string; ativo: string; inativo: string }[]).map(({ t, icon, label, ativo, inativo }) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`flex flex-col items-center gap-1 border rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-colors ${tipo === t ? ativo : inativo}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Paciente */}
      <div className="bg-[#F0F9F5] rounded-xl px-3 py-2.5">
        <p className="text-xs font-semibold text-[#1A3A2C]">{paciente.nome}</p>
        {paciente.cpf && <p className="text-xs text-gray-500">CPF: {paciente.cpf}</p>}
      </div>

      {/* ── Campos: Afastamento ── */}
      {tipo === 'afastamento' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dias de afastamento *</label>
              <input
                type="number" min={1} max={365} value={dias}
                onChange={e => setDias(Math.max(1, parseInt(e.target.value) || 1))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de início</label>
              <div className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}>
                {fmtData(hoje)}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Sempre a data da consulta</p>
            </div>
          </div>

          {/* Preview de data fim */}
          <p className="text-xs text-gray-400">
            Período: <span className="font-medium text-gray-600">{fmtData(hoje)}</span> até <span className="font-medium text-gray-600">{fmtData(dataFim)}</span>
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              CID-10 <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={cid} onChange={e => setCid(e.target.value.toUpperCase())}
              placeholder="Ex: J00, Z76.0, M54.5"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] font-mono ${!cid.trim() ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
            />
            {!cid.trim() && <p className="text-red-400 text-xs mt-1">CID-10 é obrigatório</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Motivo / Diagnóstico <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={textComplementar} onChange={e => setTextComplementar(e.target.value)}
              rows={2}
              placeholder="Descrição do diagnóstico ou informações complementares para o atestado..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </>
      )}

      {/* ── Campos: Comparecimento ── */}
      {tipo === 'comparecimento' && (
        <>
          <p className="text-xs text-gray-400">
            Data do comparecimento: <span className="font-medium text-gray-600">{fmtData(hoje)}</span> (data da consulta)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora de entrada *</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora de saída *</label>
              <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              CID-10 <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text" value={cid} onChange={e => setCid(e.target.value.toUpperCase())}
              placeholder="Ex: J00, Z76.0, M54.5"
              className={`${inputCls} font-mono`}
            />
          </div>
        </>
      )}

      {/* ── Campos: Acompanhamento ── */}
      {tipo === 'acompanhamento' && (
        <>
          <p className="text-xs text-gray-400">
            Data do acompanhamento: <span className="font-medium text-gray-600">{fmtData(hoje)}</span> (data da consulta)
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome do acompanhante *</label>
            <input
              type="text" value={nomeAcompanhante}
              onChange={e => setNomeAcompanhante(e.target.value)}
              placeholder="Nome completo do acompanhante"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Relação com o paciente *</label>
            <select
              value={relacaoAcompanhante}
              onChange={e => setRelacaoAcompanhante(e.target.value)}
              className={`${inputCls} bg-white`}
            >
              <option value="">Selecione...</option>
              {RELACOES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora de entrada *</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora de saída *</label>
              <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className={inputCls} />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observações internas <span className="text-gray-400">(opcional)</span></label>
        <textarea
          value={observacoes} onChange={e => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Observações que aparecerão no atestado..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {erro}
        </div>
      )}

      {/* Indicador de campos pendentes */}
      {!valido && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {tipo === 'afastamento' && !cid.trim() ? 'Preencha o CID-10 para salvar.' : 'Preencha todos os campos obrigatórios (*) para salvar.'}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={salvar}
          disabled={salvando || !valido}
          className={`flex-1 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors
            ${!valido || salvando
              ? 'bg-gray-300 cursor-not-allowed'
              : tipo === 'afastamento'
                ? 'bg-[#1A3A2C] hover:bg-[#5BBD9B]'
                : tipo === 'comparecimento'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-orange-500 hover:bg-orange-600'
            }`}
        >
          {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><FileText className="w-4 h-4" /> Salvar atestado</>}
        </button>
        <button
          onClick={baixarPDF}
          disabled={!valido}
          title="Prévia do PDF (sem salvar)"
          className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center">O ícone de download gera uma prévia sem salvar no sistema.</p>
    </div>
  )
}
