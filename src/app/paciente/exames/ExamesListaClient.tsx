'use client'

import { useState } from 'react'
import { Printer, Download, Share2, FlaskConical, AlertTriangle, Loader2, Clock, Lock } from 'lucide-react'
import { imprimirExames, gerarHTMLExames, nomeArquivoExames, type ExamesHTMLParams } from '@/lib/examesHTML'
import { baixarComoPDF } from '@/lib/gerarPDF'
import { drTitle } from '@/lib/medico-utils'

interface ExameItem {
  id: string
  data_solicitacao: string
  exames: string
  indicacao_clinica?: string | null
  observacoes?: string | null
  urgencia?: string | null
  status?: string | null
  medicos: {
    nome: string
    crm?: string | null
    crm_uf?: string | null
    especialidade?: string | null
    sexo?: string | null
  } | null
}

interface Paciente {
  nome: string
  cpf?: string | null
  data_nascimento?: string | null
  sexo?: string | null
}

const VALIDADE_EXAMES_DIAS = 90

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function isExameValido(dataSolicitacao: string): boolean {
  const emissao = new Date(dataSolicitacao + 'T12:00:00')
  const expira = new Date(emissao)
  expira.setDate(expira.getDate() + VALIDADE_EXAMES_DIAS)
  return new Date() <= expira
}

function dataExpiracao(dataSolicitacao: string): string {
  const emissao = new Date(dataSolicitacao + 'T12:00:00')
  const expira = new Date(emissao)
  expira.setDate(expira.getDate() + VALIDADE_EXAMES_DIAS)
  return expira.toISOString().split('T')[0]
}

const URGENCIA_LABEL: Record<string, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  emergencia: 'Emergência',
}
const URGENCIA_BADGE: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  urgente: 'bg-yellow-100 text-yellow-700',
  emergencia: 'bg-red-100 text-red-700',
}

function toParams(ex: ExameItem, paciente: Paciente): ExamesHTMLParams | null {
  if (!ex.medicos) return null
  return {
    paciente,
    medico: ex.medicos,
    exames: ex.exames,
    indicacaoClinica: ex.indicacao_clinica,
    observacoes: ex.observacoes,
    urgencia: ex.urgencia ?? 'normal',
    dataSolicitacao: ex.data_solicitacao,
  }
}

function ExameShareModal({ params, onClose }: { params: ExamesHTMLParams; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const html = gerarHTMLExames(params, false)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  function copiarLink() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-[#1A3A2C] mb-4 flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Encaminhar Solicitação de Exames
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Baixe o PDF e envie pelo canal de sua preferência (e-mail, WhatsApp, etc).
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => baixarComoPDF(html, nomeArquivoExames(params.paciente, params.dataSolicitacao))}
            className="w-full flex items-center justify-center gap-2 bg-[#1A3A2C] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#5BBD9B] transition-colors"
          >
            <Download className="w-4 h-4" /> Baixar PDF para encaminhar
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 py-1">Fechar</button>
        </div>
      </div>
    </div>
  )
}

export default function ExamesListaClient({
  exames,
  paciente,
}: {
  exames: ExameItem[]
  paciente: Paciente
}) {
  const [shareParams, setShareParams] = useState<ExamesHTMLParams | null>(null)
  const [baixandoId, setBaixandoId] = useState<string | null>(null)

  async function baixar(id: string, params: ExamesHTMLParams) {
    setBaixandoId(id)
    try {
      await baixarComoPDF(
        gerarHTMLExames(params, false),
        nomeArquivoExames(params.paciente, params.dataSolicitacao)
      )
    } finally {
      setBaixandoId(null)
    }
  }

  if (exames.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
        <FlaskConical className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-400 font-medium">Nenhuma solicitação de exames</p>
        <p className="text-sm text-gray-300 mt-1">Solicitações de exames emitidas pelo médico aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {exames.map(ex => {
          const medico = ex.medicos
          const params = toParams(ex, paciente)
          const urgencia = ex.urgencia ?? 'normal'
          const isUrgente = urgencia === 'urgente' || urgencia === 'emergencia'
          const listaExames = ex.exames.split('\n').map(l => l.trim()).filter(Boolean)
          const valido = isExameValido(ex.data_solicitacao)
          const dataExp = dataExpiracao(ex.data_solicitacao)

          return (
            <div key={ex.id} className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${
              !valido ? 'border-gray-100' : isUrgente ? 'border-yellow-200' : 'border-gray-100'
            }`}>
              {/* Status banner */}
              <div className={`px-5 py-2.5 flex items-center justify-between ${
                !valido ? 'bg-gray-50' : isUrgente ? 'bg-yellow-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-2">
                  {!valido ? (
                    <>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500">Solicitação encerrada</span>
                      <span className="text-xs text-gray-400">· expirou em {fmtData(dataExp)}</span>
                    </>
                  ) : isUrgente ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCIA_BADGE[urgencia] ?? 'bg-gray-100 text-gray-600'}`}>
                        {URGENCIA_LABEL[urgencia] ?? urgencia}
                      </span>
                      <span className="text-xs text-gray-400">Solicitado em {fmtData(ex.data_solicitacao)}</span>
                    </>
                  ) : (
                    <>
                      <FlaskConical className="w-4 h-4 text-[#5BBD9B]" />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCIA_BADGE[urgencia] ?? 'bg-gray-100 text-gray-600'}`}>
                        {URGENCIA_LABEL[urgencia] ?? urgencia}
                      </span>
                      <span className="text-xs text-gray-400">Solicitado em {fmtData(ex.data_solicitacao)}</span>
                    </>
                  )}
                </div>
                {!valido ? (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="w-3 h-3" /> somente consulta
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">{listaExames.length} exame(s)</span>
                )}
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Lista de exames */}
                    <div className="mb-3">
                      <ul className="space-y-1">
                        {listaExames.map((e, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5BBD9B] shrink-0" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {medico && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        <span className="text-gray-400">Médico: </span>
                        {drTitle(medico.sexo)} {medico.nome}
                        {medico.especialidade && <span className="text-gray-400"> · {medico.especialidade}</span>}
                        {medico.crm && <span className="text-gray-400"> · CRM-{medico.crm_uf ?? 'BR'} {medico.crm}</span>}
                      </p>
                    )}

                    {ex.indicacao_clinica && (
                      <p className="text-xs text-gray-600 mt-3 italic bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                        <span className="font-medium not-italic text-gray-400">Indicação: </span>
                        {ex.indicacao_clinica}
                      </p>
                    )}

                    {ex.observacoes && (
                      <p className="text-xs text-gray-600 mt-2 italic bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                        <span className="font-medium not-italic text-blue-500">Obs: </span>
                        {ex.observacoes}
                      </p>
                    )}
                  </div>

                  {/* Actions — apenas quando válido */}
                  {valido && params && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => imprimirExames(params)}
                        className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir
                      </button>
                      <button
                        onClick={() => baixar(ex.id, params)}
                        disabled={baixandoId === ex.id}
                        className="flex items-center gap-1.5 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-green-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        {baixandoId === ex.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        {baixandoId === ex.id ? 'Gerando…' : 'Baixar PDF'}
                      </button>
                      <button
                        onClick={() => setShareParams(params)}
                        className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Encaminhar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {shareParams && (
        <ExameShareModal
          params={shareParams}
          onClose={() => setShareParams(null)}
        />
      )}
    </>
  )
}
