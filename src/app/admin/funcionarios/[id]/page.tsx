import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Heart, ArrowLeft, Shield, User, Phone, FileText,
  Building2, Calendar, Briefcase, MapPin, CheckCircle2,
  XCircle, Mail, AlertCircle
} from 'lucide-react'

export default async function FichaFuncionarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const adminSupabase = createAdminClient()

  const { data: vinculo } = await adminSupabase
    .from('vinculos_empresa')
    .select('*, empresas(id, nome, cnpj)')
    .eq('id', id)
    .single()

  if (!vinculo) redirect('/admin/empresas')

  // Se já tem paciente_id, redireciona direto para a ficha do paciente
  if (vinculo.paciente_id) {
    redirect(`/admin/pacientes/${vinculo.paciente_id}`)
  }

  const empresa = vinculo.empresas as any

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold text-lg">MedDigital</span>
            <span className="text-xs bg-blue-700 text-blue-100 px-2 py-0.5 rounded-full ml-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </span>
          </div>
          <Link
            href={`/admin/empresas/${empresa?.id}`}
            className="text-sm text-blue-200 hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para a empresa
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Aviso: sem conta na plataforma */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Este funcionário ainda não ativou a conta na plataforma</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Compartilhe o link <strong>med-digital.vercel.app/cadastro</strong> para que ele se cadastre com o CPF cadastrado aqui.
            </p>
          </div>
        </div>

        {/* Cabeçalho do funcionário */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#1A3A5C]">{vinculo.nome_completo}</h1>
              <div className="flex flex-wrap gap-4 mt-2">
                {vinculo.cpf && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    {vinculo.cpf}
                  </span>
                )}
                {vinculo.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {vinculo.email}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${vinculo.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {vinculo.ativo
                    ? <><CheckCircle2 className="w-3 h-3" /> Ativo</>
                    : <><XCircle className="w-3 h-3" /> Inativo</>
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Dados na empresa */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-[#2E75B6]" /> Dados na Empresa
            </h2>
            <div className="space-y-3">
              {vinculo.cargo && (
                <div>
                  <p className="text-xs text-gray-400">Cargo</p>
                  <p className="text-sm text-gray-800 font-medium">{vinculo.cargo}</p>
                </div>
              )}
              {vinculo.departamento && (
                <div>
                  <p className="text-xs text-gray-400">Departamento</p>
                  <p className="text-sm text-gray-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {vinculo.departamento}
                  </p>
                </div>
              )}
              {vinculo.registro_funcional && (
                <div>
                  <p className="text-xs text-gray-400">Registro funcional</p>
                  <p className="text-sm font-mono text-gray-700">{vinculo.registro_funcional}</p>
                </div>
              )}
              {vinculo.data_admissao && (
                <div>
                  <p className="text-xs text-gray-400">Data de admissão</p>
                  <p className="text-sm text-gray-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(vinculo.data_admissao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Empresa */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-purple-500" /> Empresa
            </h2>
            {empresa ? (
              <div className="space-y-2">
                <Link
                  href={`/admin/empresas/${empresa.id}`}
                  className="font-medium text-purple-700 hover:underline text-sm"
                >
                  {empresa.nome}
                </Link>
                {empresa.cnpj && (
                  <p className="text-xs text-gray-400">{empresa.cnpj}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
