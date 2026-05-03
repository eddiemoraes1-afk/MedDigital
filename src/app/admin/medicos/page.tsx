import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Stethoscope, CheckCircle2, Clock, XCircle } from 'lucide-react'
import AdminHeader from '../components/AdminHeader'
import FiltraMedicos from './FiltraMedicos'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminMedicosPage({ searchParams }: Props) {
  await requireAdmin()
  const { status } = await searchParams
  const adminSupabase = createAdminClient()

  const { data: todosMedicos } = await adminSupabase
    .from('medicos')
    .select('id, nome, especialidade, crm, crm_uf, status, criado_em, usuario_id, ativo')
    .order('criado_em', { ascending: false })

  const total = todosMedicos?.length ?? 0
  const aprovados = todosMedicos?.filter(m => m.status === 'aprovado').length ?? 0
  const pendentes = todosMedicos?.filter(m => m.status === 'em_analise').length ?? 0
  const reprovados = todosMedicos?.filter(m => m.status === 'reprovado').length ?? 0

  // Filtro por status (server-side via URL)
  const medicosFiltrados = (todosMedicos ?? []).filter(m => {
    if (!status || status === 'todos') return true
    return m.status === status
  })

  const filtros = [
    { valor: 'todos', label: 'Todos', count: total },
    { valor: 'em_analise', label: 'Aguardando', count: pendentes },
    { valor: 'aprovado', label: 'Aprovados', count: aprovados },
    { valor: 'reprovado', label: 'Reprovados', count: reprovados },
  ]

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader ativo="medicos" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-[#1A3A2C] flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#5BBD9B]" /> Médicos
          </h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-[#1A3A2C]">{total}</p>
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
                    ? 'bg-[#1A3A2C] text-white'
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

        {/* Filtros de texto + tabela (client component) */}
        <FiltraMedicos medicos={medicosFiltrados} />
      </main>
    </div>
  )
}
