import Link from 'next/link'
import {
  Shield, Building2, Users, Calendar, UserCheck,
  LogOut, ArrowLeft, BarChart2, Radio, ShieldCheck, ClipboardEdit,
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

interface Props {
  ativo?: 'dashboard' | 'empresas' | 'pacientes' | 'agendamentos' | 'medicos' | 'tempo-real' | 'auditoria' | 'logs-antecedentes'
  titulo?: string
  backHref?: string
}

export default function AdminHeader({ ativo, titulo, backHref }: Props) {
  const linkBase = 'text-sm flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg'
  const linkAtivo = 'text-[#5BBD9B] font-semibold bg-white/10'
  const linkInativo = 'text-green-200/80 hover:text-white hover:bg-white/10'

  return (
    <header
      className="shrink-0 border-b"
      style={{ background: 'var(--header-bg)', color: 'var(--header-txt)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">

        {/* ── Esquerda ── */}
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          )}
          <Link href="/admin" className="flex items-center gap-2 shrink-0 group">
            <img src="/logo-branca.svg" alt="RovarisMed" className="h-8 group-hover:opacity-90 transition-opacity" />
          </Link>
          <div className="h-5 w-px bg-white/15 shrink-0" />
          <span className="text-xs font-semibold text-white/90 bg-white/10 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 border border-white/10">
            <Shield className="w-3 h-3 text-[#5BBD9B]" />
            {titulo || 'Admin'}
          </span>
        </div>

        {/* ── Direita ── */}
        <div className="flex items-center gap-1 shrink-0">
          {backHref ? (
            <>
              <ThemeToggle />
              <form action="/api/auth/signout" method="POST" className="ml-1">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Sair</span>
                </button>
              </form>
            </>
          ) : (
            <nav className="flex items-center gap-0.5">
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
              <Link
                href="/admin/tempo-real"
                className={`${linkBase} relative ${ativo === 'tempo-real' ? linkAtivo : linkInativo}`}
              >
                <Radio className="w-4 h-4" />
                <span className="hidden md:inline">Tempo Real</span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </Link>
              <Link href="/admin/auditoria" className={`${linkBase} ${ativo === 'auditoria' ? linkAtivo : linkInativo}`}>
                <ShieldCheck className="w-4 h-4" /> <span className="hidden md:inline">Auditoria</span>
              </Link>
              <Link href="/admin/logs-antecedentes" className={`${linkBase} ${ativo === 'logs-antecedentes' ? linkAtivo : linkInativo}`}>
                <ClipboardEdit className="w-4 h-4" /> <span className="hidden md:inline">Prontuário</span>
              </Link>

              <div className="w-px h-5 bg-white/15 mx-1.5" />
              <ThemeToggle />

              <form action="/api/auth/signout" method="POST" className="ml-0.5">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Sair</span>
                </button>
              </form>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
