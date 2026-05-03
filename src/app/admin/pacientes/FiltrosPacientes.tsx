'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

interface Empresa {
  id: string
  nome: string
}

interface Props {
  empresas: Empresa[]
  total: number
}

export default function FiltrosPacientes({ empresas, total }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setFiltro(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (valor === '' || valor === 'todos') {
      params.delete(chave)
    } else {
      params.set(chave, valor)
    }
    router.push(`/admin/pacientes?${params.toString()}`)
  }

  const empresaId = searchParams.get('empresa_id') ?? ''
  const tipo = searchParams.get('tipo') ?? ''
  const consultas = searchParams.get('consultas') ?? ''

  const queryString = searchParams.toString()

  function exportar(formato: 'xlsx' | 'pdf') {
    const url = `/api/admin/pacientes/exportar?formato=${formato}${queryString ? '&' + queryString : ''}`
    window.open(url, '_blank')
  }

  const selectClass = "border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] bg-white text-gray-700"

  return (
    <div className="bg-white rounded-2xl shadow-sm px-6 py-4 flex flex-wrap items-center gap-3 mb-4">
      {/* Filtro empresa */}
      <select
        value={empresaId}
        onChange={e => setFiltro('empresa_id', e.target.value)}
        className={selectClass}
      >
        <option value="">Todas as empresas</option>
        <option value="particular">Particular</option>
        {empresas.map(e => (
          <option key={e.id} value={e.id}>{e.nome}</option>
        ))}
      </select>

      {/* Filtro tipo */}
      <select
        value={tipo}
        onChange={e => setFiltro('tipo', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os tipos</option>
        <option value="vinculado">Vinculado a empresa</option>
        <option value="particular">Particular</option>
      </select>

      {/* Filtro consultas */}
      <select
        value={consultas}
        onChange={e => setFiltro('consultas', e.target.value)}
        className={selectClass}
      >
        <option value="">Com ou sem consultas</option>
        <option value="sim">Com consultas</option>
        <option value="nao">Sem consultas</option>
      </select>

      <span className="text-xs text-gray-400 ml-auto">{total} resultado(s)</span>

      {/* Exportar */}
      <button
        onClick={() => exportar('xlsx')}
        className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-xl transition-colors font-medium"
      >
        <FileSpreadsheet className="w-4 h-4" /> Excel
      </button>
      <button
        onClick={() => exportar('pdf')}
        className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors font-medium"
      >
        <FileText className="w-4 h-4" /> PDF
      </button>
    </div>
  )
}
