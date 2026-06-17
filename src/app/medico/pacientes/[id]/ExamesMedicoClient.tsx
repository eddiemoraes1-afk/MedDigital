'use client'

import { useState } from 'react'
import { Printer, Download, Share2, Eye, Loader2, Calendar } from 'lucide-react'
import {
  imprimirExames,
  gerarHTMLExames,
  nomeArquivoExames,
  type ExamesHTMLParams,
} from '@/lib/examesHTML'
import { baixarComoPDF } from '@/lib/gerarPDF'
import ExamesShareModal from '@/components/ExamesShareModal'
import { drTitle } from '@/lib/medico-utils'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ExameDetalhe {
  id: string
  criado_em: string
  exames: string[]
  urgencia?: string | null
  observacoes?: string | null
  atendimento_id?: string | null
  medico_id: string
  medicos?: {
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDH(iso: string) {
  const s = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const d = new Date(s)
  if (isNaN(d.getTime())) return { data: '—', hora: '—' }
  return {
    data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
  }
}

function toParams(ex: ExameDetalhe, paciente: Paciente): ExamesHTMLParams | null {
  if (!ex.medicos) return null
  return {
    paciente,
    medico:          ex.medicos,
    exames:          (ex.exames ?? []).join('\n'),
    observacoes:     ex.observacoes,
    urgencia:        ex.urgencia,
    dataSolicitacao: ex.criado_em.split('T')[0],
  }
}

const URGENCIA_COR: Record<string, string> = {
  normal:    'bg-green-100 text-green-700',
  urgente:   'bg-red-100 text-red-700',
  emergencia: 'bg-orange-100 text-orange-700',
}
const URGENCIA_LABEL: Record<string, string> = {
  normal: 'Normal', urgente: 'Urgente', emergencia: 'Emergência',
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function ExamesMedicoClient({
  exames,
  paciente,
  medicoId,
}: {
  exames: ExameDetalhe[]
  paciente: Paciente
  medicoId: string
}) {
  const [shareParams, setShareParams] = useState<ExamesHTMLParams | null>(null)
  const [baixandoId,  setBaixandoId]  = useState<string | null>(null)

  async function baixar(id: string, params: ExamesHTMLParams) {
    setBaixandoId(id)
    try {
      await baixarComoPDF(
        gerarHTMLExames(params, false),
        nomeArquivoExames(params.paciente, params.dataSolicitacao),
      )
    } finally {
      setBaixandoId(null)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {exames.map(ex => {
          const ehMeu  = ex.medico_id === medicoId
          const params = toParams(ex, paciente)
          const { data, hora } = fmtDH(ex.criado_em)
          const lista  = Array.isArray(ex.exames) ? ex.exames : []

          return (
            <div
              key={ex.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${ehMeu ? 'border-[#5BBD9B]' : 'border-gray-100'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">

                  {/* Badges topo */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {ex.urgencia && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${URGENCIA_COR[ex.urgencia] ?? 'bg-gray-100 text-gray-600'}`}>
                        {URGENCIA_LABEL[ex.urgencia] ?? ex.urgencia}
                      </span>
                    )}
                    {ehMeu && (
                      <span className="text-xs bg-[#1A3A2C] text-white px-2 py-0.5 rounded-full font-medium">
                        Solicitado por você
                      </span>
                    )}
                  </div>

                  {/* Data */}
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {data} às {hora}
                  </p>

                  {/* Lista de exames */}
                  {lista.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {lista.map((e: string) => (
                        <span
                          key={e}
                          className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Médico (se não for o solicitante) */}
                  {ex.medicos && !ehMeu && (
                    <p className="text-xs text-gray-500 mt-1">
                      Médico: {drTitle(ex.medicos.sexo)} {ex.medicos.nome}
                      {ex.medicos.crm && (
                        <span className="text-gray-400"> · CRM-{ex.medicos.crm_uf ?? 'BR'} {ex.medicos.crm}</span>
                      )}
                    </p>
                  )}

                  {ex.observacoes && (
                    <p className="text-xs text-gray-400 mt-1 italic">"{ex.observacoes}"</p>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {ehMeu && params ? (
                    <>
                      <button
                        onClick={() => imprimirExames(params)}
                        className="flex items-center gap-1 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Printer className="w-3 h-3" /> Imprimir
                      </button>
                      <button
                        onClick={() => baixar(ex.id, params)}
                        disabled={baixandoId === ex.id}
                        className="flex items-center gap-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                      >
                        {baixandoId === ex.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Download className="w-3 h-3" />}
                        {baixandoId === ex.id ? '…' : 'Baixar'}
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
                      onClick={() => imprimirExames(params)}
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
        <ExamesShareModal
          params={shareParams}
          onClose={() => setShareParams(null)}
        />
      )}
    </>
  )
}
