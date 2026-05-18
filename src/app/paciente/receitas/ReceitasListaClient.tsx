'use client'

import { useState } from 'react'
import { Printer, Download, Share2, Lock, Pill, Loader2 } from 'lucide-react'
import { imprimirReceita, gerarHTMLReceita, nomeArquivoReceita, type ReceitaHTMLParams } from '@/lib/receitaHTML'
import { baixarComoPDF } from '@/lib/gerarPDF'
import ReceitaShareModal from '@/components/ReceitaShareModal'
import { drTitle } from '@/lib/medico-utils'

interface ReceitaItem {
  id: string
  criado_em: string
  tipo: 'simples' | 'especial' | 'antimicrobiano'
  medicamentos: string
  instrucoes?: string | null
  observacoes?: string | null
  validade?: string | null
  data_emissao: string
  valida: boolean   // calculado server-side
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

const LABEL_TIPO: Record<string, string> = {
  simples: 'Receita Simples',
  especial: 'Receita Especial',
  antimicrobiano: 'Antimicrobiano (2 vias)',
}

const COR_TIPO_VALIDA: Record<string, string> = {
  simples: 'bg-green-100 text-green-700 border-green-200',
  especial: 'bg-purple-100 text-purple-700 border-purple-200',
  antimicrobiano: 'bg-blue-100 text-blue-700 border-blue-200',
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toParams(r: ReceitaItem, paciente: Paciente): ReceitaHTMLParams | null {
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

export default function ReceitasListaClient({
  receitas,
  paciente,
}: {
  receitas: ReceitaItem[]
  paciente: Paciente
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

  if (receitas.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
        <Pill className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-400 font-medium">Nenhuma receita emitida</p>
        <p className="text-sm text-gray-300 mt-1">Receitas emitidas pelo médico durante suas consultas aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {receitas.map(r => {
          const params = toParams(r, paciente)
          const labelTipo = LABEL_TIPO[r.tipo] ?? 'Receita Simples'
          const corTipo = r.valida
            ? (COR_TIPO_VALIDA[r.tipo] ?? 'bg-gray-100 text-gray-600 border-gray-200')
            : 'bg-gray-100 text-gray-500 border-gray-200'

          return (
            <div
              key={r.id}
              className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${
                r.valida ? 'border-green-200' : 'border-gray-100'
              }`}
            >
              {/* Status banner */}
              <div className={`px-5 py-2.5 flex items-center justify-between ${r.valida ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  {r.valida ? (
                    <>
                      <Pill className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-bold text-green-700">Receita válida</span>
                      {r.validade && (
                        <span className="text-xs text-green-600">· válida até {fmtData(r.validade)}</span>
                      )}
                      {!r.validade && (
                        <span className="text-xs text-green-600">· sem data de expiração</span>
                      )}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500">Receita expirada</span>
                      {r.validade && (
                        <span className="text-xs text-gray-400">· expirou em {fmtData(r.validade)}</span>
                      )}
                    </>
                  )}
                </div>
                {!r.valida && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="w-3 h-3" /> somente visualização
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Tipo badge */}
                    <div className="mb-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${corTipo}`}>
                        {labelTipo}
                      </span>
                    </div>

                    {/* Medicamentos */}
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
                      {r.medicamentos.split('\n').filter(Boolean).map((m, i) => (
                        <p key={i} className="text-sm text-gray-700 font-mono leading-relaxed">
                          <span className="text-[#5BBD9B] font-bold mr-1.5">℞</span>{m}
                        </p>
                      ))}
                    </div>

                    {/* Instruções */}
                    {r.instrucoes && (
                      <p className="text-xs text-gray-600 mb-2 italic bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                        <span className="font-semibold not-italic text-blue-700">Modo de uso: </span>
                        {r.instrucoes}
                      </p>
                    )}

                    {/* Médico */}
                    {r.medicos && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        <span className="text-gray-400">Médico: </span>
                        {drTitle(r.medicos.sexo)} {r.medicos.nome}
                        {r.medicos.especialidade && <span className="text-gray-400"> · {r.medicos.especialidade}</span>}
                        {r.medicos.crm && <span className="text-gray-400"> · CRM-{r.medicos.crm_uf ?? 'BR'} {r.medicos.crm}</span>}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">Emitida em {fmtData(r.data_emissao)}</p>
                  </div>

                  {/* Ações — apenas quando válida */}
                  {r.valida && params && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => imprimirReceita(params)}
                        className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir
                      </button>
                      <button
                        onClick={() => baixar(r.id, params)}
                        disabled={baixandoId === r.id}
                        className="flex items-center gap-1.5 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-green-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        {baixandoId === r.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        {baixandoId === r.id ? 'Gerando…' : 'Baixar PDF'}
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
        <ReceitaShareModal
          params={shareParams}
          onClose={() => setShareParams(null)}
        />
      )}
    </>
  )
}
