'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Calendar } from 'lucide-react'

interface Props {
  dataIni: string
  dataFim: string
  label: string
}

export default function ProducaoFiltroClient({ dataIni, dataFim, label }: Props) {
  const router = useRouter()
  const deRef  = useRef<HTMLInputElement>(null)
  const ateRef = useRef<HTMLInputElement>(null)

  function navegar() {
    const de  = deRef.current?.value  || dataIni
    const ate = ateRef.current?.value || dataFim
    if (de && ate) {
      router.push(`/medico/producao?de=${de}&ate=${ate}`)
    }
  }

  return (
    <div className="bg-white rounded-2xl px-6 py-4 shadow-sm flex flex-wrap items-end gap-4">
      <div>
        <label className="text-xs text-gray-400 block mb-1">De</label>
        <input
          ref={deRef}
          type="date"
          defaultValue={dataIni}
          onChange={navegar}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Até</label>
        <input
          ref={ateRef}
          type="date"
          defaultValue={dataFim}
          onChange={navegar}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
        />
      </div>
      <span className="text-xs text-gray-400 self-center">
        <Calendar className="w-3.5 h-3.5 inline mr-1" />
        {label}
      </span>
    </div>
  )
}
