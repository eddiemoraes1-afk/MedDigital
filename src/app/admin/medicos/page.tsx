import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Heart, Shield, ArrowLeft, Stethoscope, CheckCircle2,
  XCircle, Clock, Users, Calendar, LogOut, Building2
} from 'lucide-react'
import BotoesAprovacao from '../components/BotoesAprovacao'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminMedicosPage({ searchParams }: Props) {
  await requireAdmin()
  const { status } = await searchParams
  const adminSupabase = createAdminClient()

  const { data: todosMedicos } = await adminSupabase
    .from('medicos')
    .select('id, nome, especialidade, crm, crm_uf, status, criado_em, usuario_id')
    .order('criado_em', { ascending: false })

  const total = todosMedicos?.length ?? 0
  const aprovados = todosMedicos?.filter(m => m.status === 'aprovado').length ?? 0
  const pendentes = todosMedicos?.filter(m => m.status === 'em_analise').length ?? 0
  const reprovados = todosMedicos?.filter(m => m.status === 'reprovado').length ?? 0

  const medicos = (todosMedicos ?? []).filter(m => {
    if (!status || status === 'todos') return true
    return m.status === status
  })

  function statusConfig(s: string) {
    if (s === 'aprovado') return { label: 'Aprovado', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
    if (s === 'reprovado') return { label: 'Reprovado', cls: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> }
    return { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> }
  }

  const filtros = [
    { valor: 'todos', label: 'Todos', count: total },
    { valor: 'em_analise', label: 'Aguardando', count: pendentes },
    { valor: 'aprovado', label: 'Aprovados', count: aprovados },
    { valor: 'reprovado', label: 'Reprovados', count: reprovados },
  ]

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
            <Link href="/admin/medicos" className="text-sm text-white font-semibold flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4" /> Médicos
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="text-sm text-blue-300 hover:text-white flex items-center gap-1.5">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-[#2E75B6] flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Painel
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-[#1A3A5C] flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#2E75B6]" /> Médicos
          </h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-[#1A3A5C]">{total}</p>
            <p className="text-xs text-gray-500 mt-1">cadastrados</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-green-600">{aprovados}</p>
            <p className="text-xs text-gray-500 mt-1">aprovados</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-amber-500">{pendentes}</p>
            <p className="text-xs text-gray-500 mt-1">aguardando aprovação</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-red-500">{reprovados}</p>
            <p className="text-xs text-gray-500 mt-1">reprovados</p>
          </div>
        </div>

        {/* Filtros por status */}
        <div className="flex gap-2 mb-4">
          {filtros.map(f => {
            const ativo = (!status && f.valor === 'todos') || status === f.valor
            return (
              <Link
                key={f.valor}
                href={f.valor === 'todos' ? '/admin/medicos' : `/admin/medicos?status=${f.valor}`}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  ativo
                    ? 'bg-[#1A3A5C] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                }`}
              >
                {f.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${ativo ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {f.count}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {medicos.length === 0 ? (
            <div className="py-16 text-center">
              <Stethoscope className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Nenhum médico encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left">Médico</th>
                    <th className="px-6 py-3 text-left">Especialidade</th>
                    <th className="px-6 py-3 text-left">CRM</th>
                    <th className="px-6 py-3 text-left">Cadastro</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {medicos.map(m => {
                    const sc = statusConfig(m.status)
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                              <Stethoscope className="w-4 h-4 text-[#2E75B6]" />
                            </div>
                            <p className="font-medium text-gray-800">{m.nome}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{m.especialidade || '—'}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          {m.crm ? `${m.crm} / ${m.crm_uf}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {new Date(m.criado_em).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${sc.cls}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {m.status === 'em_analise' ? (
                            <BotoesAprovacao medicoId={m.id} />
                          ) : m.status === 'aprovado' ? (
                            <BotoesAprovacao medicoId={m.id} modoReprovacao />
                          ) : (
                            <BotoesAprovacao medicoId={m.id} modoAprovacao />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
