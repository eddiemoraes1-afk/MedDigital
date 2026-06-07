import { requireAdmin } from '@/lib/auth-sistema'
import AdminHeader from '../components/AdminHeader'
import AuditoriaClient from './AuditoriaClient'
import { ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AuditoriaPage() {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader ativo="auditoria" />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#1A3A2C] rounded-xl">
            <ShieldCheck className="w-5 h-5 text-[#5BBD9B]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A3A2C]">Auditoria de Consentimentos</h1>
            <p className="text-sm text-gray-400">LGPD · Telemedicina · Vídeo/Voz · Autorização de CID</p>
          </div>
        </div>
        <AuditoriaClient />
      </main>
    </div>
  )
}
