'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Edit3, X } from 'lucide-react'

interface Props {
  pacienteId: string
  inicial: {
    alergias:            string | null
    hpp:                 string | null
    medicamentos_em_uso: string | null
    historia_familiar:   string | null
    historia_social:     string | null
  }
}

export default function AntecedentesForm({ pacienteId, inicial }: Props) {
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo,    setSalvo]    = useState(false)
  const [erro,     setErro]     = useState('')

  const [alergias,          setAlergias]          = useState(inicial.alergias            || '')
  const [hpp,               setHpp]               = useState(inicial.hpp                 || '')
  const [medicamentos,      setMedicamentos]      = useState(inicial.medicamentos_em_uso || '')
  const [historiaFamiliar,  setHistoriaFamiliar]  = useState(inicial.historia_familiar   || '')
  const [historiaSocial,    setHistoriaSocial]    = useState(inicial.historia_social     || '')

  // Valores salvos (para exibição no modo leitura)
  const [saved, setSaved] = useState(inicial)

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/medico/antecedentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id:         pacienteId,
          alergias:            alergias.trim()         || null,
          hpp:                 hpp.trim()              || null,
          medicamentos_em_uso: medicamentos.trim()     || null,
          historia_familiar:   historiaFamiliar.trim() || null,
          historia_social:     historiaSocial.trim()   || null,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSaved({
        alergias:            alergias.trim()         || null,
        hpp:                 hpp.trim()              || null,
        medicamentos_em_uso: medicamentos.trim()     || null,
        historia_familiar:   historiaFamiliar.trim() || null,
        historia_social:     historiaSocial.trim()   || null,
      })
      setSalvo(true)
      setEditando(false)
      setTimeout(() => setSalvo(false), 3000)
    } catch {
      setErro('Erro ao salvar antecedentes. Tente novamente.')
    }
    setSalvando(false)
  }

  function cancelar() {
    setAlergias(saved.alergias            || '')
    setHpp(saved.hpp                      || '')
    setMedicamentos(saved.medicamentos_em_uso || '')
    setHistoriaFamiliar(saved.historia_familiar   || '')
    setHistoriaSocial(saved.historia_social     || '')
    setEditando(false)
    setErro('')
  }

  const campos = [
    { label: 'Alergias', value: saved.alergias,            cor: 'bg-red-50 border-red-200 text-red-800' },
    { label: 'HPP — História Patológica Pregressa', value: saved.hpp, cor: 'bg-amber-50 border-amber-200 text-amber-800' },
    { label: 'Medicamentos de uso contínuo', value: saved.medicamentos_em_uso, cor: 'bg-blue-50 border-blue-200 text-blue-800' },
    { label: 'História familiar', value: saved.historia_familiar, cor: 'bg-purple-50 border-purple-200 text-purple-800' },
    { label: 'História social', value: saved.historia_social, cor: 'bg-gray-50 border-gray-200 text-gray-700' },
  ]

  // Modo leitura
  if (!editando) {
    const temDados = campos.some(c => c.value)
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {salvo && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Salvo
              </span>
            )}
          </div>
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 text-xs text-[#1A3A2C] border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {temDados ? 'Editar antecedentes' : 'Preencher antecedentes'}
          </button>
        </div>

        {!temDados ? (
          <p className="text-sm text-gray-400 italic">
            Nenhum antecedente registrado. Clique em "Preencher antecedentes" para adicionar.
          </p>
        ) : (
          <div className="space-y-3">
            {campos.map(c => c.value ? (
              <div key={c.label} className={`rounded-xl border px-4 py-3 ${c.cor}`}>
                <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">{c.label}</p>
                <p className="text-sm whitespace-pre-line">{c.value}</p>
              </div>
            ) : null)}
          </div>
        )}
      </div>
    )
  }

  // Modo edição
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#1A3A2C]">Editando antecedentes</p>
        <button onClick={cancelar} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {[
        { label: 'Alergias (medicamentos, alimentos, látex, etc.)', value: alergias, onChange: setAlergias, placeholder: 'Ex: Penicilina, dipirona, frutos do mar...', rows: 2 },
        { label: 'HPP — História Patológica Pregressa', value: hpp, onChange: setHpp, placeholder: 'Doenças anteriores, cirurgias, internações, diabetes, HAS, etc.', rows: 3 },
        { label: 'Medicamentos de uso contínuo', value: medicamentos, onChange: setMedicamentos, placeholder: 'Ex: Metformina 850mg 2x/dia, Losartana 50mg/dia...', rows: 2 },
        { label: 'História familiar', value: historiaFamiliar, onChange: setHistoriaFamiliar, placeholder: 'Doenças em pais, irmãos, avós com impacto hereditário...', rows: 2 },
        { label: 'História social (tabagismo, etilismo, atividade física, profissão)', value: historiaSocial, onChange: setHistoriaSocial, placeholder: 'Ex: Tabagista 10 anos, etilismo social, sedentário, escriturário...', rows: 2 },
      ].map(f => (
        <div key={f.label}>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
          <textarea
            value={f.value}
            onChange={e => f.onChange(e.target.value)}
            placeholder={f.placeholder}
            rows={f.rows}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none placeholder-gray-300"
          />
        </div>
      ))}

      {erro && <p className="text-xs text-red-500">{erro}</p>}

      <div className="flex gap-2">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Salvar antecedentes
        </button>
        <button
          onClick={cancelar}
          className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
