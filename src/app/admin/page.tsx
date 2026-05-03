import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Heart, Building2, Users, Activity, LogOut,
  TrendingUp, Calendar, Shield, Clock, CheckCircle2, UserCheck, Stethoscope
} from 'lucide-react'
import BotoesAprovacao from './components/BotoesAprovacao'

export default async function AdminDashboardPage() {
  await requireAdmin()
  const adminSupabase = createAdminClient()

  // Stats
  const [
    { count: totalEmpresas },
    { count: totalFuncionarios },
    { count: totalPacientes },
    { count: totalAgendamentos },
    { count: agendamentosHoje },
  ] = await Promise.all([
    adminSupabase.from('empresas').select('*', { count: 'exact', head: true }),
    adminSupabase.from('vinculos_empresa').select('*', { count: 'exact', head: true }).eq('ativo', true),
    adminSupabase.from('pacientes').select('*', { count: 'exact', head: true }),
    adminSupabase.from('agendamentos').select('*', { count: 'exact', head: true }),
    adminSupabase.from('agendamentos').select('*', { count: 'exact', head: true })
      .gte('data_hora', new Date().toISOString().slice(0, 10))
      .lt('data_hora', new Date(Date.now() + 86400000).toISOString().slice(0, 10)),
  ])

  // Empresas recentes
  const { data: empresasRecentes } = await adminSupabase
    .from('empresas')
    .select('id, nome, cnpj, ativo, criado_em')
    .order('criado_em', { ascending: false })
    .limit(5)

  // Médicos pendentes de aprovação
  const { data: medicosPendentes } = await adminSupabase
    .from('medicos')
    .select('id, nome, especialidade, crm, crm_uf, criado_em')
    .eq('status', 'em_analise')
    .order('criado_em', { ascending: true })

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Header */}
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold text-lg">MedDigital</span>
            <span className="text-xs bg-blue-700 text-blue-100 px-2 py-0.5 rounded-full ml-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </span>
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/admin/empresas" className="text-sm text-blue-200 hover:text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> Empresas
            </Link>
            <Link href="/admin/pacientes" className="text-sm text-blue-200 hover:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Pacientes
            </Link>
            <Link href="/admin/agendamentos" className="text-sm text-blue-200 hover:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Agendamentos
            </Link>
            <Link href="/api/auth/signout" className="text-sm text-blue-300 hover:text-white flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Sair
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A5C]">Painel Administrativo</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral da plataforma MedDigital</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Link href="/admin/empresas" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:border hover:border-[#2E75B6] transition-all">
            <div className="flex items-center justify-between mb-3">
              <Building2 className="w-5 h-5 text-[#2E75B6]" />
              <span className="text-xs text-gray-400">empresas</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalEmpresas ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">cadastradas</p>
          </Link>

          <Link href="/admin/empresas" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:border hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-400">funcionários</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalFuncionarios ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">vínculos ativos</p>
          </Link>

          <Link href="/admin/pacientes" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:border hover:border-green-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-xs text-gray-400">pacientes</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalPacientes ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">na plataforma</p>
          </Link>

          <Link href="/admin/agendamentos" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:border hover:border-orange-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-400">agendamentos</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalAgendamentos ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">total histórico</p>
          </Link>

          <Link href="/admin/agendamentos" className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100 hover:shadow-md hover:border-[#2E75B6] transition-all">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-[#2E75B6]" />
              <span className="text-xs text-gray-400">hoje</span>
            </div>
            <p className="text-3xl font-bold text-[#2E75B6]">{agendamentosHoje ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">consultas hoje</p>
          </Link>
        </div>

        {/* Médicos aguardando aprovação */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Médicos aguardando aprovação
            </h2>
            {medicosPendentes && medicosPendentes.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {medicosPendentes.length} pendente{medicosPendentes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {!medicosPendentes || medicosPendentes.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum médico aguardando aprovação</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {medicosPendentes.map((m: any) => (
                <div key={m.id} className="px-6 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 text-[#2E75B6]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{m.nome}</p>
                      <p className="text-sm text-gray-500">{m.especialidade} · CRM {m.crm}/{m.crm_uf}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Cadastro: {new Date(m.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <BotoesAprovacao medicoId={m.id} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Empresas recentes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2E75B6]" /> Empresas recentes
              </h2>
              <Link href="/admin/empresas" className="text-xs text-[#2E75B6] hover:underline">Ver todas →</Link>
            </div>
            {empresasRecentes && empresasRecentes.length > 0 ? (
              <div className="space-y-2">
                {empresasRecentes.map((e: any) => (
                  <Link
                    key={e.id}
                    href={`/admin/empresas/${e.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.nome}</p>
                      <p className="text-xs text-gray-400">{e.cnpj || 'CNPJ não informado'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma empresa cadastrada</p>
                <Link href="/admin/empresas" className="text-xs text-[#2E75B6] hover:underline mt-1 inline-block">
                  Cadastrar empresa →
                </Link>
              </div>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A5C] mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2E75B6]" /> Ações rápidas
            </h2>
            <div className="space-y-3">
              <Link
                href="/admin/empresas"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-[#2E75B6] hover:bg-blue-50 transition-all"
              >
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#2E75B6]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Gerenciar empresas</p>
                  <p className="text-xs text-gray-400">Cadastrar, editar, importar funcionários</p>
                </div>
              </Link>
              <Link
                href="/admin/agendamentos"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all"
              >
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Agenda médica</p>
                  <p className="text-xs text-gray-400">Ver agendamentos por médico</p>
                </div>
              </Link>
              <Link
                href="/admin/pacientes"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Pacientes</p>
                  <p className="text-xs text-gray-400">Visualizar e filtrar pacientes</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
