'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  id?: string
}

export default function InputSenha({ value, onChange, placeholder = 'Senha', className, required, id }: Props) {
  const [visivel, setVisivel] = useState(false)

  const base = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent pr-10"

  return (
    <div className="relative">
      <input
        id={id}
        type={visivel ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={className ?? base}
      />
      <button
        type="button"
        onClick={() => setVisivel(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
