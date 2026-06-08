'use client'

import Link from 'next/link'
import { ArrowLeft, LogOut, LayoutDashboard, BarChart2, User2 } from 'lucide-react'
import { drTitle } from '@/lib/medico-utils'
import ThemeToggle from '@/components/ThemeToggle'

// Re-exporta para quem já importava daqui
export { drTitle }

interface Props {
  titulo: string
  backHref?: string
  onBack?: () => void
  medicoNome?: string
  medicoSexo?: string | null
  medicoFotoUrl?: string | null
}

export default function MedicoHeader({ titulo, backHref, onBack, medicoNome, medicoSexo, medicoFotoUrl }: Props) {
  const titulo_dr = medicoNome ? `${drTitle(medicoSexo)} ${medicoNome}` : ''

  return (
    <header
      className="shrink-0 border-b"
      style={{ background: 'var(--header-bg)', color: 'var(--header-txt)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">

        {/* ── Esquerda ── */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          ) : backHref ? (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          ) : null}

          <img src="/logo-branca.svg" alt="RovarisMed" className="h-8 shrink-0" />
          <div className="h-5 w-px bg-white/15 shrink-0" />
          <span className="text-xs font-semibold text-white/90 bg-white/10 px-3 py-1 rounded-full whitespace-nowrap border border-white/10">
            {titulo}
          </span>
        </div>

        {/* ── Direita ── */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Link
            href="/medico/dashboard"
            className="flex items-center gap-1.5 text-green-200/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Painel</span>
          </Link>
          <Link
            href="/medico/producao"
            className="flex items-center gap-1.5 text-green-200/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Minha Produção</span>
          </Link>

          {titulo_dr && (
            <div className="hidden lg:flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0 ring-1 ring-white/20">
                {medicoFotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={medicoFotoUrl} alt={medicoNome} className="w-full h-full object-cover" />
                ) : (
                  <User2 className="w-4 h-4 text-white/70" />
                )}
              </div>
              <span className="text-sm font-semibold text-white/90">
                {titulo_dr}
              </span>
            </div>
          )}

          <div className="w-px h-5 bg-white/15 mx-1" />
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
        </div>
      </div>
    </header>
  )
}
