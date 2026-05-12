import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import PacienteHeader from '../PacienteHeader'
import ExamesListaClient from './ExamesListaClient'

export default async function PacienteExamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome, cpf, data_nascimento, sexo')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) redirect('/paciente/dashboard')

  const { data: exames } = await admin
    .from('solicitacoes_exames')
    .select('id, data_solicitacao, exames, indicacao_clinica, observacoes, urgencia, status, medicos(nome, crm, crm_uf, especialidade)')
    .eq('paciente_id', paciente.id)
    .order('data_solicitacao', { ascending: false })

  const totalUrgentes = (exames ?? []).filter(
    (e: any) => e.urgencia === 'urgente' || e.urgencia === 'emergencia'
  ).length

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <PacienteHeader />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/paciente/dashboard"
            className="p-2 rounded-xl hover:bg-white transition-colors text-gray-400 hover:text-[#1A3A2C]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1A3A2C] rounded-xl">
              <FlaskConical className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A3A2C]">Meus Exames</h1>
              <p className="text-sm text-gray-400">
                {(exames ?? []).length} solicitação(ões)
                {totalUrgentes > 0 && (
                  <span className="ml-2 text-yellow-600 font-medium">
                    · {totalUrgentes} urgente{totalUrgentes !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Info */}
        {(exames ?? []).length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-xs text-blue-700">
            Imprima, baixe ou encaminhe suas solicitações de exames diretamente daqui.
            Leve o documento impresso ou em PDF ao laboratório ou clínica.
          </div>
        )}

        <ExamesListaClient
          exames={(exames ?? []) as any}
          paciente={{
            nome: paciente.nome,
            cpf: paciente.cpf,
            data_nascimento: paciente.data_nascimento,
            sexo: paciente.sexo,
          }}
        />
      </main>
    </div>
  )
}
