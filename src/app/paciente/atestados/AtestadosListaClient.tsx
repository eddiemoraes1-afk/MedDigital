'use client'

import { useState } from 'react'
import { Printer, Download, Share2, Eye, Lock, CheckCircle2, Clock, FileText } from 'lucide-react'
import { imprimirAtestado, baixarAtestado, type AtestadoHTMLParams } from '@/lib/atestadoHTML'
import AtestadoShareModal from '@/components/AtestadoShareModal'

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

function toParams(at: AtestadoItem, paciente: Paciente): AtestadoHTMLParams | null {
  if (!at.medicos) return null
  return {
    paciente,
    medico: at.medicos,
    dias: at.dias,
    dataInicio: at.data_inicio,
    dataFim: at.data_fim,
    dataEmissao: at.data_emissao,
    cid: at.cid,
    textoComplementar: at.texto_complementar,
    observacoes: at.observacoes,
  }
}

export default function AtestadosListaClient({
  atestados,
  paciente,
}: {
  atestados: AtestadoItem[]
  paciente: Paciente
}) {
  const [shareParams, setShareParams] = useState<AtestadoHTMLParams | null>(null)

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
          const params = toParams(at, paciente)

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
                      <p className="text-xs text-gray-500 mt-1.5">
                        <span className="text-gray-400">Médico: </span>
                        Dr(a). {medico.nome}
                        {medico.especialidade && <span className="text-gray-400"> · {medico.especialidade}</span>}
                        {medico.crm && <span className="text-gray-400"> · CRM-{medico.crm_uf ?? 'BR'} {medico.crm}</span>}
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
                    {valido && params ? (
                      <>
                        <button
                          onClick={() => imprimirAtestado(params)}
                          className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimir
                        </button>
                        <button
                          onClick={() => baixarAtestado(params)}
                          className="flex items-center gap-1.5 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-green-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Baixar
                        </button>
                        <button
                          onClick={() => setShareParams(params)}
                          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Encaminhar
                        </button>
                      </>
                    ) : params ? (
                      <button
                        onClick={() => imprimirAtestado(params)}
                        className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {shareParams && (
        <AtestadoShareModal
          params={shareParams}
          onClose={() => setShareParams(null)}
        />
      )}
    </>
  )
}
