import { requireAdmin } from '@/lib/auth-sistema'
import AdminHeader from '../components/AdminHeader'
import AdminDashboardTabs from './AdminDashboardTabs'
import { BarChart2 } from 'lucide-react'

export default async function AdminDashboardPage() {
  await requireAdmin()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AdminHeader ativo="dashboard" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="p-2.5 rounded-xl"
            style={{ background: 'var(--brand)', boxShadow: '0 4px 12px var(--brand-glow)' }}
          >
            <BarChart2 className="w-5 h-5" style={{ color: 'var(--brand-2)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--txt-1)' }}>Dashboard de Analytics</h1>
            <p className="text-sm" style={{ color: 'var(--txt-3)' }}>Faturamento, consultas, médicos, empresas e atestados</p>
          </div>
        </div>

        <AdminDashboardTabs />
      </main>
    </div>
  )
}
