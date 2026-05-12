import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Pill } from 'lucide-react'
import PacienteHeader from '../PacienteHeader'
import ReceitasListaClient from './ReceitasListaClient'

export default async function PacienteReceitasPage() {
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

  const { data: receitas } = await admin
    .from('receitas')
    .select('id, criado_em, tipo, medicamentos, instrucoes, observacoes, validade, data_emissao, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', paciente.id)
    .order('criado_em', { ascending: false })

  const hoje = new Date().toISOString().slice(0, 10)

  // valida = sem validade definida (sempre válida) OU dentro do prazo
  const receitasComStatus = (receitas ?? []).map((r: any) => ({
    ...r,
    valida: !r.validade || r.validade >= hoje,
  }))

  const totalValidas = receitasComStatus.filter((r: any) => r.valida).length

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
              <Pill className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A3A2C]">Minhas Receitas</h1>
              <p className="text-sm text-gray-400">
                {receitasComStatus.length} receita{receitasComStatus.length !== 1 ? 's' : ''}
                {totalValidas > 0 && (
                  <span className="ml-2 text-green-600 font-medium">
                    · {totalValidas} válida{totalValidas !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Legenda */}
        {receitasComStatus.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-xs text-blue-700">
            <strong>Receitas válidas</strong> (dentro da validade ou sem data de expiração) permitem imprimir, baixar e encaminhar.{' '}
            <strong>Receitas expiradas</strong> ficam disponíveis apenas para visualização.
          </div>
        )}

        <ReceitasListaClient
          receitas={receitasComStatus as any}
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
