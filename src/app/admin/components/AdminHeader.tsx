import Link from 'next/link'
import { Heart, Shield, Building2, Users, Calendar, UserCheck, LogOut } from 'lucide-react'

interface Props {
  ativo?: 'empresas' | 'pacientes' | 'agendamentos' | 'medicos'
}

export default function AdminHeader({ ativo }: Props) {
  const linkBase = 'text-sm flex items-center gap-1.5 transition-colors'
  const linkAtivo = 'text-white font-semibold'
  const linkInativo = 'text-blue-200 hover:text-white'

  return (
    <header className="bg-[#1A3A5C] text-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
          <span className="font-bold text-lg">MedDigital</span>
          <span className="text-xs bg-blue-700 text-blue-100 px-2 py-0.5 rounded-full ml-1 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin
          </span>
        </Link>
        <nav className="flex items-center gap-5">
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
            <button type="submit" className="text-sm text-blue-300 hover:text-white flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
