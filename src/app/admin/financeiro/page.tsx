import { requireAdmin } from '@/lib/auth-sistema'
import AdminHeader from '@/app/admin/components/AdminHeader'
import FinanceiroClient from './FinanceiroClient'

export const metadata = { title: 'Financeiro | Admin' }

export default async function FinanceiroPage() {
  await requireAdmin()
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <AdminHeader ativo="financeiro" />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6">
        <FinanceiroClient />
      </main>
    </div>
  )
}
