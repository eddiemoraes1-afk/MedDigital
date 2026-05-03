import Link from 'next/link'
import { Shield, Building2, Users, Calendar, UserCheck, LogOut } from 'lucide-react'

interface Props {
  ativo?: 'empresas' | 'pacientes' | 'agendamentos' | 'medicos'
}

export default function AdminHeader({ ativo }: Props) {
  const linkBase = 'text-sm flex items-center gap-1.5 transition-colors'
  const linkAtivo = 'text-[#5BBD9B] font-semibold'
  const linkInativo = 'text-gray-500 hover:text-[#5BBD9B]'

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <img src="/logo.svg" alt="RovarisMed" className="h-9" />
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/admin/empresas" className={`${linkBase} ${ativo === 'empresas' ? linkAtivo : linkInativo}`}>
            <Building2 className="w-4 h-4" /> Empresas
          </Link>
          <Link href="/admin/pacientes" className={`${linkBase} ${ativo === 'pacientes' ? linkAtivo : linkInativo}`}>
            <Users className="w-4 h-4" /> Pacientes
          </Link>
          <Link href="/admin/agendamentos" className={`${linkBase} ${ativo === 'agendamentos' ? linkAtivo : linkInativo}`}>
            <Calendar className="w-4 h-4" /> Agendamentos
          </Link>
          <Link href="/admin/medicos" className={`${linkBase} ${ativo === 'medicos' ? linkAtivo : linkInativo}`}>
            <UserCheck className="w-4 h-4" /> Médicos
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1.5 transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
