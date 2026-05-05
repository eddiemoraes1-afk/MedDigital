'use client'

import { createContext, useContext, useEffect } from 'react'
import { gerarTema, TemaEmpresa } from '@/lib/tema'

// ─── Contexto ─────────────────────────────────────────────────────────────────

interface TemaContextType {
  tema: TemaEmpresa
  logoUrl: string | null
  empresaNome: string | null
  pacienteNome: string | null
}

const defaultTema = gerarTema(null)

const TemaContext = createContext<TemaContextType>({
  tema: defaultTema,
  logoUrl: null,
  empresaNome: null,
  pacienteNome: null,
})

export function useTema(): TemaContextType {
  return useContext(TemaContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode
  corPrimaria: string | null
  logoUrl: string | null
  empresaNome: string | null
  pacienteNome: string | null
}

export default function TemaProvider({
  children,
  corPrimaria,
  logoUrl,
  empresaNome,
  pacienteNome,
}: Props) {
  const tema = gerarTema(corPrimaria)

  // Injeta CSS variables no documento para que client components
  // possam usar var(--cor-empresa) em qualquer parte da árvore
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--cor-empresa', tema.corPrimaria)
    root.style.setProperty('--cor-empresa-rgb', tema.corRgb)
    root.style.setProperty('--cor-empresa-texto', tema.corTexto)
    root.style.setProperty('--cor-empresa-texto-suave', tema.corTextoSuave)
    root.style.setProperty('--cor-empresa-bg', tema.corBgPagina)
    root.style.setProperty('--cor-empresa-bg-card', tema.corBgCard)
    return () => {
      // Limpar ao desmontar (ex: navegação para fora da área /paciente)
      ;['--cor-empresa', '--cor-empresa-rgb', '--cor-empresa-texto',
        '--cor-empresa-texto-suave', '--cor-empresa-bg', '--cor-empresa-bg-card',
      ].forEach(v => root.style.removeProperty(v))
    }
  }, [tema.corPrimaria])

  return (
    <TemaContext.Provider value={{ tema, logoUrl, empresaNome, pacienteNome }}>
      {children}
    </TemaContext.Provider>
  )
}
