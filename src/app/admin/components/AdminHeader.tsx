import Link from 'next/link'
import { Shield, Building2, Users, Calendar, UserCheck, LogOut, ArrowLeft, BarChart2 } from 'lucide-react'

interface Props {
  ativo?: 'dashboard' | 'empresas' | 'pacientes' | 'agendamentos' | 'medicos'
  /** Título da tela exibido como badge destacado (ex: "Empresa"). Omitir na navegação principal. */
  titulo?: string
  /** Href do botão Voltar. Quando fornecido, exibe o botão em vez da nav completa. */
  backHref?: string
}

export default function AdminHeader({ ativo, titulo, backHref }: Props) {
  const linkBase = 'text-sm flex items-center gap-1.5 transition-colors'
  const linkAtivo = 'text-[#5BBD9B] font-semibold'
  const linkInativo = 'text-green-200 hover:text-white'

  return (
    <header className="bg-[#1A3A2C] text-white px-6 py-3.5 shrink-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">

        {/* Esquerda: voltar + logo + badge */}
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          )}
          <Link href="/admin" className="flex items-center gap-3 shrink-0">
            <img src="/logo-branca.svg" alt="RovarisMed" className="h-9" />
          </Link>
          <div className="h-5 w-px bg-white/20 shrink-0" />
          <span className="text-sm font-bold text-white bg-white/15 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {titulo || 'Admin'}
          </span>
        </div>

        {/* Direita: nav ou logout */}
        {backHref ? (
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Sair</span>
            </button>
          </form>
        ) : (
          <nav className="flex items-center gap-5">
            <Link href="/admin/dashboard" className={`${linkBase} ${ativo === 'dashboard' ? linkAtivo : linkInativo}`}>
              <BarChart2 className="w-4 h-4" /> <span className="hidden md:inline">Dashboard</span>
            </Link>
            <Link href="/admin/empresas" className={`${linkBase} ${ativo === 'empresas' ? linkAtivo : linkInativo}`}>
              <Building2 className="w-4 h-4" /> <span className="hidden md:inline">Empresas</span>
            </Link>
            <Link href="/admin/pacientes" className={`${linkBase} ${ativo === 'pacientes' ? linkAtivo : linkInativo}`}>
              <Users className="w-4 h-4" /> <span className="hidden md:inline">Pacientes</span>
            </Link>
            <Link href="/admin/agendamentos" className={`${linkBase} ${ativo === 'agendamentos' ? linkAtivo : linkInativo}`}>
              <Calendar className="w-4 h-4" /> <span className="hidden md:inline">Agendamentos</span>
            </Link>
            <Link href="/admin/medicos" className={`${linkBase} ${ativo === 'medicos' ? linkAtivo : linkInativo}`}>
              <UserCheck className="w-4 h-4" /> <span className="hidden md:inline">Médicos</span>
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Sair</span>
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  )
}
