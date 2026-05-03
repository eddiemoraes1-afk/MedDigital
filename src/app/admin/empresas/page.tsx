import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, Building2, ArrowLeft, Shield, Plus, Users, CheckCircle2, XCircle } from 'lucide-react'
import CriarEmpresaForm from './CriarEmpresaForm'

export default async function EmpresasPage() {
  await requireAdmin()
  const adminSupabase = createAdminClient()

  const { data: empresas } = await adminSupabase
    .from('empresas')
    .select(`
      id, nome, cnpj, email_contato, ativo, criado_em,
      vinculos_empresa(count)
    `)
    .order('criado_em', { ascending: false })

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold text-lg">MedDigital</span>
            <span className="text-xs bg-blue-700 text-blue-100 px-2 py-0.5 rounded-full ml-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </span>
          </div>
          <Link href="/admin" className="text-sm text-blue-200 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A3A5C] flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#2E75B6]" /> Empresas
            </h1>
            <p className="text-gray-500 text-sm mt-1">{empresas?.length ?? 0} empresa(s) cadastrada(s)</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Lista de empresas */}
          <div className="md:col-span-2 space-y-3">
            {empresas && empresas.length > 0 ? (
              empresas.map((e: any) => {
                const totalVinculos = e.vinculos_empresa?.[0]?.count ?? 0
                return (
                  <Link
                    key={e.id}
                    href={`/admin/empresas/${e.id}`}
                    className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-[#2E75B6]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A3A5C]">{e.nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{e.cnpj || 'CNPJ não informado'}</p>
                        {e.email_contato && (
                          <p className="text-xs text-gray-400">{e.email_contato}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {totalVinculos}
                        </p>
                        <p className="text-xs text-gray-400">funcionários</p>
                      </div>
                      <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                        e.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {e.ativo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {e.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Nenhuma empresa cadastrada</p>
                <p className="text-sm text-gray-400 mt-1">Use o formulário ao lado para adicionar a primeira empresa.</p>
              </div>
            )}
          </div>

          {/* Formulário de criação */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-6">
              <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-5">
                <Plus className="w-4 h-4 text-[#2E75B6]" /> Nova empresa
              </h2>
              <CriarEmpresaForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
