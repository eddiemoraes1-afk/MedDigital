'use client'

import Link from 'next/link'
import { ArrowLeft, LogOut } from 'lucide-react'

interface Props {
  /** Nome da seção/tela exibido como badge no header */
  titulo: string
  /** Onde o botão Voltar leva. Omitir na tela inicial (dashboard). */
  backHref?: string
  /** Nome completo do médico logado (opcional em páginas client sem acesso a dados) */
  medicoNome?: string
}

/**
 * Header padronizado para todas as páginas da área /medico.
 * Componente client para funcionar tanto em server pages quanto client pages.
 */
export default function MedicoHeader({ titulo, backHref, medicoNome }: Props) {
  const primeiroNome = medicoNome?.split(' ')[0] ?? ''

  return (
    <header className="bg-[#1A3A2C] text-white px-6 py-3.5 shrink-0">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

        {/* Esquerda: voltar + logo + badge de seção */}
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

        {/* Direita: nome + logout */}
        <div className="flex items-center gap-3 shrink-0">
          {primeiroNome && (
            <span className="text-sm font-semibold text-white hidden sm:block">
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
