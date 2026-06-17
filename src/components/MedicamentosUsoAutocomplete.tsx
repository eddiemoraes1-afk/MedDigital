'use client'

/**
 * Textarea com autocomplete de medicamentos para o campo "Medicamentos em Uso".
 * Detecta o token sendo digitado (após última vírgula ou newline) e busca
 * na mesma base de dados da emissão de receitas.
 */

import { useEffect, useRef, useState } from 'react'
import { buscarMedicamentos, type Medicamento } from '@/lib/medicamentos'

interface Props {
  value:       string
  onChange:    (v: string) => void
  dark?:       boolean
  placeholder?: string
  rows?:       number
  className?:  string
}

export default function MedicamentosUsoAutocomplete({
  value, onChange, dark, placeholder, rows = 2, className,
}: Props) {
  const [sugestoes,  setSugestoes]  = useState<Medicamento[]>([])
  const [mostrar,    setMostrar]    = useState(false)
  const [focado,     setFocado]     = useState(-1)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Extrai o token sendo digitado na posição atual do cursor ────────────────
  function tokenAtual(texto: string, cursor: number): { token: string; inicio: number } {
    const ate = texto.slice(0, cursor)
    // Separadores: newline, vírgula, ponto-e-vírgula
    const sep = Math.max(ate.lastIndexOf('\n'), ate.lastIndexOf(','), ate.lastIndexOf(';'))
    const segmento = sep >= 0 ? ate.slice(sep + 1) : ate
    const token  = segmento.trimStart()
    const inicio = sep >= 0 ? sep + 1 + (segmento.length - token.length) : segmento.length - token.length
    return { token, inicio }
  }

  // ── Atualiza sugestões conforme o usuário digita ───────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const novo   = e.target.value
    onChange(novo)
    const cursor = e.target.selectionStart ?? novo.length
    const { token } = tokenAtual(novo, cursor)
    if (token.length >= 2) {
      const res = buscarMedicamentos(token, 8)
      setSugestoes(res)
      setMostrar(res.length > 0)
    } else {
      setSugestoes([])
      setMostrar(false)
    }
    setFocado(-1)
  }

  // ── Insere o medicamento selecionado substituindo o token atual ────────────
  function selecionar(med: Medicamento) {
    const ta = textareaRef.current
    if (!ta) return
    const cursor = ta.selectionStart ?? value.length
    const { token, inicio } = tokenAtual(value, cursor)
    const label  = `${med.principio} ${med.concentracao}`
    // Antes do token + label + o que vem depois do cursor
    const antes  = value.slice(0, inicio)
    const depois = value.slice(cursor)
    const novo   = antes + label + depois
    onChange(novo)
    setSugestoes([])
    setMostrar(false)
    setFocado(-1)
    // Reposiciona cursor ao final do label inserido
    const novaCursor = inicio + label.length
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(novaCursor, novaCursor)
    }, 0)
  }

  // ── Navegação por teclado ─────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mostrar || sugestoes.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocado(i => Math.min(i + 1, sugestoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocado(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && focado >= 0) {
      e.preventDefault()
      selecionar(sugestoes[focado])
    } else if (e.key === 'Escape') {
      setMostrar(false)
      setFocado(-1)
    }
  }

  // ── Fecha dropdown ao clicar fora ─────────────────────────────────────────
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMostrar(false)
      }
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  // ── Estilos condicionais (dark = painel de antecedentes) ──────────────────
  const clsTa = dark
    ? 'bg-transparent border border-amber-800/50 text-amber-100 placeholder-amber-700/60 focus:ring-amber-600/50 focus:border-amber-600'
    : 'border-gray-200 text-gray-700 placeholder-gray-300 focus:ring-[#5BBD9B]'
  const clsDrop = dark
    ? 'bg-[#1A1000] border-amber-800/50 shadow-2xl'
    : 'bg-white border-gray-200 shadow-xl'
  const clsItem = dark
    ? 'border-amber-900/40 hover:bg-amber-900/30'
    : 'border-gray-50 hover:bg-[#F0F9F5]'
  const clsItemFoc = dark
    ? 'bg-amber-900/40'
    : 'bg-[#F0F9F5]'
  const clsPrincipio = dark ? 'text-amber-200' : 'text-[#1A3A2C]'

  return (
    <div ref={containerRef} className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMostrar(false), 150)}
        placeholder={placeholder}
        rows={rows}
        autoComplete="off"
        className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${clsTa} ${className ?? ''}`}
      />

      {mostrar && sugestoes.length > 0 && (
        <div className={`absolute z-50 left-0 right-0 top-full mt-1 border rounded-xl overflow-hidden max-h-52 overflow-y-auto ${clsDrop}`}>
          <p className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-b ${dark ? 'text-amber-500 border-amber-900/40' : 'text-gray-400 border-gray-100'}`}>
            Medicamentos — base ANVISA
          </p>
          {sugestoes.map((med, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => selecionar(med)}
              className={`w-full text-left px-3 py-2 border-b last:border-0 transition-colors ${clsItem} ${i === focado ? clsItemFoc : ''}`}
            >
              <p className={`text-sm font-semibold ${clsPrincipio}`}>
                {med.principio} <span className="font-normal">{med.concentracao}</span>
                {med.controle === 'especial' && (
                  <span className="ml-1.5 text-[10px] font-bold text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded-full">CONTROLADO</span>
                )}
                {med.controle === 'antimicrobiano' && (
                  <span className="ml-1.5 text-[10px] font-bold text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded-full">ANTIMICROBIANO</span>
                )}
              </p>
              <p className={`text-xs mt-0.5 ${dark ? 'text-amber-600' : 'text-gray-400'}`}>
                {med.forma}
                {med.comerciais && med.comerciais.length > 0 && (
                  <span className="ml-2 text-[#5BBD9B]">· {med.comerciais.slice(0, 2).join(', ')}</span>
                )}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
