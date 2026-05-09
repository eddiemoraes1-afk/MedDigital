'use client'

import { useState } from 'react'
import { Printer, Download, Share2, Eye } from 'lucide-react'
import { imprimirAtestado, baixarAtestado, type AtestadoHTMLParams } from '@/lib/atestadoHTML'
import AtestadoShareModal from '@/components/AtestadoShareModal'

interface AtestadoDetalhe {
  id: string
  data_emissao: string
  data_inicio: string
  data_fim: string
  dias: number
  cid?: string | null
  texto_complementar?: string | null
  medico_id: string
  medicos: { nome: string; crm?: string | null; crm_uf?: string | null; especialidade?: string | null } | null
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

function toParams(at: AtestadoDetalhe, paciente: Paciente): AtestadoHTMLParams | null {
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
  }
}

export default function AtestadosMedicoClient({
  atestados,
  paciente,
  medicoId,
}: {
  atestados: AtestadoDetalhe[]
  paciente: Paciente
  medicoId: string
}) {
  const [shareParams, setShareParams] = useState<AtestadoHTMLParams | null>(null)

  return (
    <>
      <div className="space-y-3">
        {atestados.map(at => {
          const ehMeu = at.medico_id === medicoId
          const params = toParams(at, paciente)

          return (
            <div key={at.id} className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${ehMeu ? 'border-[#5BBD9B]' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ehMeu ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {at.dias} dia{at.dias !== 1 ? 's' : ''}
                    </span>
                    {at.cid && (
                      <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                        CID: {at.cid}
                      </span>
                    )}
                    {ehMeu && (
                      <span className="text-xs bg-[#1A3A2C] text-white px-2 py-0.5 rounded-full font-medium">
                        Emitido por você
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  <p className="text-xs text-gray-600">
                    <span className="text-gray-400">Período: </span>
                    <strong>{fmtData(at.data_inicio)}</strong>
                    <span className="text-gray-400"> até </span>
                    <strong>{fmtData(at.data_fim)}</strong>
                  </p>

                  {/* Doctor (apenas se não for o próprio médico) */}
                  {at.medicos && !ehMeu && (
                    <p className="text-xs text-gray-500 mt-1">
                      Médico: Dr(a). {at.medicos.nome}
                      {at.medicos.crm && <span className="text-gray-400"> · CRM-{at.medicos.crm_uf ?? 'BR'} {at.medicos.crm}</span>}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">Emitido em {fmtData(at.data_emissao)}</p>

                  {at.texto_complementar && (
                    <p className="text-xs text-gray-500 mt-2 italic">"{at.texto_complementar}"</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {ehMeu && params ? (
                    <>
                      <button
                        onClick={() => imprimirAtestado(params)}
                        className="flex items-center gap-1 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Printer className="w-3 h-3" /> Imprimir
                      </button>
                      <button
                        onClick={() => baixarAtestado(params)}
                        className="flex items-center gap-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Download className="w-3 h-3" /> Baixar
                      </button>
                      <button
                        onClick={() => setShareParams(params)}
                        className="flex items-center gap-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Share2 className="w-3 h-3" /> Encaminhar
                      </button>
                    </>
                  ) : params ? (
                    <button
                      onClick={() => imprimirAtestado(params)}
                      className="flex items-center gap-1 border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3 h-3" /> Ver
                    </button>
                  ) : null}
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
