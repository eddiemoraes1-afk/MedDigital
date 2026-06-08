'use client'

import { Download, Printer, RefreshCw, Loader2 } from 'lucide-react'

// ── Estilos base ───────────────────────────────────────────────────────────────
const BASE = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer'

const STYLE_EXCEL = {
  color:      'var(--success)',
  background: 'var(--success-bg)',
  border:     '1px solid color-mix(in srgb, var(--success) 28%, transparent)',
} as React.CSSProperties

const STYLE_PDF = {
  color:      'var(--danger)',
  background: 'var(--danger-bg)',
  border:     '1px solid color-mix(in srgb, var(--danger) 28%, transparent)',
} as React.CSSProperties

const STYLE_REFRESH = {
  color:      'var(--txt-2)',
  background: 'var(--surface-2)',
  border:     '1px solid var(--border-2)',
} as React.CSSProperties

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ActionButtonsProps {
  /** Handler para exportar Excel */
  onExcel?: () => void
  /** Handler para exportar PDF */
  onPDF?: () => void
  /** Handler para atualizar dados */
  onRefresh?: () => void
  /** Desabilita o botão Excel (ex: sem dados) */
  excelDisabled?: boolean
  /** Desabilita o botão PDF */
  pdfDisabled?: boolean
  /** Desabilita o botão Atualizar */
  refreshDisabled?: boolean
  /** Anima ícone do Atualizar */
  loading?: boolean
  /** Anima ícone do Excel (exportação em andamento) */
  exportando?: boolean
  /** Anima ícone do PDF */
  exportandoPdf?: boolean
  /** Classe extra opcional no wrapper */
  className?: string
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function ActionButtons({
  onExcel,
  onPDF,
  onRefresh,
  excelDisabled = false,
  pdfDisabled   = false,
  refreshDisabled = false,
  loading       = false,
  exportando    = false,
  exportandoPdf = false,
  className     = '',
}: ActionButtonsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onExcel && (
        <button
          type="button"
          onClick={onExcel}
          disabled={excelDisabled}
          className={BASE}
          style={STYLE_EXCEL}
        >
          {exportando
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />}
          Excel
        </button>
      )}

      {onPDF && (
        <button
          type="button"
          onClick={onPDF}
          disabled={pdfDisabled}
          className={BASE}
          style={STYLE_PDF}
        >
          {exportandoPdf
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Printer className="w-3.5 h-3.5" />}
          PDF
        </button>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshDisabled || loading}
          className={BASE}
          style={STYLE_REFRESH}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      )}
    </div>
  )
}

// ── Import React para CSSProperties ───────────────────────────────────────────
import React from 'react'
