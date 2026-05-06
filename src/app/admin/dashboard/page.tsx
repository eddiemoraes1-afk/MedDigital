import { requireAdmin } from '@/lib/auth-sistema'
import AdminHeader from '../components/AdminHeader'
import DashboardClient from './DashboardClient'
import { BarChart2 } from 'lucide-react'

export default async function AdminDashboardPage() {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader ativo="dashboard" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#1A3A2C] rounded-xl">
            <BarChart2 className="w-5 h-5 text-[#5BBD9B]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A3A2C]">Dashboard de Analytics</h1>
            <p className="text-sm text-gray-400">Faturamento, consultas, médicos e empresas</p>
          </div>
        </div>

        <DashboardClient />
      </main>
    </div>
  )
}
