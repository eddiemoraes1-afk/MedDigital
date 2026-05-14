import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import PacienteHeader from '../PacienteHeader'
import AtestadosListaClient from './AtestadosListaClient'

export default async function PacienteAtestadosPage() {
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

  const { data: atestados } = await admin
    .from('atestados')
    .select('id, data_emissao, data_inicio, data_fim, dias, cid, texto_complementar, observacoes, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', paciente.id)
    .order('data_emissao', { ascending: false })

  const hoje = new Date().toISOString().slice(0, 10)

  const atestadosComStatus = (atestados ?? []).map((a: any) => ({
    ...a,
    valido: a.data_inicio <= hoje && hoje <= a.data_fim }))

  const totalValidos = atestadosComStatus.filter((a: any) => a.valido).length

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <PacienteHeader titulo="Meus Atestados" backHref="/paciente/dashboard" />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1A3A2C] rounded-xl">
              <FileText className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A3A2C]">Meus Atestados</h1>
              <p className="text-sm text-gray-400">
                {atestadosComStatus.length} atestado{atestadosComStatus.length !== 1 ? 's' : ''}
                {totalValidos > 0 && (
                  <span className="ml-2 text-green-600 font-medium">· {totalValidos} válido{totalValidos !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Legenda */}
        {atestadosComStatus.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-xs text-blue-700">
            <strong>Atestados válidos</strong> (dentro do período de afastamento) permitem imprimir, baixar e encaminhar.
            <strong className="ml-1">Atestados encerrados</strong> ficam disponíveis apenas para visualização.
          </div>
        )}

        <AtestadosListaClient
          atestados={atestadosComStatus as any}
          paciente={{
            nome: paciente.nome,
            cpf: paciente.cpf,
            data_nascimento: paciente.data_nascimento,
            sexo: paciente.sexo }}
        />
      </main>
    </div>
  )
}
