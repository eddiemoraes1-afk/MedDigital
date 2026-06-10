'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { CID_DESCRICOES } from '@/lib/cidDescricoes'

interface Props {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  dark?: boolean
  placeholder?: string
  className?: string
  inputClassName?: string
  /** Se true, mostra borda vermelha (campo obrigatório não preenchido) */
  error?: boolean
}

const MAX_SUGESTOES = 10

/** Normaliza código: remove pontos, uppercase, trim  */
function normalizar(s: string) {
  return s.replace(/\./g, '').toUpperCase().trim()
}

function buscar(query: string): Array<{ code: string; desc: string }> {
  if (query.length < 2) return []
  const q = query.toUpperCase().trim()
  const qNorm = normalizar(q)
  const results: Array<{ code: string; desc: string }> = []

  for (const [code, desc] of Object.entries(CID_DESCRICOES)) {
    // Busca por prefixo do código (ex.: "J0" → J00, J06, ...)
    const codeNorm = normalizar(code)
    const matchCode = codeNorm.startsWith(qNorm) || code.toUpperCase().startsWith(q)
    // Busca por substring na descrição
    const matchDesc = desc.toUpperCase().includes(q)

    if (matchCode || matchDesc) {
      results.push({ code, desc })
      if (results.length >= MAX_SUGESTOES) break
    }
  }
  return results
}

export default function CidAutocomplete({
  value,
  onChange,
  disabled = false,
  dark = false,
  placeholder = 'Ex: J00, Z76.0, M54.5',
  className = '',
  inputClassName = '',
  error = false,
}: Props) {
  const [sugestoes, setSugestoes] = useState<Array<{ code: string; desc: string }>>([])
  const [aberto, setAberto] = useState(false)
  const [foco, setFoco] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Atualiza sugestões sempre que o value mudar
  useEffect(() => {
    const lista = buscar(value)
    setSugestoes(lista)
    setAberto(lista.length > 0 && document.activeElement === inputRef.current)
    setFoco(-1)
  }, [value])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase()
    onChange(v)
    if (v.length >= 2) {
      const lista = buscar(v)
      setSugestoes(lista)
      setAberto(lista.length > 0)
    } else {
      setSugestoes([])
      setAberto(false)
    }
    setFoco(-1)
  }

  function selecionar(code: string) {
    onChange(code)
    setSugestoes([])
    setAberto(false)
    setFoco(-1)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!aberto) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFoco(f => Math.min(f + 1, sugestoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFoco(f => Math.max(f - 1, 0))
    } else if (e.key === 'Enter' && foco >= 0) {
      e.preventDefault()
      selecionar(sugestoes[foco].code)
    } else if (e.key === 'Escape') {
      setAberto(false)
    }
  }

  // Descrição do CID atual (quando exatamente um código válido está digitado)
  const descAtual = CID_DESCRICOES[value.trim().toUpperCase()] ?? null

  // ── Estilos ──────────────────────────────────────────────────────────────────

  const inputBase = dark
    ? `w-full bg-[#0F1F33] border text-blue-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5BBD9B] placeholder-blue-900 uppercase font-mono ${
        error
          ? 'border-red-400'
          : 'border-[#2A4A3C]'
      } disabled:opacity-50`
    : `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] font-mono disabled:opacity-60 ${
        error
          ? 'border-red-200 bg-red-50'
          : 'border-gray-200 bg-white'
      }`

  const dropdownBase = dark
    ? 'bg-[#1A3A2C] border border-[#2A4A3C] rounded-xl shadow-2xl'
    : 'bg-white border border-gray-200 rounded-xl shadow-xl'

  const itemBase = dark
    ? 'flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors'
    : 'flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors'

  const itemFocused = dark
    ? 'bg-[#2A4A3C]'
    : 'bg-[#5BBD9B]/10'

  const itemNormal = dark
    ? 'hover:bg-[#1E3028]'
    : 'hover:bg-gray-50'

  const codeStyle = dark
    ? 'font-mono text-xs font-bold text-green-400 shrink-0 mt-0.5'
    : 'font-mono text-xs font-bold text-[#1A3A2C] shrink-0 mt-0.5'

  const descStyle = dark
    ? 'text-xs text-blue-200 leading-tight'
    : 'text-xs text-gray-600 leading-tight'

  const descAtualStyle = dark
    ? 'text-[10px] text-green-400 mt-0.5 flex items-center gap-1'
    : 'text-[10px] text-[#5BBD9B] mt-0.5 flex items-center gap-1'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (sugestoes.length > 0) setAberto(true)
        }}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`${inputBase} ${inputClassName}`}
      />

      {/* Descrição inline quando CID válido reconhecido */}
      {descAtual && !aberto && (
        <p className={descAtualStyle}>
          <span>✓</span>
          <span>{descAtual}</span>
        </p>
      )}

      {/* Dropdown de sugestões */}
      {aberto && sugestoes.length > 0 && (
        <div
          className={`absolute z-50 w-full mt-1 overflow-hidden ${dropdownBase}`}
          style={{ maxHeight: '260px', overflowY: 'auto' }}
        >
          {sugestoes.map((s, idx) => (
            <div
              key={s.code}
              className={`${itemBase} ${idx === foco ? itemFocused : itemNormal}`}
              onMouseDown={e => {
                e.preventDefault() // evita blur antes do click
                selecionar(s.code)
              }}
              onMouseEnter={() => setFoco(idx)}
            >
              <span className={codeStyle}>{s.code}</span>
              <span className={descStyle}>{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
