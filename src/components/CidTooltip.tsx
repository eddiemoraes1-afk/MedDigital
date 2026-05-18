'use client'

import { useState } from 'react'
import { getCidDescricao } from '@/lib/cidDescricoes'
import { CID_GRUPOS } from '@/lib/cidGrupos'
import { cidParaGrupoCodigo } from '@/lib/cidGrupos'

// ── Tooltip base ──────────────────────────────────────────────────────────────
function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible(v => !v)}
    >
      {children}
      {visible && content && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-xs bg-gray-900 text-white text-xs rounded-xl px-3 py-2 pointer-events-none shadow-2xl leading-snug whitespace-normal text-center">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  )
}

// ── Badge de código CID com tooltip da descrição ──────────────────────────────
export function CidBadge({
  cid,
  className = 'font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full',
}: {
  cid: string
  className?: string
}) {
  const descricao = getCidDescricao(cid)
  const tooltipContent = descricao ? (
    <>
      <span className="font-mono font-bold text-blue-300">{cid.toUpperCase()}</span>
      <br />
      <span className="text-gray-200">{descricao}</span>
    </>
  ) : null

  return (
    <Tooltip content={tooltipContent}>
      <span className={`${className} ${descricao ? 'cursor-help' : ''}`}>
        {cid}
      </span>
    </Tooltip>
  )
}

// ── Label de grupo CID-10 com tooltip do nome completo ────────────────────────
export function GrupoLabel({
  abrev,
  grupo,
  className = 'text-xs text-gray-600 cursor-help',
}: {
  abrev: string
  grupo: string
  className?: string
}) {
  const info = CID_GRUPOS.find(g => g.nome === grupo)
  const tooltipContent = info ? (
    <>
      <span className="font-mono font-bold text-green-300">{info.codigo}</span>
      <br />
      <span className="text-gray-200">{info.nome}</span>
    </>
  ) : null

  return (
    <Tooltip content={tooltipContent}>
      <span className={className}>{abrev}</span>
    </Tooltip>
  )
}

// ── Badge de código CID estilo tabela (fundo cinza) com tooltip ───────────────
export function CidBadgeTable({ cid }: { cid: string }) {
  return (
    <CidBadge
      cid={cid}
      className="font-mono text-xs bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md font-semibold"
    />
  )
}

// ── Badge de CID principal (azul pill) com tooltip ───────────────────────────
export function CidBadgePill({ cid }: { cid: string }) {
  return (
    <CidBadge
      cid={cid}
      className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full"
    />
  )
}
