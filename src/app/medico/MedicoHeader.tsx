'use client'

import Link from 'next/link'
import { ArrowLeft, LogOut, LayoutDashboard, BarChart2, User2 } from 'lucide-react'
import { drTitle } from '@/lib/medico-utils'

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
    <header className="bg-[#1A3A2C] text-white px-6 py-3.5 shrink-0">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

        {/* Esquerda: voltar + logo + badge */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          ) : backHref ? (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          ) : null}
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-9 shrink-0" />
          <div className="h-5 w-px bg-white/20 shrink-0" />
          <span className="text-sm font-bold text-white bg-white/15 px-3 py-1 rounded-full whitespace-nowrap">
            {titulo}
          </span>
        </div>

        {/* Direita: nav + avatar + nome + logout */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/medico/dashboard"
            className="flex items-center gap-1.5 text-green-200 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Painel</span>
          </Link>
          <Link
            href="/medico/producao"
            className="flex items-center gap-1.5 text-green-200 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Minha Produção</span>
          </Link>

          {titulo_dr && (
            <div className="hidden lg:flex items-center gap-2 px-2">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                {medicoFotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={medicoFotoUrl} alt={medicoNome} className="w-full h-full object-cover" />
                ) : (
                  <User2 className="w-4 h-4 text-white/70" />
                )}
              </div>
              <span className="text-sm font-semibold text-white">
                {titulo_dr}
              </span>
            </div>
          )}

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
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
