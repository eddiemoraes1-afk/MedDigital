'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

interface Props {
  /** Classes extras no wrapper */
  className?: string
}

export default function ThemeToggle({ className = '' }: Props) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const html = document.documentElement
    const next = !html.classList.contains('dark')
    html.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
    setDark(next)
  }

  if (!mounted) {
    // Placeholder com mesmas dimensões para evitar layout shift
    return (
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center opacity-0 ${className}`}
        aria-hidden
      />
    )
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      className={`
        w-9 h-9 rounded-xl flex items-center justify-center
        bg-white/10 hover:bg-white/20
        text-white transition-all duration-200
        hover:scale-105 active:scale-95
        ${className}
      `}
    >
      {dark
        ? <Sun  className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}
