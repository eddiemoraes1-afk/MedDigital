import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Heart, Building2, ArrowLeft, Shield, Users,
  Mail, Phone, CheckCircle2, XCircle, Calendar,
  FileSpreadsheet
} from 'lucide-react'
// CheckCircle2 and XCircle are used in the empresa ativo badge below
import ImportarFuncionarios from './ImportarFuncionarios'
import ToggleEmpresaAtivo from './ToggleEmpresaAtivo'
import BuscaFuncionarios from './BuscaFuncionarios'

export default async function EmpresaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const adminSupabase = createAdminClient()

  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('*')
    .eq('id', id)
    .single()

  if (!empresa) redirect('/admin/empresas')

  // Funcionários vinculados
  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select(`
      id, cpf, nome_completo, email, cargo, departamento,
      registro_funcional, data_admissao, ativo, criado_em,
      paciente_id
    `)
    .eq('empresa_id', id)
    .order('nome_completo', { ascending: true })

  // Usuário do portal (perfil_sistema com role='empresa' ligado a essa empresa)
  const { data: portalUser } = await adminSupabase
    .from('perfis_sistema')
    .select('usuario_id')
    .eq('empresa_id', id)
    .eq('role', 'empresa')
    .single()

  const totalAtivos = vinculos?.filter(v => v.ativo).length ?? 0
  const totalInativos = vinculos?.filter(v => !v.ativo).length ?? 0

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
          <Link href="/admin/empresas" className="text-sm text-blue-200 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Empresas
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Cabeçalho da empresa */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-[#2E75B6]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1A3A5C]">{empresa.nome}</h1>
                <div className="flex flex-wrap gap-4 mt-2">
                  {empresa.cnpj && (
                    <span className="text-sm text-gray-500">CNPJ: {empresa.cnpj}</span>
                  )}
                  {empresa.email_contato && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Mail className="w-3.5 h-3.5" /> {empresa.email_contato}
                    </span>
                  )}
                  {empresa.telefone_contato && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" /> {empresa.telefone_contato}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#1A3A5C]">{totalAtivos}</p>
                    <p className="text-xs text-gray-400">ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{totalInativos}</p>
                    <p className="text-xs text-gray-400">inativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-700">{vinculos?.length ?? 0}</p>
                    <p className="text-xs text-gray-400">total</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${empresa.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {empresa.ativo ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {empresa.ativo ? 'Ativa' : 'Inativa'}
              </span>
              <ToggleEmpresaAtivo empresaId={empresa.id} ativo={empresa.ativo} />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Tabela de funcionários */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#2E75B6]" /> Funcionários
                </h2>
              </div>
              {vinculos && vinculos.length > 0 ? (
                <BuscaFuncionarios vinculos={vinculos} />
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Nenhum funcionário importado</p>
                  <p className="text-sm text-gray-400 mt-1">Use o painel ao lado para importar a lista.</p>
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral: importar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-4">
                <FileSpreadsheet className="w-4 h-4 text-[#2E75B6]" /> Importar funcionários
              </h2>
              <ImportarFuncionarios empresaId={empresa.id} />
            </div>

            {/* Info do portal */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-purple-500" /> Portal RH
              </h2>
              <p className="text-xs text-gray-500">
                O acesso ao portal desta empresa foi criado no momento do cadastro. O RH pode acessar em <span className="font-mono">/empresa/dashboard</span>.
              </p>
              {portalUser && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Usuário de portal ativo
                </p>
              )}
            </div>

            {/* Criado em */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Empresa criada em {new Date(empresa.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
