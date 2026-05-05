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

  return (
    <header style={{ backgroundColor: tema.corPrimaria }} className="px-6 py-3.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

        {/* Esquerda: voltar + logo + título */}
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg hover:opacity-70 transition-opacity"
              style={{ backgroundColor: `rgba(${tema.corTexto === '#ffffff' ? '255,255,255' : '0,0,0'},0.15)`, color: tema.corTexto }}
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
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

          {/* Título da página ou nome da empresa */}
          <div className="min-w-0">
            {titulo ? (
              <p className="text-sm font-semibold truncate" style={{ color: tema.corTexto }}>
                {titulo}
              </p>
            ) : empresaNome ? (
              <p className="text-sm hidden sm:block truncate" style={{ color: tema.corTextoSuave }}>
                {empresaNome}
              </p>
            ) : null}
          </div>
        </div>

        {/* Direita: nome do paciente + logout */}
        <div className="flex items-center gap-3 shrink-0">
          {primeiroNome && (
            <span className="text-sm hidden sm:block" style={{ color: tema.corTextoSuave }}>
              Olá, {primeiroNome}
            </span>
          )}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
              style={{ color: tema.corTexto }}
              title="Sair"
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
