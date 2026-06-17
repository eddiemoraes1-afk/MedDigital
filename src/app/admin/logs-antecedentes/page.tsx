import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import AdminHeader from '@/app/admin/components/AdminHeader'
import LogsAntecedentesClient from './LogsAntecedentesClient'

export default async function LogsAntecedentesPage() {
  await requireAdmin()

  const admin = createAdminClient()

  // Carregar logs iniciais (últimos 30 dias)
  const tsInicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs } = await admin
    .from('logs_antecedentes')
    .select(`
      id, criado_em, campos_alterados, ip_address,
      medicos(id, nome, crm, crm_uf, sexo),
      pacientes(id, nome, cpf)
    `)
    .gte('criado_em', tsInicio)
    .order('criado_em', { ascending: false })
    .limit(500)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <AdminHeader ativo="logs-antecedentes" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A3A2C]">Auditoria — Edições de Antecedentes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Histórico completo de quem editou antecedentes pessoais, quando, qual IP e o que foi alterado.
          </p>
        </div>
        <LogsAntecedentesClient logsIniciais={(logs ?? []) as any} />
      </main>
    </div>
  )
}
