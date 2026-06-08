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
    <div className="rounded-2xl px-6 py-4 flex flex-wrap items-end gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--txt-3)' }}>De</label>
        <input
          ref={deRef}
          type="date"
          defaultValue={dataIni}
          onChange={navegar}
          className="text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
          style={{ border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--txt-1)' }}
        />
      </div>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--txt-3)' }}>Até</label>
        <input
          ref={ateRef}
          type="date"
          defaultValue={dataFim}
          onChange={navegar}
          className="text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
          style={{ border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--txt-1)' }}
        />
      </div>
      <span className="text-xs self-center" style={{ color: 'var(--txt-3)' }}>
        <Calendar className="w-3.5 h-3.5 inline mr-1" />
        {label}
      </span>
    </div>
  )
}
