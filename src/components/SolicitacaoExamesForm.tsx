'use client'

import { useState } from 'react'
import { Loader2, FlaskConical, Download, CheckCircle2, X, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { imprimirExames, type ExamesHTMLParams } from '@/lib/examesHTML'

interface SolicitacaoExamesFormProps {
  atendimentoId: string
  pacienteId: string
  paciente: {
    nome: string
    cpf?: string | null
    data_nascimento?: string | null
    sexo?: string | null
  }
  medico: {
    nome: string
    crm?: string | null
    crm_uf?: string | null
    especialidade?: string | null
    sexo?: string | null
  }
  onFechar?: () => void
  onSalvo?: (solicitacao: any) => void
}

const URGENCIA_OPTIONS = [
  { value: 'normal', label: 'Normal', color: 'text-gray-600' },
  { value: 'urgente', label: 'Urgente', color: 'text-yellow-600' },
  { value: 'emergencia', label: 'Emergência', color: 'text-red-600' },
]

// Sugestões rápidas de exames comuns
const SUGESTOES = [
  'Hemograma completo',
  'Glicemia de jejum',
  'TSH e T4 Livre',
  'Colesterol Total e Frações',
  'Triglicerídeos',
  'Creatinina',
  'Ureia',
  'TGO / TGP (Transaminases)',
  'Ácido úrico',
  'Urina Rotina (EAS)',
  'Raio-X de Tórax',
  'Eletrocardiograma (ECG)',
  'Ultrassom Abdominal',
  'Ferritina e Ferro sérico',
  'Vitamina D (25-OH)',
  'Vitamina B12',
  'PSA Total (homens)',
  'Papanicolau (mulheres)',
  'HbA1c (Hemoglobina Glicada)',
  'PCR e VHS',
]

export default function SolicitacaoExamesForm({
  atendimentoId,
  pacienteId,
  paciente,
  medico,
  onFechar,
  onSalvo,
}: SolicitacaoExamesFormProps) {
  const hoje = new Date().toISOString().split('T')[0]

  const [examesList, setExamesList] = useState<string[]>([''])
  const [indicacaoClinica, setIndicacaoClinica] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [urgencia, setUrgencia] = useState<'normal' | 'urgente' | 'emergencia'>('normal')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [solicitacaoSalva, setSolicitacaoSalva] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [showSugestoes, setShowSugestoes] = useState(false)

  // Normaliza lista de exames para string
  const examesTexto = examesList.filter(e => e.trim()).join('\n')
  const temExames = examesList.some(e => e.trim())

  function addExame() { setExamesList(prev => [...prev, '']) }
  function removeExame(i: number) {
    setExamesList(prev => prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i))
  }
  function updateExame(i: number, val: string) {
    setExamesList(prev => prev.map((e, idx) => idx === i ? val : e))
  }
  function addSugestao(nome: string) {
    if (examesList.includes(nome)) return
    setExamesList(prev => {
      const sem = prev.filter(e => e.trim())
      return [...sem, nome, '']
    })
    setShowSugestoes(false)
  }

  function buildParams(): ExamesHTMLParams {
    return {
      paciente,
      medico,
      exames: examesTexto,
      indicacaoClinica: indicacaoClinica || null,
      observacoes: observacoes || null,
      urgencia,
      dataSolicitacao: hoje,
    }
  }

  async function salvar() {
    if (!temExames) return
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/medico/exames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          atendimento_id: atendimentoId,
          exames: examesTexto,
          indicacao_clinica: indicacaoClinica || null,
          observacoes: observacoes || null,
          urgencia,
          data_solicitacao: hoje,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSalvo(true)
      setSolicitacaoSalva(data.solicitacao)
      onSalvo?.(data.solicitacao)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function baixarPDF() { imprimirExames(buildParams()) }

  if (salvo) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold text-sm">Solicitação salva com sucesso!</p>
        </div>
        <p className="text-xs text-green-600">
          {examesList.filter(e => e.trim()).length} exame(s) solicitado(s)
          {urgencia !== 'normal' && <span className="ml-2 font-semibold">· {urgencia === 'urgente' ? '⚠ Urgente' : '🚨 Emergência'}</span>}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={baixarPDF}
            className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </button>
          <button
            onClick={() => {
              setSalvo(false)
              setSolicitacaoSalva(null)
              setExamesList([''])
              setIndicacaoClinica('')
              setObservacoes('')
              setUrgencia('normal')
            }}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" /> Nova solicitação
          </button>
          {onFechar && (
            <button onClick={onFechar} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2">Fechar</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {onFechar && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[#1A3A2C] flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-[#5BBD9B]" /> Solicitar Exames
          </h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Paciente */}
      <div className="bg-[#F0F9F5] rounded-xl px-3 py-2.5">
        <p className="text-xs font-semibold text-[#1A3A2C]">{paciente.nome}</p>
        {paciente.cpf && <p className="text-xs text-gray-500">CPF: {paciente.cpf}</p>}
      </div>

      {/* Urgência */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Urgência</label>
        <div className="flex gap-2">
          {URGENCIA_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setUrgencia(opt.value as any)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                urgencia === opt.value
                  ? opt.value === 'normal'
                    ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]'
                    : opt.value === 'urgente'
                    ? 'bg-yellow-500 text-white border-yellow-500'
                    : 'bg-red-600 text-white border-red-600'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de exames */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-600">
            Exames solicitados <span className="text-red-400">*</span>
          </label>
          <button
            onClick={() => setShowSugestoes(v => !v)}
            className="text-xs text-[#5BBD9B] hover:text-[#1A3A2C] font-medium"
          >
            + Sugestões rápidas
          </button>
        </div>

        {showSugestoes && (
          <div className="mb-2 bg-gray-50 border border-gray-200 rounded-xl p-2 grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
            {SUGESTOES.map(s => (
              <button
                key={s}
                onClick={() => addSugestao(s)}
                disabled={examesList.includes(s)}
                className="text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[#F0F9F5] text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {examesList.includes(s) ? '✓ ' : '+ '}{s}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          {examesList.map((exame, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input
                type="text"
                value={exame}
                onChange={e => updateExame(i, e.target.value)}
                placeholder={`Exame ${i + 1}...`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
              />
              {examesList.length > 1 && (
                <button
                  onClick={() => removeExame(i)}
                  className="text-gray-300 hover:text-red-400 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addExame}
          className="mt-2 flex items-center gap-1 text-xs text-[#5BBD9B] hover:text-[#1A3A2C] font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar exame
        </button>
      </div>

      {/* Indicação clínica */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Indicação clínica / Hipótese diagnóstica <span className="text-gray-400">(opcional)</span>
        </label>
        <textarea
          value={indicacaoClinica}
          onChange={e => setIndicacaoClinica(e.target.value)}
          rows={2}
          placeholder="Ex: Investigação de diabetes, acompanhamento de dislipidemia..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Observações / Orientações <span className="text-gray-400">(opcional)</span>
        </label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Ex: Paciente deve estar em jejum de 8h, trazer resultado anterior..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none"
        />
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {erro}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={salvar}
          disabled={salvando || !temExames}
          className="flex-1 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {salvando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            : <><FlaskConical className="w-4 h-4" /> Salvar solicitação</>}
        </button>
        <button
          onClick={baixarPDF}
          disabled={!temExames}
          title="Prévia do PDF (sem salvar)"
          className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center">O ícone de download gera uma prévia sem salvar no sistema.</p>
    </div>
  )
}
