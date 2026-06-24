'use client'

/**
 * Wrapper Client Component que importa os 3 componentes de documentos com
 * ssr:false, evitando qualquer erro de SSR (RangeError, TypeError etc.)
 * que ocorreria ao renderizar dados nulos do banco no servidor.
 *
 * Em Server Components, next/dynamic({ ssr: false }) NÃO funciona.
 * A solução é envolver em um Client Component que usa dynamic normalmente.
 */

import dynamic from 'next/dynamic'
import { Pill, FileText, FlaskConical } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ReceitaDetalhe {
  id: string
  criado_em: string
  tipo: 'simples' | 'especial' | 'antimicrobiano' | string
  medicamentos: string | null
  instrucoes?: string | null
  observacoes?: string | null
  validade?: string | null
  data_emissao: string | null
  medico_id: string
  medicos: { id: string; nome: string; crm?: string | null; crm_uf?: string | null; especialidade?: string | null; sexo?: string | null } | null
}

interface AtestadoDetalhe {
  id: string
  data_emissao: string | null
  data_inicio: string | null
  data_fim: string | null
  dias: number | null
  cid?: string | null
  texto_complementar?: string | null
  medico_id: string
  medicos: { nome: string; crm?: string | null; crm_uf?: string | null; especialidade?: string | null; sexo?: string | null } | null
}

interface ExameDetalhe {
  id: string
  criado_em: string
  exames: string[] | string | null
  urgencia?: string | null
  observacoes?: string | null
  atendimento_id?: string | null
  medico_id: string
  medicos?: { nome: string; crm?: string | null; crm_uf?: string | null; especialidade?: string | null; sexo?: string | null } | null
}

interface Paciente {
  nome: string
  cpf?: string | null
  data_nascimento?: string | null
  sexo?: string | null
}

interface Props {
  receitas: ReceitaDetalhe[]
  atestados: AtestadoDetalhe[]
  exames: ExameDetalhe[]
  paciente: Paciente
  medicoId: string
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map(i => (
        <div key={i} className="bg-gray-100 animate-pulse rounded-2xl h-20" />
      ))}
    </div>
  )
}

// ── Imports dinâmicos — renderizados só no browser ────────────────────────────

const ReceitasMedicoClient  = dynamic(() => import('./ReceitasMedicoClient'),  { ssr: false, loading: () => <Skeleton /> })
const AtestadosMedicoClient = dynamic(() => import('./AtestadosMedicoClient'), { ssr: false, loading: () => <Skeleton /> })
const ExamesMedicoClient    = dynamic(() => import('./ExamesMedicoClient'),    { ssr: false, loading: () => <Skeleton /> })

// ── Componente principal ──────────────────────────────────────────────────────

export default function DocumentosClientOnly({ receitas, atestados, exames, paciente, medicoId }: Props) {
  return (
    <div className="space-y-8">

      {/* Receitas */}
      <div>
        <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2 mb-4">
          <Pill className="w-5 h-5 text-[#5BBD9B]" /> Receitas Médicas
          <span className="text-sm text-gray-400 font-normal">({receitas.length})</span>
        </h2>
        {receitas.length > 0 ? (
          <ReceitasMedicoClient
            receitas={receitas as any}
            paciente={paciente}
            medicoId={medicoId}
          />
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <Pill className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhuma receita emitida</p>
          </div>
        )}
      </div>

      {/* Atestados */}
      <div>
        <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#5BBD9B]" /> Atestados Médicos
          <span className="text-sm text-gray-400 font-normal">({atestados.length})</span>
        </h2>
        {atestados.length > 0 ? (
          <AtestadosMedicoClient
            atestados={atestados as any}
            paciente={paciente}
            medicoId={medicoId}
          />
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum atestado emitido</p>
          </div>
        )}
      </div>

      {/* Exames */}
      <div>
        <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2 mb-4">
          <FlaskConical className="w-5 h-5 text-[#5BBD9B]" /> Solicitações de Exames
          <span className="text-sm text-gray-400 font-normal">({exames.length})</span>
        </h2>
        {exames.length > 0 ? (
          <ExamesMedicoClient
            exames={exames as any}
            paciente={paciente}
            medicoId={medicoId}
          />
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <FlaskConical className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum exame solicitado</p>
          </div>
        )}
      </div>

    </div>
  )
}
