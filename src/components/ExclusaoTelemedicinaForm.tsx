'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react'

// ── Motivos CFM Res. 2.314/2022 ────────────────────────────────────────────────

const MOTIVOS_CFM = [
  'Sinal de alarme identificado na triagem',
  'Necessidade de exame físico presencial',
  'Procedimento que exige presença física',
  'Incapacidade de comunicação efetiva por via remota',
  'Condição clínica grave ou instável',
  'Emergência identificada durante o atendimento',
  'Suspeita de doença infecciosa de notificação compulsória',
  'Queixa psiquiátrica com risco de auto ou heteroagressão',
  'Paciente pediátrico sem acompanhante adequado',
  'Ausência de dispositivo ou conexão adequada pelo paciente',
  'Recusa de consentimento para atendimento por telemedicina',
  'Dificuldade de identificação segura do paciente',
  'Necessidade de coleta de material biológico',
  'Hipótese diagnóstica que requer confirmação presencial',
  'Solicitação do próprio paciente',
  'Outro',
]

const STATUS_OPTIONS = [
  {
    value: 'apto',
    label: 'Apto para atendimento online',
    cor:      'bg-green-50  border-green-300  text-green-800',
    corAtivo: 'bg-green-500  border-green-500  text-white',
  },
  {
    value: 'apto_ressalvas',
    label: 'Apto com ressalvas',
    cor:      'bg-yellow-50  border-yellow-300  text-yellow-800',
    corAtivo: 'bg-yellow-500 border-yellow-500 text-white',
  },
  {
    value: 'nao_apto',
    label: 'Não apto — atendimento presencial indicado',
    cor:      'bg-orange-50  border-orange-300  text-orange-800',
    corAtivo: 'bg-orange-500 border-orange-500 text-white',
  },
  {
    value: 'emergencia',
    label: 'Emergência — encaminhamento imediato',
    cor:      'bg-red-50   border-red-400    text-red-800',
    corAtivo: 'bg-red-600  border-red-600    text-white',
  },
]

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Props {
  atendimentoId: string | null
  pacienteId:    string
  onFechar:      () => void
  onSalvo:       () => void
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function ExclusaoTelemedicinaForm({ atendimentoId, pacienteId, onFechar, onSalvo }: Props) {
  const [status,       setStatus]       = useState('')
  const [motivos,      setMotivos]      = useState<string[]>([])
  const [motivoOutro,  setMotivoOutro]  = useState('')
  const [conduta,      setConduta]      = useState('')
  const [ciente,       setCiente]       = useState(false)
  const [observacoes,  setObservacoes]  = useState('')
  const [salvando,     setSalvando]     = useState(false)
  const [erro,         setErro]         = useState('')
  const [salvo,        setSalvo]        = useState(false)
  const [registro,     setRegistro]     = useState<any>(null)

  function toggleMotivo(m: string) {
    setMotivos(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  async function salvar() {
    if (!status)        { setErro('Selecione o status de elegibilidade.'); return }
    if (!conduta.trim()) { setErro('A conduta médica é obrigatória.');       return }
    setErro('')
    setSalvando(true)
    const res = await fetch('/api/medico/exclusao-telemedicina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atendimento_id:  atendimentoId ?? undefined,
        paciente_id:     pacienteId,
        status,
        motivos,
        motivo_outro:    motivoOutro.trim() || undefined,
        conduta:         conduta.trim(),
        ciente_paciente: ciente,
        observacoes:     observacoes.trim() || undefined,
      }),
    })
    setSalvando(false)
    if (!res.ok) {
      const d = await res.json()
      setErro(d.error ?? 'Erro ao salvar protocolo.')
      return
    }
    const data = await res.json()
    setRegistro(data)
    setSalvo(true)
    onSalvo()
  }

  // ── Tela de confirmação pós-salvo ──
  if (salvo && registro) {
    const op = STATUS_OPTIONS.find(s => s.value === registro.status)
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-green-700 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Protocolo registrado no prontuário
        </div>

        <div className={`border-2 rounded-xl px-4 py-3 ${op?.corAtivo ?? 'bg-gray-100'}`}>
          <p className="font-bold text-sm leading-tight">{op?.label}</p>
        </div>

        {registro.motivos?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Motivos registrados</p>
            <ul className="space-y-1">
              {(registro.motivos as string[]).map((m: string) => (
                <li key={m} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1" />
                  {m}
                </li>
              ))}
              {registro.motivo_outro && (
                <li className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1" />
                  Outro: {registro.motivo_outro}
                </li>
              )}
            </ul>
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Conduta</p>
          <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{registro.conduta}</p>
        </div>

        {registro.ciente_paciente && (
          <p className="text-xs text-green-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Paciente ciente da decisão médica
          </p>
        )}

        <button
          onClick={onFechar}
          className="w-full text-xs text-gray-400 hover:text-gray-600 py-1.5 border border-gray-200 rounded-lg transition-colors"
        >
          Fechar
        </button>
      </div>
    )
  }

  // ── Formulário ──
  return (
    <div className="space-y-4 text-sm">

      {/* Status de elegibilidade */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
          Status de elegibilidade *
        </p>
        <div className="space-y-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${
                status === opt.value ? opt.corAtivo : opt.cor
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Motivos */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
          Motivos de exclusão <span className="normal-case font-normal">(CFM Res. 2.314/2022)</span>
        </p>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-gray-100 rounded-xl p-2">
          {MOTIVOS_CFM.map(m => (
            <label key={m} className="flex items-start gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={motivos.includes(m)}
                onChange={() => toggleMotivo(m)}
                className="mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-400 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-gray-700 group-hover:text-gray-900 leading-tight">{m}</span>
            </label>
          ))}
        </div>
        {motivos.includes('Outro') && (
          <textarea
            value={motivoOutro}
            onChange={e => setMotivoOutro(e.target.value)}
            placeholder="Descreva o motivo..."
            rows={2}
            className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        )}
      </div>

      {/* Conduta */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
          Conduta médica *
        </label>
        <textarea
          value={conduta}
          onChange={e => setConduta(e.target.value)}
          placeholder="Orientações ao paciente, encaminhamentos, retorno, UPA/hospital de referência..."
          rows={3}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-orange-400 placeholder-gray-300"
        />
      </div>

      {/* Ciente do paciente */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={ciente}
          onChange={e => setCiente(e.target.checked)}
          className="rounded border-gray-300 text-green-600 focus:ring-green-400 cursor-pointer"
        />
        <span className="text-xs text-gray-700">Paciente ciente da decisão médica</span>
      </label>

      {/* Observações */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
          Observações <span className="normal-case font-normal">(opcional)</span>
        </label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          placeholder="Informações adicionais para o prontuário..."
          rows={2}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder-gray-300"
        />
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {erro}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs py-2.5 rounded-xl font-semibold transition-colors"
        >
          {salvando
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ShieldCheck className="w-3.5 h-3.5" />}
          Registrar no Prontuário
        </button>
        <button
          onClick={onFechar}
          className="px-3 py-2 border border-gray-200 text-gray-400 text-xs rounded-xl hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
