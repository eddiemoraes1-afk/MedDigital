'use client'

import Link from 'next/link'
import { ArrowLeft, LogOut, LayoutDashboard, BarChart2 } from 'lucide-react'

interface Props {
  titulo: string
  backHref?: string
  medicoNome?: string
}

export default function MedicoHeader({ titulo, backHref, medicoNome }: Props) {
  const primeiroNome = medicoNome?.split(' ')[0] ?? ''

  return (
    <header className="bg-[#1A3A2C] text-white px-6 py-3.5 shrink-0">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

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
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-9 shrink-0" />
          <div className="h-5 w-px bg-white/20 shrink-0" />
          <span className="text-sm font-bold text-white bg-white/15 px-3 py-1 rounded-full whitespace-nowrap">
            {titulo}
          </span>
        </div>

        {/* Direita: nav + nome + logout */}
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
          {primeiroNome && (
            <span className="text-sm font-semibold text-white hidden lg:block px-2">
              Dr(a). {primeiroNome}
            </span>
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
