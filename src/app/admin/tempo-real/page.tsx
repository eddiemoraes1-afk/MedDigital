import { requireAdmin } from '@/lib/auth-sistema'
import AdminHeader from '../components/AdminHeader'
import TempoRealClient from './TempoRealClient'
import { Radio } from 'lucide-react'

export default async function TempoRealPage() {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader ativo="tempo-real" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#1A3A2C] rounded-xl">
            <Radio className="w-5 h-5 text-[#5BBD9B]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A3A2C]">Tempo Real</h1>
            <p className="text-sm text-gray-400">Fila virtual, médicos online e consultas em andamento</p>
          </div>
          <div className="ml-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-semibold">Ao vivo · atualiza a cada 10s</span>
          </div>
        </div>

        <TempoRealClient />
      </main>
    </div>
  )
}
