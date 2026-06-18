'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle,
  FileText, BarChart2, ClipboardList, Activity, Calendar,
  Users, ChevronDown, ChevronUp, Plus, Pencil, X, Download,
} from 'lucide-react'
import ActionButtons from '@/components/ActionButtons'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const FATORES_MTE = [
  'Sobrecarga de trabalho / prazos incompatíveis',
  'Baixa autonomia na execução das tarefas',
  'Ritmo imprevisível ou intensidade excessiva',
  'Trabalho em turnos ou horários atípicos',
  'Assédio moral ou sexual',
  'Falta de reconhecimento e valorização',
  'Liderança autoritária ou omissa',
  'Conflitos interpessoais frequentes',
  'Ruído excessivo ou ambiente físico inadequado',
  'Sistemas e ferramentas instáveis',
  'Espaço físico insuficiente',
  'Interrupções frequentes',
  'Cobrança fora do horário / hiperconectividade',
  'Trabalho remoto em isolamento',
  'Contato com público hostil ou situações de violência',
  'Instabilidade do emprego / reestruturações',
]

// ── Componentes base ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#1A3A2C] leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function Card({ title, sub, children, action }: {
  title: string; sub?: string; children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="font-bold text-[#1A3A2C] text-sm">{title}</h3>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status, prazo }: { status: string; prazo?: string | null }) {
  const vencido = status === 'pendente' && prazo && new Date(prazo) < new Date()
  if (vencido) return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Vencido</span>
  const cfg: Record<string, string> = {
    pendente: 'bg-amber-100 text-amber-700',
    em_andamento: 'bg-blue-100 text-blue-700',
    concluido: 'bg-emerald-100 text-emerald-700',
    cancelado: 'bg-gray-100 text-gray-500',
  }
  const label: Record<string, string> = {
    pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado',
  }
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg[status] ?? 'bg-gray-100 text-gray-500'}`}>{label[status] ?? status}</span>
}

function RiscoBadge({ nivel }: { nivel: string | null }) {
  const cfg: Record<string, string> = {
    nao_identificado: 'bg-gray-100 text-gray-500',
    baixo: 'bg-emerald-100 text-emerald-700',
    medio: 'bg-amber-100 text-amber-700',
    alto: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = {
    nao_identificado: 'Não identificado', baixo: 'Baixo', medio: 'Médio', alto: 'Alto',
  }
  const k = nivel ?? 'nao_identificado'
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg[k] ?? 'bg-gray-100 text-gray-500'}`}>{label[k] ?? k}</span>
}

