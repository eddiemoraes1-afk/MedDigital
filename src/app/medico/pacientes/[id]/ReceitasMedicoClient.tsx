'use client'

import { useState } from 'react'
import { Printer, Download, Share2, Eye, Pill, Loader2 } from 'lucide-react'
import { imprimirReceita, gerarHTMLReceita, nomeArquivoReceita, type ReceitaHTMLParams } from '@/lib/receitaHTML'
import { baixarComoPDF } from '@/lib/gerarPDF'
import ReceitaShareModal from '@/components/ReceitaShareModal'
import { drTitle } from '@/lib/medico-utils'

interface ReceitaDetalhe {
  id: string
  criado_em: string
  tipo: 'simples' | 'especial' | 'antimicrobiano'
  medicamentos: string
  instrucoes?: string | null
  observacoes?: string | null
  validade?: string | null
  data_emissao: string
  medico_id: string
  medicos: { id: string; nome: string; crm?: string | null; crm_uf?: string | null; especialidade?: string | null; sexo?: string | null } | null
}

interface Paciente {
  nome: string
  cpf?: string | null
  data_nascimento?: string | null
  sexo?: string | null
}

const LABEL_TIPO: Record<string, string> = {
  simples: 'Receita Simples',
  especial: 'Receita Especial',
  antimicrobiano: 'Antimicrobiano (2 vias)',
}

const COR_TIPO: Record<string, string> = {
  simples: 'bg-green-100 text-green-700',
  especial: 'bg-purple-100 text-purple-700',
  antimicrobiano: 'bg-blue-100 text-blue-700',
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toParams(r: ReceitaDetalhe, paciente: Paciente): ReceitaHTMLParams | null {
  if (!r.medicos) return null
  return {
    paciente,
    medico: r.medicos,
    tipo: r.tipo,
    medicamentos: r.medicamentos,
    instrucoes: r.instrucoes ?? '',
    observacoes: r.observacoes,
    validade: r.validade,
    dataEmissao: r.data_emissao,
  }
}

export default function ReceitasMedicoClient({
  receitas,
  paciente,
  medicoId,
}: {
  receitas: ReceitaDetalhe[]
  paciente: Paciente
  medicoId: string
}) {
  const [shareParams, setShareParams] = useState<ReceitaHTMLParams | null>(null)
  const [baixandoId, setBaixandoId] = useState<string | null>(null)

  async function baixar(id: string, params: ReceitaHTMLParams) {
    setBaixandoId(id)
    try {
      await baixarComoPDF(gerarHTMLReceita(params, false), nomeArquivoReceita(params.paciente, params.dataEmissao))
    } finally {
      setBaixandoId(null)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {receitas.map(r => {
          const ehMinha = r.medico_id === medicoId
          const params = toParams(r, paciente)
          const labelTipo = LABEL_TIPO[r.tipo] ?? 'Receita Simples'
          const corTipo = COR_TIPO[r.tipo] ?? 'bg-gray-100 text-gray-600'

          return (
            <div
              key={r.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${ehMinha ? 'border-[#5BBD9B]' : 'border-gray-100'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${corTipo}`}>
                      {labelTipo}
                    </span>
                    {ehMinha && (
                      <span className="text-xs bg-[#1A3A2C] text-white px-2 py-0.5 rounded-full font-medium">
                        Emitida por você
                      </span>
                    )}
                  </div>

                  {/* Medicamentos */}
                  <div className="bg-gray-50 rounded-xl px-3 py-2 mb-2">
                    {r.medicamentos.split('\n').filter(Boolean).map((m, i) => (
                      <p key={i} className="text-xs text-gray-700 font-mono leading-relaxed">
                        <span className="text-[#5BBD9B] font-bold mr-1">℞</span>{m}
                      </p>
                    ))}
                  </div>

                  {r.instrucoes && (
                    <p className="text-xs text-gray-500 italic mb-1">"{r.instrucoes}"</p>
                  )}

                  {/* Médico (se não for o próprio) */}
                  {r.medicos && !ehMinha && (
                    <p className="text-xs text-gray-500 mt-1">
                      Médico: {drTitle(r.medicos.sexo)} {r.medicos.nome}
                      {r.medicos.crm && <span className="text-gray-400"> · CRM-{r.medicos.crm_uf ?? 'BR'} {r.medicos.crm}</span>}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">Emitida em {fmtData(r.data_emissao)}</p>
                  {r.validade && (
                    <p className="text-xs text-gray-400">Válida até {fmtData(r.validade)}</p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {ehMinha && params ? (
                    <>
                      <button
                        onClick={() => imprimirReceita(params)}
                        className="flex items-center gap-1 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Printer className="w-3 h-3" /> Imprimir
                      </button>
                      <button
                        onClick={() => baixar(r.id, params)}
                        disabled={baixandoId === r.id}
                        className="flex items-center gap-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                      >
                        {baixandoId === r.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Download className="w-3 h-3" />}
                        {baixandoId === r.id ? '…' : 'Baixar'}
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
                      onClick={() => imprimirReceita(params)}
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
        <ReceitaShareModal
          params={shareParams}
          onClose={() => setShareParams(null)}
        />
      )}
    </>
  )
}
