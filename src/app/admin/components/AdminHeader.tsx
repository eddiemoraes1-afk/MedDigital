import Link from 'next/link'
import {
  Shield, Building2, Users, Calendar, UserCheck,
  LogOut, ArrowLeft, BarChart2, Radio, ShieldCheck, ClipboardEdit, Wallet,
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

interface Props {
  ativo?: 'dashboard' | 'empresas' | 'pacientes' | 'agendamentos' | 'medicos' | 'tempo-real' | 'auditoria' | 'logs-antecedentes' | 'financeiro'
  titulo?: string
  backHref?: string
}

export default function AdminHeader({ ativo, titulo, backHref }: Props) {
  const linkBase = 'flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap'
  const linkAtivo  = 'text-[#5BBD9B] bg-white/10'
  const linkInativo = 'text-white/70 hover:text-white hover:bg-white/10'

  return (
    <header
      className="shrink-0 border-b"
      style={{ background: 'var(--header-bg)', color: 'var(--header-txt)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="px-4 py-2 flex items-center gap-3">

        {/* ── Logo ── */}
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Voltar</span>
          </Link>
        ) : null}

        <Link href="/admin" className="shrink-0 group">
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-7 group-hover:opacity-90 transition-opacity" />
        </Link>

        <div className="w-px h-5 bg-white/15 shrink-0" />

        {backHref ? (
          /* Modo detalhe: mostra só o título e ações */
          <>
            <span className="text-sm font-semibold text-white/90 truncate flex-1">
              {titulo || 'Admin'}
            </span>
            <ThemeToggle />
            <form action="/api/auth/signout" method="POST">
              <button type="submit"
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-all">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </>
        ) : (
          /* Modo nav principal */
          <>
            {/* Nav — ocupa todo o espaço disponível */}
            <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide min-w-0">
              <Link href="/admin/dashboard" className={`${linkBase} ${ativo === 'dashboard' ? linkAtivo : linkInativo}`}>
                <BarChart2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Dashboard</span>
              </Link>
              <Link href="/admin/empresas" className={`${linkBase} ${ativo === 'empresas' ? linkAtivo : linkInativo}`}>
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Empresas</span>
              </Link>
              <Link href="/admin/pacientes" className={`${linkBase} ${ativo === 'pacientes' ? linkAtivo : linkInativo}`}>
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Pacientes</span>
              </Link>
              <Link href="/admin/agendamentos" className={`${linkBase} ${ativo === 'agendamentos' ? linkAtivo : linkInativo}`}>
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Agendamentos</span>
              </Link>
              <Link href="/admin/medicos" className={`${linkBase} ${ativo === 'medicos' ? linkAtivo : linkInativo}`}>
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Médicos</span>
              </Link>
              <Link href="/admin/tempo-real" className={`${linkBase} relative ${ativo === 'tempo-real' ? linkAtivo : linkInativo}`}>
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Tempo Real</span>
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </Link>
              <Link href="/admin/auditoria" className={`${linkBase} ${ativo === 'auditoria' ? linkAtivo : linkInativo}`}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Auditoria</span>
              </Link>
              <Link href="/admin/logs-antecedentes" className={`${linkBase} ${ativo === 'logs-antecedentes' ? linkAtivo : linkInativo}`}>
                <ClipboardEdit className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Prontuário</span>
              </Link>
              <Link href="/admin/financeiro" className={`${linkBase} ${ativo === 'financeiro' ? linkAtivo : linkInativo}`}>
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Financeiro</span>
              </Link>
            </nav>

            {/* Ações — ficam sempre à direita, sem encostar no nav */}
            <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-white/10">
              <span className="hidden md:flex items-center gap-1 text-xs text-white/50 px-1">
                <Shield className="w-3 h-3 text-[#5BBD9B]" /> Admin
              </span>
              <ThemeToggle />
              <form action="/api/auth/signout" method="POST">
                <button type="submit"
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all">
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
