'use client'

import Link from 'next/link'
import { LogOut, ArrowLeft } from 'lucide-react'
import { useTema } from './TemaProvider'

interface Props {
  /** Título exibido no header ao lado da logo (ex: "Agendamentos") */
  titulo?: string
  /** Href do botão de voltar (ex: "/paciente/dashboard") */
  backHref?: string
}

/**
 * Header compartilhado para todas as páginas do paciente.
 * Lê logo, cor e nome da empresa via TemaContext (fornecido pelo layout).
 */
export default function PacienteHeader({ titulo, backHref }: Props) {
  const { tema, logoUrl, empresaNome, pacienteNome } = useTema()
  const primeiroNome = pacienteNome?.split(' ')[0] ?? ''

  const bgPill = tema.corTexto === '#ffffff' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
  const bgPillHover = tema.corTexto === '#ffffff' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'

  return (
    <header style={{ backgroundColor: tema.corPrimaria }} className="px-6 py-3.5 shrink-0">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

        {/* Esquerda: voltar + logo + separador + badge título */}
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80 shrink-0"
              style={{ backgroundColor: bgPill, color: tema.corTexto }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          )}

          {/* Logo da empresa em container branco */}
          {logoUrl ? (
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
              <img
                src={logoUrl}
                alt={empresaNome || 'Logo'}
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
          ) : (
            <img src="/logo-branca.svg" alt="RovarisMed" className="h-9 shrink-0" />
          )}

          {titulo && (
            <>
              <div className="h-5 w-px shrink-0" style={{ backgroundColor: `${tema.corTexto}33` }} />
              <span
                className="text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap"
                style={{ backgroundColor: bgPill, color: tema.corTexto }}
              >
                {titulo}
              </span>
            </>
          )}
        </div>

        {/* Direita: nome do paciente + logout pill */}
        <div className="flex items-center gap-3 shrink-0">
          {primeiroNome && (
            <span className="text-sm font-semibold hidden sm:block" style={{ color: tema.corTexto }}>
              Olá, {primeiroNome}
            </span>
          )}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
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
