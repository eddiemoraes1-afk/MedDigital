'use client'

import Link from 'next/link'
import { LogOut, ArrowLeft } from 'lucide-react'
import { useTema } from './TemaProvider'
import ThemeToggle from '@/components/ThemeToggle'

interface Props {
  titulo?: string
  backHref?: string
  onBack?: () => void
}

/**
 * Header compartilhado para todas as páginas do paciente.
 * Lê logo, cor e nome da empresa via TemaContext.
 */
export default function PacienteHeader({ titulo, backHref, onBack }: Props) {
  const { tema, logoUrl, empresaNome, pacienteNome } = useTema()
  const primeiroNome = pacienteNome?.split(' ')[0] ?? ''

  const bgPill = tema.corTexto === '#ffffff' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'
  const bgPillHover = tema.corTexto === '#ffffff' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'

  return (
    <header
      style={{ backgroundColor: tema.corPrimaria, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      className="px-6 py-3 shrink-0"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

        {/* ── Esquerda ── */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 shrink-0"
              style={{ backgroundColor: bgPill, color: tema.corTexto }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          ) : backHref ? (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 shrink-0"
              style={{ backgroundColor: bgPill, color: tema.corTexto }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          ) : null}

          {logoUrl ? (
            <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
              <img
                src={logoUrl}
                alt={empresaNome || 'Logo'}
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
          ) : (
            <img src="/logo-branca.svg" alt="RovarisMed" className="h-8 shrink-0" />
          )}

          {titulo && (
            <>
              <div className="h-5 w-px shrink-0" style={{ backgroundColor: `${tema.corTexto}28` }} />
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap border"
                style={{
                  backgroundColor: bgPill,
                  color: tema.corTexto,
                  borderColor: `${tema.corTexto}18`,
                }}
              >
                {titulo}
              </span>
            </>
          )}
        </div>

        {/* ── Direita ── */}
        <div className="flex items-center gap-2 shrink-0">
          {primeiroNome && (
            <span className="text-sm font-semibold hidden sm:block" style={{ color: tema.corTexto, opacity: .85 }}>
              Olá, {primeiroNome}
            </span>
          )}
          <ThemeToggle />
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: bgPill, color: tema.corTexto }}
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
