'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, DollarSign, Info } from 'lucide-react'

interface Props {
  solicitacaoId:       string
  pacienteId:          string
  pacienteNome:        string
  pacienteCPF:         string
  pacienteNascimento:  string
  medicoId:            string
  medicoNome:          string
  medicoCRM:           string
  medicoCRMUF:         string
  medicoEspecialidade: string
  tipoReceita:         string
  medicamentosIniciais: string
  instrucoesIniciais:  string
  // Billing
  valorCobrado:          number   // quanto a empresa paga
  valorMedico:           number   // quanto o médico recebe
  valorCoparticipacao:   number   // quanto o funcionário paga (co-part.)
  percentualCopart:      number   // % de co-participação
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RenovacaoAtenderClient({
  solicitacaoId, pacienteId, pacienteNome, pacienteCPF, pacienteNascimento,
  medicoId, medicoNome, medicoCRM, medicoCRMUF, medicoEspecialidade,
  tipoReceita, medicamentosIniciais, instrucoesIniciais,
  valorCobrado, valorMedico, valorCoparticipacao, percentualCopart,
}: Props) {
  const router = useRouter()
  const [medicamentos, setMedicamentos] = useState(medicamentosIniciais)
  const [instrucoes, setInstrucoes]     = useState(instrucoesIniciais)
  const [observacoes, setObservacoes]   = useState('')
  const [validade, setValidade]         = useState('')
  const [salvando, setSalvando]         = useState(false)
  const [erro, setErro]                 = useState('')

  async function emitirReceita() {
    if (!medicamentos.trim()) {
      setErro('Informe os medicamentos.')
      return
    }
    setSalvando(true)
    setErro('')

    try {
      // 1. Criar a receita
      const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      const recRes = await fetch('/api/medico/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          tipo:        tipoReceita,
          medicamentos,
          instrucoes,
          observacoes: observacoes || null,
          validade:    validade || null,
          data_emissao: hoje,
          status: 'emitida',
          // Billing
          valor_cobrado:        valorCobrado        || null,
          valor_medico:         valorMedico         || null,
          valor_coparticipacao: valorCoparticipacao || null,
        }),
      })
      const recData = await recRes.json()
      if (!recRes.ok || recData.error) {
        setErro(recData.error || 'Erro ao emitir receita.')
        setSalvando(false)
        return
      }

      // 2. Marcar solicitação como concluída
      await fetch('/api/renovacao/solicitar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: solicitacaoId, status: 'concluida', medico_id: medicoId }),
      })

      router.push('/medico/dashboard')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setSalvando(false)
    }
  }

  async function recusar() {
    if (!confirm('Confirma a recusa deste pedido de renovação?')) return
    setSalvando(true)
    await fetch('/api/renovacao/solicitar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: solicitacaoId, status: 'recusada', medico_id: medicoId }),
    })
    router.push('/medico/dashboard')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <h2 className="font-bold text-[#1A3A2C]">Emitir Receita</h2>
      <p className="text-xs text-gray-400">Revise e ajuste se necessário antes de emitir.</p>

      {/* Medicamentos */}
      <div>
        <label className="block text-sm font-semibold text-[#1A3A2C] mb-1.5">
          Medicamentos <span className="text-red-400">*</span>
        </label>
        <textarea
          value={medicamentos}
          onChange={e => setMedicamentos(e.target.value)}
          rows={4}
          placeholder="Um medicamento por linha…"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">Um medicamento por linha (nome + dosagem + posologia)</p>
      </div>

      {/* Instruções */}
      <div>
        <label className="block text-sm font-semibold text-[#1A3A2C] mb-1.5">
          Modo de uso / Instruções
        </label>
        <textarea
          value={instrucoes}
          onChange={e => setInstrucoes(e.target.value)}
          rows={2}
          placeholder="Ex: 1 comprimido ao dia, em jejum…"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none"
        />
      </div>

      {/* Validade */}
      <div>
        <label className="block text-sm font-semibold text-[#1A3A2C] mb-1.5">
          Data de validade da receita <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="date"
          value={validade}
          onChange={e => setValidade(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
        />
        <p className="text-xs text-gray-400 mt-1">Prazo de validade para uso da receita pelo paciente</p>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-semibold text-[#1A3A2C] mb-1.5">
          Observações internas <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Notas internas do médico…"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none"
        />
      </div>

      {/* Resumo de cobrança */}
      {(valorCobrado > 0 || valorMedico > 0) && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Cobrança desta renovação</p>
          </div>
          {valorMedico > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Seu ganho (custo médico)</span>
              <span className="font-bold text-green-700">{formatBRL(valorMedico)}</span>
            </div>
          )}
          {valorCobrado > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Cobrado da empresa</span>
              <span className="font-semibold text-gray-700">{formatBRL(valorCobrado)}</span>
            </div>
          )}
          {valorCoparticipacao > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Co-participação do funcionário ({percentualCopart}%)</span>
              <span className="font-semibold text-orange-600">{formatBRL(valorCoparticipacao)}</span>
            </div>
          )}
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={recusar}
          disabled={salvando}
          className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-500 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
        >
          Recusar pedido
        </button>
        <button
          onClick={emitirReceita}
          disabled={salvando}
          className="flex-[2] bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {salvando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Emitindo…</>
            : <><CheckCircle2 className="w-4 h-4" /> Emitir Receita</>
          }
        </button>
      </div>
    </div>
  )
}
