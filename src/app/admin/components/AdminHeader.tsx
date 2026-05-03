import Link from 'next/link'
import { Shield, Building2, Users, Calendar, UserCheck, LogOut } from 'lucide-react'

interface Props {
  ativo?: 'empresas' | 'pacientes' | 'agendamentos' | 'medicos'
}

export default function AdminHeader({ ativo }: Props) {
  const linkBase = 'text-sm flex items-center gap-1.5 transition-colors'
  const linkAtivo = 'text-[#5BBD9B] font-semibold'
  const linkInativo = 'text-green-200 hover:text-white'

  return (
    <header className="bg-[#1A3A2C] text-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
          <span className="text-xs text-green-300 ml-1 flex items-center gap-1">
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
            <button type="submit" className="text-sm text-green-300 hover:text-white flex items-center gap-1.5 transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
