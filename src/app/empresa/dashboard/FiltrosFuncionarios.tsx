'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  departamentos: string[]
}

export default function FiltrosFuncionarios({ departamentos }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setFiltro(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!valor) params.delete(chave)
    else params.set(chave, valor)
    router.push(`/empresa/dashboard?${params.toString()}`)
  }

  const selectClass = "border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#2E75B6] bg-white text-gray-700"

  return (
    <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
      <select
        value={searchParams.get('departamento') ?? ''}
        onChange={e => setFiltro('departamento', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os departamentos</option>
        {departamentos.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        value={searchParams.get('status') ?? ''}
        onChange={e => setFiltro('status', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os status</option>
        <option value="ativo">Ativaram a conta</option>
        <option value="inativo">Não ativaram</option>
      </select>
    </div>
  )
}
