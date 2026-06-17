'use client'

import { useState } from 'react'
import { Loader2, Pill, Download, CheckCircle2, X, AlertCircle } from 'lucide-react'
import { imprimirReceita, type ReceitaHTMLParams } from '@/lib/receitaHTML'
import { type Medicamento, buscarMedicamentos, medicamentoLabel, posologiasSugeridas, unidadeQuantidade } from '@/lib/medicamentos'

interface ReceitaFormProps {
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
  onSalvo?: (receita: any) => void
}

type TipoReceita = 'simples' | 'especial' | 'antimicrobiano'

const TIPOS: { value: TipoReceita; label: string; desc: string }[] = [
  { value: 'simples',        label: 'Receita Simples',            desc: 'Medicamentos sem controle especial' },
  { value: 'especial',       label: 'Receita Especial',           desc: 'Medicamentos controlados (2 vias)' },
  { value: 'antimicrobiano', label: 'Antimicrobiano (2 vias)',     desc: 'Antibióticos e antimicrobianos' },
]

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function ReceitaForm({ atendimentoId, pacienteId, paciente, medico, onFechar, onSalvo }: ReceitaFormProps) {
  const hoje = new Date().toISOString().split('T')[0]

  const [tipo, setTipo] = useState<TipoReceita>('simples')
  // Tipo forçado por medicamento controlado detectado via autocomplete
  // 'especial' tem prioridade sobre 'antimicrobiano'
  const [tipoForcado, setTipoForcado] = useState<TipoReceita | null>(null)
  const [medicamentos, setMedicamentos] = useState('')

  // Autocomplete de medicamentos
  const [buscaMed, setBuscaMed] = useState('')
  const [sugestoes, setSugestoes] = useState<Medicamento[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)

  // Painel de posologia do medicamento selecionado
  const [medSelecionado, setMedSelecionado] = useState<Medicamento | null>(null)
  const [qtyMed, setQtyMed] = useState(1)
  const [posologia, setPosologia] = useState('')

  const [conflito, setConflito] = useState<string | null>(null)

  function fecharPainel() {
    setMedSelecionado(null)
    setQtyMed(1)
    setPosologia('')
    setBuscaMed('')
    setSugestoes([])
    setMostrarSugestoes(false)
    setConflito(null)
  }

  function adicionarMedicamento() {
    if (!medSelecionado || !posologia.trim()) return

    const novoControle = medSelecionado.controle ?? null

    // ── Bloquear conflito: controlado + antimicrobiano = receitas separadas ──
    if (tipoForcado === 'especial' && novoControle === 'antimicrobiano') {
      setConflito(
        'Medicamento controlado e antimicrobiano não podem estar na mesma receita ' +
        '(Portaria 344/98 + RDC 20/2011). Emita receitas separadas.'
      )
      return
    }
    if (tipoForcado === 'antimicrobiano' && novoControle === 'especial') {
      setConflito(
        'Medicamento controlado e antimicrobiano não podem estar na mesma receita ' +
        '(Portaria 344/98 + RDC 20/2011). Emita receitas separadas.'
      )
      return
    }
    setConflito(null)

    // ── Detectar medicamento controlado e forçar tipo correto ────────────────
    if (medSelecionado.controle) {
      // 'especial' tem prioridade máxima; 'antimicrobiano' só se não há especial
      const novoForcado: TipoReceita =
        medSelecionado.controle === 'especial' ? 'especial'
        : tipoForcado === 'especial' ? 'especial'
        : 'antimicrobiano'
      setTipoForcado(novoForcado)
      setTipo(novoForcado)
    }

    const unidade = unidadeQuantidade(medSelecionado.forma)
    // Campo interno (analytics): nome + concentração + quantidade
    const linhaInterna = `${medSelecionado.principio} ${medSelecionado.concentracao} — ${qtyMed} ${unidade}`
    // Campo impresso na receita: nome + concentração + quantidade + posologia
    const blocoImpresso = `${medSelecionado.principio} ${medSelecionado.concentracao} (${qtyMed} ${unidade}):\n${posologia.trim()}`
    setMedicamentos(prev => prev ? `${prev}\n${linhaInterna}` : linhaInterna)
    setInstrucoes(prev => prev ? `${prev}\n\n${blocoImpresso}` : blocoImpresso)
    fecharPainel()
  }
  const [instrucoes, setInstrucoes] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [receitaSalva, setReceitaSalva] = useState<any>(null)
  const [erro, setErro] = useState('')

  const params: ReceitaHTMLParams = {
    paciente, medico, tipo,
    medicamentos: medicamentos || '(sem medicamentos)',
    instrucoes,
    observacoes: observacoes || null,
    dataEmissao: hoje,
  }

  async function salvar() {
    if (!medicamentos.trim()) return
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/medico/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          atendimento_id: atendimentoId,
          tipo,
          tem_controlado: tipoForcado !== null,
          medicamentos: medicamentos.trim(),
          instrucoes: instrucoes.trim() || null,
          observacoes: observacoes.trim() || null,
          data_emissao: hoje,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSalvo(true)
      setReceitaSalva(data.receita)
      onSalvo?.(data.receita)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function previa() {
    imprimirReceita(params)
  }

  if (salvo) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold text-sm">Receita salva com sucesso!</p>
        </div>
        <p className="text-xs text-green-600">
          {TIPOS.find(t => t.value === tipo)?.label} — {paciente.nome}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => imprimirReceita(params)}
            className="flex items-center gap-1.5 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Imprimir / Baixar
          </button>
          <button
            onClick={() => { setSalvo(false); setMedicamentos(''); setInstrucoes(''); setObservacoes(''); setConflito(null); setTipoForcado(null); setTipo('simples') }}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Pill className="w-3.5 h-3.5" /> Nova receita
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
            <Pill className="w-4 h-4 text-[#5BBD9B]" /> Emitir Receita
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

      {/* Tipo */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Tipo de receita</label>

        {/* Banner: medicamento controlado detectado */}
        {tipoForcado === 'especial' && (
          <div className="mb-2 flex items-start gap-2 bg-red-50 border border-red-300 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">Medicamento controlado detectado</p>
              <p className="text-xs text-red-600 mt-0.5">
                Portaria 344/98 — exige <strong>Receita de Controle Especial (2 vias)</strong>. Receita Simples não é permitida.
              </p>
            </div>
          </div>
        )}
        {tipoForcado === 'antimicrobiano' && (
          <div className="mb-2 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Antimicrobiano detectado</p>
              <p className="text-xs text-amber-600 mt-0.5">
                RDC 20/2011 — exige <strong>Receita de Antimicrobiano (2 vias)</strong>. Receita Simples não é permitida.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-1.5">
          {TIPOS.map(t => {
            // Bloquear opções incompatíveis com o tipo forçado pelo medicamento
            const bloqueado =
              tipoForcado === 'especial' ? t.value !== 'especial'
              : tipoForcado === 'antimicrobiano' ? t.value === 'simples'
              : false
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { if (!bloqueado) setTipo(t.value) }}
                disabled={bloqueado}
                title={bloqueado ? 'Não permitido com o medicamento selecionado' : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors ${
                  bloqueado
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100 text-gray-400'
                    : tipo === t.value
                    ? 'bg-[#1A3A2C] border-[#1A3A2C] text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${tipo === t.value && !bloqueado ? 'bg-white border-white' : 'border-gray-300'}`} />
                <div>
                  <p className={`text-xs font-semibold ${tipo === t.value && !bloqueado ? 'text-white' : 'text-gray-700'}`}>{t.label}</p>
                  <p className={`text-xs ${tipo === t.value && !bloqueado ? 'text-green-200' : 'text-gray-400'}`}>{t.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Campo de busca com autocomplete */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs font-medium text-gray-600">Buscar medicamento</label>
          <span className="text-[10px] text-gray-400">(selecione para adicionar à receita)</span>
        </div>
        <div className="relative">
          <input
            type="text"
            value={buscaMed}
            onChange={e => {
              setBuscaMed(e.target.value)
              setSugestoes(buscarMedicamentos(e.target.value))
              setMostrarSugestoes(true)
            }}
            onFocus={() => { if (buscaMed.length >= 2) setMostrarSugestoes(true) }}
            onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
            placeholder="Digite nome do medicamento ou princípio ativo... ex: losartana, omeprazol"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] pr-8"
            autoComplete="off"
          />
          {buscaMed && (
            <button
              onClick={() => { setBuscaMed(''); setSugestoes([]); setMostrarSugestoes(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown de sugestões */}
        {mostrarSugestoes && sugestoes.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {sugestoes.map((med, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => {
                  // Abre o painel de quantidade + posologia
                  setMedSelecionado(med)
                  setQtyMed(1)
                  setPosologia('')
                  setBuscaMed('')
                  setSugestoes([])
                  setMostrarSugestoes(false)
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#F0F9F5] border-b border-gray-50 last:border-0 transition-colors"
              >
                <p className="text-sm font-medium text-[#1A3A2C]">{med.principio} {med.concentracao}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {med.forma}
                  {med.comerciais && med.comerciais.length > 0 && (
                    <span className="ml-2 text-[#5BBD9B]">· {med.comerciais.slice(0, 2).join(', ')}</span>
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Painel inline: quantidade + posologia do medicamento selecionado */}
      {medSelecionado && (
        <div className="border border-[#5BBD9B] bg-[#F0F9F5] rounded-xl p-3 space-y-3">
          {/* Medicamento selecionado */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#1A3A2C]">{medicamentoLabel(medSelecionado)}</p>
            {medSelecionado.controle === 'especial' && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                ⚠ CONTROLADO — Receita Especial
              </span>
            )}
            {medSelecionado.controle === 'antimicrobiano' && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                ⚠ ANTIMICROBIANO — 2 vias
              </span>
            )}
          </div>

          {/* Quantidade */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Quantidade:</label>
            <button
              type="button"
              onClick={() => setQtyMed(q => Math.max(1, q - 1))}
              className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-[#5BBD9B] hover:text-[#1A3A2C] text-sm font-bold transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-[#1A3A2C] tabular-nums">{qtyMed}</span>
            <button
              type="button"
              onClick={() => setQtyMed(q => q + 1)}
              className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:border-[#5BBD9B] hover:text-[#1A3A2C] text-sm font-bold transition-colors"
            >
              +
            </button>
            <span className="text-xs text-gray-500">{unidadeQuantidade(medSelecionado.forma)}</span>
          </div>

          {/* Posologia — chips de sugestão */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Posologia</label>
            <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto pr-1">
              {posologiasSugeridas(medSelecionado.forma).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosologia(p)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                    posologia === p
                      ? 'bg-[#1A3A2C] border-[#1A3A2C] text-white font-semibold'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#1A3A2C] hover:text-[#1A3A2C]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={posologia}
              onChange={e => setPosologia(e.target.value)}
              placeholder="ou digite a posologia manualmente..."
              autoComplete="off"
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
            />
          </div>

          {/* Conflito: controlado + antimicrobiano */}
          {conflito && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700">Receitas separadas obrigatórias</p>
                <p className="text-xs text-red-600 mt-0.5">{conflito}</p>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={adicionarMedicamento}
              disabled={!posologia.trim()}
              className="flex-1 bg-[#1A3A2C] hover:bg-[#5BBD9B] disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              + Adicionar à receita
            </button>
            <button
              type="button"
              onClick={fecharPainel}
              className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Medicamentos */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Medicamentos prescritos <span className="text-red-400">*</span>{' '}
          <span className="text-[10px] text-gray-400 font-normal">(controle interno — não impresso na receita)</span>
        </label>
        <textarea
          value={medicamentos}
          onChange={e => setMedicamentos(e.target.value)}
          rows={4}
          placeholder="Preenchido automaticamente ao adicionar medicamentos acima. Você pode editar."
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none font-mono text-xs leading-relaxed ${!medicamentos.trim() ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
        />
        {!medicamentos.trim() && <p className="text-red-400 text-xs mt-1">Informe ao menos um medicamento</p>}
        <p className="text-gray-400 text-xs mt-1">Somente para controle interno e relatórios — não aparece na receita impressa.</p>
      </div>

      {/* Instruções */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Modo de uso / Instruções{' '}
          <span className="text-[10px] text-[#5BBD9B] font-normal">(impresso na receita)</span>
        </label>
        <textarea
          value={instrucoes}
          onChange={e => setInstrucoes(e.target.value)}
          rows={5}
          placeholder={`Preenchido automaticamente ao adicionar medicamentos. Ex:\nDipirona Monoidratada 500mg:\n1 comprimido de 6 em 6 horas, por 5 dias`}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observações <span className="text-gray-400">(opcional)</span></label>
        <input
          type="text"
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          placeholder="Observações adicionais..."
          autoComplete="off"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
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
          disabled={salvando || !medicamentos.trim()}
          className="flex-1 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Pill className="w-4 h-4" /> Salvar receita</>}
        </button>
        <button
          onClick={previa}
          disabled={!medicamentos.trim()}
          title="Prévia do documento (sem salvar)"
          className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center">O ícone de download gera uma prévia sem salvar no sistema.</p>
    </div>
  )
}