// ── Semáforo ──────────────────────────────────────────────────────────────────
function Semaforo({ status, alertas }: { status: 'verde' | 'amarelo' | 'vermelho'; alertas: string[] }) {
  const cfg = {
    verde: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', icon: CheckCircle2, titulo: 'Conformidade NR-1 em dia', descricao: 'Sua empresa está com a documentação de riscos psicossociais atualizada.' },
    amarelo: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700', icon: AlertTriangle, titulo: 'Atenção necessária', descricao: 'Há itens pendentes que precisam ser resolvidos para manter a conformidade.' },
    vermelho: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700', icon: XCircle, titulo: 'Conformidade em risco', descricao: 'Sua empresa pode estar exposta a penalidades. Ação imediata recomendada.' },
  }[status]
  const Icon = cfg.icon
  return (
    <div className={`rounded-2xl p-6 border ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full ${cfg.dot} flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-base ${cfg.text}`}>{cfg.titulo}</h3>
          <p className={`text-sm mt-0.5 ${cfg.text} opacity-80`}>{cfg.descricao}</p>
          {alertas.length > 0 && (
            <ul className="mt-3 space-y-1">
              {alertas.map((a, i) => (
                <li key={i} className={`flex items-start gap-2 text-sm ${cfg.text}`}>
                  <span className="mt-1 shrink-0">•</span><span>{a}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#1A3A2C] text-base">{titulo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BtnSalvar({ carregando, label = 'Salvar' }: { carregando: boolean; label?: string }) {
  return (
    <button type="submit" disabled={carregando}
      className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
      style={{ background: '#1A3A2C' }}>
      {carregando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : label}
    </button>
  )
}

function BtnCancelar({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose}
      className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
      Cancelar
    </button>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]'
const labelCls = 'text-xs font-semibold text-gray-600 block mb-1'
const selectCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]'

// ── Modal: Mapeamento de Riscos ────────────────────────────────────────────────
function ModalMapeamento({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [setor, setSetor] = useState('')
  const [nivel, setNivel] = useState('medio')
  const [fatores, setFatores] = useState<string[]>([])
  const [exposto, setExposto] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  function toggleFator(f: string) {
    setFatores(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/empresa/nr1/mapeamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setor, nivel_risco_geral: nivel,
          fatores_identificados: fatores,
          percentual_exposto: exposto ? Number(exposto) : null,
          periodo_referencia: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar.')
      onSuccess(); onClose()
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal titulo="Mapear setor — Riscos Psicossociais" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Setor / Departamento *</label>
          <input className={inputCls} value={setor} onChange={e => setSetor(e.target.value)}
            placeholder="Ex: Comercial, TI, Operações..." required />
        </div>
        <div>
          <label className={labelCls}>Nível de risco identificado *</label>
          <select className={selectCls} value={nivel} onChange={e => setNivel(e.target.value)}>
            <option value="nao_identificado">Não identificado</option>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>% de funcionários expostos (estimativa)</label>
          <input className={inputCls} type="number" min="0" max="100" value={exposto}
            onChange={e => setExposto(e.target.value)} placeholder="Ex: 40" />
        </div>
        <div>
          <label className={labelCls}>Fatores de risco identificados (selecione todos que se aplicam)</label>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1 mt-1">
            {FATORES_MTE.map(f => (
              <label key={f} className="flex items-start gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={fatores.includes(f)} onChange={() => toggleFator(f)}
                  className="mt-0.5 shrink-0 accent-[#5BBD9B]" />
                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{f}</span>
              </label>
            ))}
          </div>
        </div>
        {erro && <p className="text-xs text-red-500">{erro}</p>}
        <div className="flex gap-3 pt-2">
          <BtnCancelar onClose={onClose} />
          <BtnSalvar carregando={loading} label="Salvar mapeamento" />
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Plano de Ação ──────────────────────────────────────────────────────
function ModalPlanoAcao({ onClose, onSuccess, setoresMapeados }: {
  onClose: () => void; onSuccess: () => void; setoresMapeados: string[]
}) {
  const [setor, setSetor] = useState('')
  const [fator, setFator] = useState('')
  const [medida, setMedida] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prazo, setPrazo] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/empresa/nr1/plano-acao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setor, fator_risco: fator, medida_controle: medida, responsavel_nome: responsavel, prazo }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar ação.')
      onSuccess(); onClose()
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal titulo="Nova ação do plano" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Setor</label>
          {setoresMapeados.length > 0 ? (
            <select className={selectCls} value={setor} onChange={e => setSetor(e.target.value)}>
              <option value="">Geral / toda a empresa</option>
              {setoresMapeados.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input className={inputCls} value={setor} onChange={e => setSetor(e.target.value)}
              placeholder="Ex: Comercial (opcional)" />
          )}
        </div>
        <div>
          <label className={labelCls}>Fator de risco a ser tratado *</label>
          <select className={selectCls} value={fator} onChange={e => setFator(e.target.value)} required>
            <option value="">Selecione...</option>
            {FATORES_MTE.map(f => <option key={f} value={f}>{f}</option>)}
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Medida de controle / ação *</label>
          <textarea className={`${inputCls} resize-none`} rows={3} value={medida}
            onChange={e => setMedida(e.target.value)} required
            placeholder="Descreva o que será feito para reduzir ou eliminar esse risco..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Responsável</label>
            <input className={inputCls} value={responsavel} onChange={e => setResponsavel(e.target.value)}
              placeholder="Nome ou cargo" />
          </div>
          <div>
            <label className={labelCls}>Prazo</label>
            <input className={inputCls} type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
          </div>
        </div>
        {erro && <p className="text-xs text-red-500">{erro}</p>}
        <div className="flex gap-3 pt-2">
          <BtnCancelar onClose={onClose} />
          <BtnSalvar carregando={loading} label="Adicionar ação" />
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Atualizar status da ação ───────────────────────────────────────────
function ModalStatusAcao({ plano, onClose, onSuccess }: {
  plano: any; onClose: () => void; onSuccess: () => void
}) {
  const [status, setStatus] = useState(plano.status)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/empresa/nr1/plano-acao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plano.id, status }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao atualizar.')
      onSuccess(); onClose()
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal titulo="Atualizar status da ação" onClose={onClose}>
      <div className="mb-4 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-400 mb-0.5">Ação</p>
        <p className="text-sm font-medium text-[#1A3A2C]">{plano.medida_controle}</p>
        {plano.fator_risco && <p className="text-xs text-gray-400 mt-1">Fator: {plano.fator_risco}</p>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Novo status</label>
          <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        {erro && <p className="text-xs text-red-500">{erro}</p>}
        <div className="flex gap-3 pt-2">
          <BtnCancelar onClose={onClose} />
          <BtnSalvar carregando={loading} label="Atualizar" />
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Monitoramento ──────────────────────────────────────────────────────
function ModalMonitoramento({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [tipo, setTipo] = useState('revisao_periodica')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/empresa/nr1/monitoramento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, data_registro: data, observacoes: obs }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao registrar.')
      onSuccess(); onClose()
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal titulo="Registrar monitoramento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Tipo de registro *</label>
          <select className={selectCls} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="revisao_periodica">Revisão periódica</option>
            <option value="reavaliacao">Reavaliação de riscos</option>
            <option value="incidente">Registro de incidente</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Data</label>
          <input className={inputCls} type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Observações</label>
          <textarea className={`${inputCls} resize-none`} rows={4} value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Descreva o que foi revisado, ações realizadas, conclusões..." />
        </div>
        {erro && <p className="text-xs text-red-500">{erro}</p>}
        <div className="flex gap-3 pt-2">
          <BtnCancelar onClose={onClose} />
          <BtnSalvar carregando={loading} label="Registrar" />
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Gerar PGR ──────────────────────────────────────────────────────────
function ModalGerarPGR({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar() {
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/empresa/pgr/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assinante_nome: nome, assinante_cargo: cargo, periodo_referencia: new Date().toISOString().slice(0, 7) + '-01' }),
      })
      if (!res.ok) throw new Error('Erro ao gerar PGR.')
      onSuccess(); onClose()
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal titulo="Gerar nova versão do PGR" onClose={onClose}>
      <p className="text-xs text-gray-400 mb-5">
        O documento será gerado com todos os dados de mapeamento, planos e monitoramentos registrados até agora.
      </p>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Nome do responsável</label>
          <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João Silva" />
        </div>
        <div>
          <label className={labelCls}>Cargo</label>
          <input className={inputCls} value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Diretor de RH" />
        </div>
      </div>
      {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
        <button onClick={gerar} disabled={loading}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#1A3A2C' }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : 'Gerar PGR'}
        </button>
      </div>
    </Modal>
  )
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function Nr1Dashboard() {
  const [data, setData] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modal, setModal] = useState<'mapeamento' | 'plano' | 'monitoramento' | 'pgr' | 'status' | null>(null)
  const [planoSelecionado, setPlanoSelecionado] = useState<any>(null)
  const [expandePlanos, setExpandePlanos] = useState(false)
  const [expandeHistorico, setExpandeHistorico] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('')
    try {
      const res = await fetch('/api/empresa/nr1/status')
      if (!res.ok) throw new Error('Erro ao carregar dados NR-1.')
      setData(await res.json())
    } catch (e: any) { setErro(e.message) }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirStatus(p: any) { setPlanoSelecionado(p); setModal('status') }

  if (carregando) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando status NR-1...</span>
    </div>
  )
  if (erro) return <div className="text-center py-16 text-red-500 text-sm">{erro}</div>
  if (!data) return null

  const { kpis: k, mapeamentos, planos, monitoramentos, versoes, resumoTriagem } = data
  const setoresMapeados = (mapeamentos as any[]).map((m: any) => m.setor)
  const planosVisiveis = expandePlanos ? planos : planos.slice(0, 5)
  const historicoVisivel = expandeHistorico ? versoes : versoes.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Modais */}
      {modal === 'mapeamento'  && <ModalMapeamento onClose={() => setModal(null)} onSuccess={carregar} />}
      {modal === 'plano'       && <ModalPlanoAcao onClose={() => setModal(null)} onSuccess={carregar} setoresMapeados={setoresMapeados} />}
      {modal === 'monitoramento' && <ModalMonitoramento onClose={() => setModal(null)} onSuccess={carregar} />}
      {modal === 'pgr'         && <ModalGerarPGR onClose={() => setModal(null)} onSuccess={carregar} />}
      {modal === 'status' && planoSelecionado && (
        <ModalStatusAcao plano={planoSelecionado} onClose={() => { setModal(null); setPlanoSelecionado(null) }} onSuccess={carregar} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#5BBD9B]" />
            Compliance NR-1 — Riscos Psicossociais
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Portaria MTE 1.419/2024 · Vigência com multas a partir de maio/2026</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionButtons onRefresh={carregar} />
          <button onClick={() => setModal('monitoramento')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <Activity className="w-4 h-4" /> Monitoramento
          </button>
          <button
            onClick={() => window.open('/empresa/pgr/imprimir', '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
          <button onClick={() => setModal('pgr')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#1A3A2C' }}>
            <FileText className="w-4 h-4" /> Gerar PGR
          </button>
        </div>
      </div>

      {/* Semáforo */}
      <Semaforo status={data.status_compliance} alertas={data.alertas} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Funcionários" value={k.totalFuncionarios} sub="ativos no sistema" icon={Users} color="#5BBD9B" />
        <KpiCard label="Setores Mapeados" value={k.setoresMapeados} sub="com avaliação de risco" icon={BarChart2} color="#3B82F6" />
        <KpiCard label="Ações no Plano" value={k.totalAcoes} sub={`${k.acoesConcluidas} concluída(s)`} icon={ClipboardList} color="#8B5CF6" />
        <KpiCard label="Monitoramentos" value={k.monitoramentosAno} sub={k.ultimaRevisao ? `último: ${fmtData(k.ultimaRevisao)}` : 'nenhum registrado'} icon={Activity} color="#F59E0B" />
      </div>

      {/* PGR vigente */}
      {k.pgrVigente ? (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">PGR Vigente</p>
              <p className="font-bold text-[#1A3A2C]">Versão {k.pgrVigente.versao}</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Gerado em {fmtData(k.pgrVigente.gerado_em)}{k.pgrVigente.assinante_nome && ` · ${k.pgrVigente.assinante_nome}`}</p>
            <p className="text-[10px] text-gray-300 font-mono truncate mt-0.5">SHA-256: {k.pgrVigente.hash_sha256}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => window.open('/empresa/pgr/imprimir', '_blank')}
              className="flex items-center gap-1 text-xs font-semibold text-[#5BBD9B] hover:underline">
              <Download className="w-3 h-3" /> PDF
            </button>
            <button onClick={() => setModal('pgr')} className="text-xs font-semibold text-gray-400 hover:underline">
              Nova versão
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700">Nenhum PGR gerado ainda</p>
            <p className="text-xs text-amber-600 mt-0.5">O Programa de Gerenciamento de Riscos com seção psicossocial precisa ser formalizado.</p>
          </div>
          <button onClick={() => setModal('pgr')}
            className="text-xs font-semibold text-amber-700 border border-amber-300 rounded-xl px-3 py-1.5 hover:bg-amber-100 transition-colors shrink-0">
            Gerar agora
          </button>
        </div>
      )}

      {/* Mapeamento por setor */}
      <Card
        title="Mapeamento de Riscos por Setor"
        sub="Inventário de fatores psicossociais identificados por departamento"
        action={
          <button onClick={() => setModal('mapeamento')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" /> Mapear setor
          </button>
        }
      >
        {mapeamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Setor</th>
                  <th className="px-4 py-2.5 text-left">Nível</th>
                  <th className="px-4 py-2.5 text-left">Exposto</th>
                  <th className="px-4 py-2.5 text-left">Fatores identificados</th>
                  <th className="px-4 py-2.5 text-left">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(mapeamentos as any[]).map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1A3A2C] text-xs">{m.setor}</td>
                    <td className="px-4 py-3"><RiscoBadge nivel={m.nivel_risco_geral} /></td>
                    <td className="px-4 py-3 text-xs text-gray-700">{m.percentual_exposto != null ? `${m.percentual_exposto}%` : '—'}</td>
                    <td className="px-4 py-3">
                      {(m.fatores_identificados ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(m.fatores_identificados as string[]).slice(0, 2).map((f: string, i: number) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                          {(m.fatores_identificados as string[]).length > 2 && (
                            <span className="text-[10px] text-gray-400 self-center">+{(m.fatores_identificados as string[]).length - 2}</span>
                          )}
                        </div>
                      ) : <span className="text-xs text-gray-300">Não identificados</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtData(m.atualizado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum setor mapeado ainda</p>
            <button onClick={() => setModal('mapeamento')}
              className="text-sm font-medium text-[#5BBD9B] hover:underline mt-1">
              Mapear primeiro setor →
            </button>
          </div>
        )}
      </Card>

      {/* Triagem dos funcionários */}
      {resumoTriagem.length > 0 && (
        <Card title="Resultado das Triagens dos Funcionários" sub="Dados anonimizados por setor — sem identificação individual">
          <div className="space-y-3">
            {(resumoTriagem as any[]).map((r: any) => (
              <div key={r.setor} className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-32 shrink-0 truncate" title={r.setor}>{r.setor}</span>
                <div className="flex-1 flex rounded-full overflow-hidden h-2.5">
                  {r.percentualAlto > 0 && <div className="bg-red-400 h-full" style={{ width: `${r.percentualAlto}%` }} title={`Alto: ${r.percentualAlto}%`} />}
                  {r.percentualMedio > 0 && <div className="bg-amber-300 h-full" style={{ width: `${r.percentualMedio}%` }} title={`Médio: ${r.percentualMedio}%`} />}
                  <div className="bg-emerald-200 h-full flex-1" title="Baixo" />
                </div>
                <div className="flex gap-2 shrink-0 text-[10px]">
                  {r.percentualAlto > 0 && <span className="text-red-500 font-semibold">{r.percentualAlto}% alto</span>}
                  {r.percentualMedio > 0 && <span className="text-amber-500 font-semibold">{r.percentualMedio}% médio</span>}
                  <span className="text-gray-400">{r.total} resp.</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-300 mt-4">Dados das triagens respondidas pelos funcionários. Nenhum dado individual é acessível.</p>
        </Card>
      )}

      {/* Plano de ação */}
      <Card
        title="Plano de Ação"
        sub="Medidas de controle para os riscos identificados"
        action={
          <button onClick={() => setModal('plano')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" /> Nova ação
          </button>
        }
      >
        {planos.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Setor</th>
                    <th className="px-4 py-2.5 text-left">Medida</th>
                    <th className="px-4 py-2.5 text-left">Responsável</th>
                    <th className="px-4 py-2.5 text-left">Prazo</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(planosVisiveis as any[]).map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-[#1A3A2C] font-medium">{p.setor ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[220px]">
                        <p className="truncate" title={p.medida_controle}>{p.medida_controle}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5" title={p.fator_risco}>{p.fator_risco}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.responsavel_nome ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtData(p.prazo)}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} prazo={p.prazo} /></td>
                      <td className="px-4 py-3">
                        {p.status !== 'concluido' && p.status !== 'cancelado' && (
                          <button onClick={() => abrirStatus(p)}
                            className="text-gray-400 hover:text-[#1A3A2C] transition-colors p-1 rounded-lg hover:bg-gray-100"
                            title="Atualizar status">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {planos.length > 5 && (
              <button onClick={() => setExpandePlanos(!expandePlanos)}
                className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto">
                {expandePlanos ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver todos ({planos.length})</>}
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma ação cadastrada ainda</p>
            <button onClick={() => setModal('plano')} className="text-sm font-medium text-[#5BBD9B] hover:underline mt-1">
              Criar primeira ação →
            </button>
          </div>
        )}
      </Card>

      {/* Monitoramentos */}
      <Card
        title="Registros de Monitoramento"
        sub="Últimos 12 meses"
        action={
          <button onClick={() => setModal('monitoramento')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" /> Registrar
          </button>
        }
      >
        {monitoramentos.length > 0 ? (
          <div className="space-y-2">
            {(monitoramentos as any[]).slice(0, 5).map((m: any) => (
              <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-2 h-2 rounded-full bg-[#5BBD9B] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#1A3A2C]">{fmtData(m.data_registro)}</span>
                    <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                      {{ revisao_periodica: 'Revisão periódica', incidente: 'Incidente', reavaliacao: 'Reavaliação' }[m.tipo as string] ?? m.tipo}
                    </span>
                  </div>
                  {m.observacoes && <p className="text-xs text-gray-500 mt-0.5">{m.observacoes}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum monitoramento registrado ainda</p>
            <button onClick={() => setModal('monitoramento')} className="text-sm font-medium text-[#5BBD9B] hover:underline mt-1">
              Registrar primeira revisão →
            </button>
          </div>
        )}
      </Card>

      {/* Histórico PGR */}
      {versoes.length > 0 && (
        <Card title="Histórico de versões do PGR" sub="Documentos gerados pela plataforma">
          <div className="space-y-2">
            {(historicoVisivel as any[]).map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <FileText className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1A3A2C]">Versão {v.versao}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${v.status === 'vigente' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {v.status === 'vigente' ? 'Vigente' : 'Substituído'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {fmtData(v.gerado_em)}{v.assinante_nome && ` · ${v.assinante_nome}`}{v.assinante_cargo && `, ${v.assinante_cargo}`}
                  </p>
                </div>
                <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
          {versoes.length > 3 && (
            <button onClick={() => setExpandeHistorico(!expandeHistorico)}
              className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto">
              {expandeHistorico ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver todos ({versoes.length})</>}
            </button>
          )}
        </Card>
      )}
    </div>
  )
}
