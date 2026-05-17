'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileSpreadsheet, FileText, Search, X } from 'lucide-react'

interface Empresa {
  id: string
  nome: string
}

interface Props {
  empresas: Empresa[]
  total: number
  nomeInicial: string
  cadastroDeInicial: string
  cadastroAteInicial: string
}

export default function FiltrosPacientes({ empresas, total, nomeInicial, cadastroDeInicial, cadastroAteInicial }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [nomeBusca, setNomeBusca] = useState(nomeInicial)

  // Debounce da busca por nome
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (nomeBusca.trim()) {
        params.set('nome', nomeBusca.trim())
      } else {
        params.delete('nome')
      }
      router.push(`/admin/pacientes?${params.toString()}`)
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeBusca])

  function setFiltro(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (valor === '' || valor === 'todos') {
      params.delete(chave)
    } else {
      params.set(chave, valor)
    }
    router.push(`/admin/pacientes?${params.toString()}`)
  }

  function limparFiltros() {
    setNomeBusca('')
    router.push('/admin/pacientes')
  }

  const empresaId   = searchParams.get('empresa_id') ?? ''
  const tipo        = searchParams.get('tipo') ?? ''
  const consultas   = searchParams.get('consultas') ?? ''
  const cadastroDe  = searchParams.get('cadastro_de') ?? cadastroDeInicial
  const cadastroAte = searchParams.get('cadastro_ate') ?? cadastroAteInicial

  const queryString = searchParams.toString()
  const temFiltro   = !!(nomeBusca.trim() || empresaId || tipo || consultas || cadastroDe || cadastroAte)

  function exportar(formato: 'xlsx' | 'pdf') {
    const url = `/api/admin/pacientes/exportar?formato=${formato}${queryString ? '&' + queryString : ''}`
    window.open(url, '_blank')
  }

  const selectClass = "border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white text-gray-700"
  const inputClass  = "border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white text-gray-700"

  return (
    <div className="bg-white rounded-2xl shadow-sm px-6 py-4 mb-4 space-y-3">
      {/* Linha 1: busca por nome + empresa + tipo + consultas */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca por nome */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome…"
            value={nomeBusca}
            onChange={e => setNomeBusca(e.target.value)}
            className={`${inputClass} pl-9 w-full`}
          />
          {nomeBusca && (
            <button
              onClick={() => setNomeBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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
      </div>

      {/* Linha 2: datas de cadastro + resultados + ações */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-gray-400 shrink-0">Cadastrado entre:</span>
        <input
          type="date"
          value={cadastroDe}
          onChange={e => setFiltro('cadastro_de', e.target.value)}
          className={`${inputClass} text-xs`}
        />
        <span className="text-xs text-gray-400">e</span>
        <input
          type="date"
          value={cadastroAte}
          onChange={e => setFiltro('cadastro_ate', e.target.value)}
          className={`${inputClass} text-xs`}
        />

        {temFiltro && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}

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
    </div>
  )
}
