'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, Loader2, AlertTriangle, CheckCircle2,
  XCircle, FileText, BarChart2, ClipboardList, Activity,
  Calendar, Users, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react'
import ActionButtons from '@/components/ActionButtons'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtMes(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
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

// ── Semáforo de compliance ────────────────────────────────────────────────────
function Semaforo({ status, alertas }: { status: 'verde' | 'amarelo' | 'vermelho'; alertas: string[] }) {
  const cfg = {
    verde: {
      bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500',
      text: 'text-emerald-700', icon: CheckCircle2,
      titulo: 'Conformidade NR-1 em dia',
      descricao: 'Sua empresa está com a documentação de gestão de riscos psicossociais atualizada.',
    },
    amarelo: {
      bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400',
      text: 'text-amber-700', icon: AlertTriangle,
      titulo: 'Atenção necessária',
      descricao: 'Há itens pendentes que precisam ser resolvidos para manter a conformidade.',
    },
    vermelho: {
      bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500',
      text: 'text-red-700', icon: XCircle,
      titulo: 'Conformidade em risco',
      descricao: 'Sua empresa pode estar exposta a penalidades. Ação imediata recomendada.',
    },
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
                  <span className="mt-1 shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Badge de status do plano ─────────────────────────────────────────────────
function StatusBadge({ status, prazo }: { status: string; prazo?: string | null }) {
  const vencido = status === 'pendente' && prazo && new Date(prazo) < new Date()
  if (vencido) return (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Vencido</span>
  )
  const cfg: Record<string, string> = {
    pendente: 'bg-amber-100 text-amber-700',
    em_andamento: 'bg-blue-100 text-blue-700',
    concluido: 'bg-emerald-100 text-emerald-700',
    cancelado: 'bg-gray-100 text-gray-500',
  }
  const label: Record<string, string> = {
    pendente: 'Pendente', em_andamento: 'Em andamento',
    concluido: 'Concluído', cancelado: 'Cancelado',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {label[status] ?? status}
    </span>
  )
}

// ── Nível de risco badge ──────────────────────────────────────────────────────
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
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg[k] ?? 'bg-gray-100 text-gray-500'}`}>
      {label[k] ?? k}
    </span>
  )
}

// ── Card genérico ─────────────────────────────────────────────────────────────
function Card({ title, sub, children, className = '' }: {
  title: string; sub?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-50 ${className}`}>
      <div className="mb-4">
        <h3 className="font-bold text-[#1A3A2C] text-sm">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Modal Gerar PGR ───────────────────────────────────────────────────────────
function ModalGerarPGR({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar() {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/empresa/pgr/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assinante_nome: nome,
          assinante_cargo: cargo,
          periodo_referencia: new Date().toISOString().slice(0, 7) + '-01',
        }),
      })
      if (!res.ok) throw new Error('Erro ao gerar PGR.')
      onSuccess()
      onClose()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-bold text-[#1A3A2C] text-base mb-1">Gerar nova versão do PGR</h2>
        <p className="text-xs text-gray-400 mb-5">
          O documento será gerado com todos os dados de mapeamento, planos de ação e monitoramentos registrados até agora.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do responsável</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Cargo</label>
            <input
              type="text"
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              placeholder="Ex: Diretor de RH"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
            />
          </div>
        </div>

        {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={gerar}
            disabled={carregando}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#1A3A2C' }}
          >
            {carregando ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : 'Gerar PGR'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function Nr1Dashboard() {
  const [data, setData] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalPGR, setModalPGR] = useState(false)
  const [expandePlanos, setExpandePlanos] = useState(false)
  const [expandeHistorico, setExpandeHistorico] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/empresa/nr1/status')
      if (!res.ok) throw new Error('Erro ao carregar dados de compliance NR-1.')
      setData(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (carregando) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando status NR-1...</span>
    </div>
  )

  if (erro) return (
    <div className="text-center py-16 text-red-500 text-sm">{erro}</div>
  )

  if (!data) return null

  const { kpis: k, mapeamentos, planos, monitoramentos, versoes, resumoTriagem } = data

  const planosVisiveis = expandePlanos ? planos : planos.slice(0, 5)
  const historicoVisivel = expandeHistorico ? versoes : versoes.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Modal */}
      {modalPGR && (
        <ModalGerarPGR
          onClose={() => setModalPGR(false)}
          onSuccess={carregar}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#5BBD9B]" />
            Compliance NR-1 — Riscos Psicossociais
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Portaria MTE 1.419/2024 · Vigência com multas a partir de maio/2026
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActionButtons onRefresh={carregar} />
          <button
            onClick={() => setModalPGR(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#1A3A2C' }}
          >
            <FileText className="w-4 h-4" />
            Gerar PGR
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
        <KpiCard
          label="Monitoramentos"
          value={k.monitoramentosAno}
          sub={k.ultimaRevisao ? `último: ${fmtData(k.ultimaRevisao)}` : 'nenhum registrado'}
          icon={Activity}
          color="#F59E0B"
        />
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
            <p className="text-xs text-gray-500">
              Gerado em {fmtData(k.pgrVigente.gerado_em)}
              {k.pgrVigente.assinante_nome && ` · ${k.pgrVigente.assinante_nome}`}
            </p>
            <p className="text-[10px] text-gray-300 font-mono truncate mt-0.5">
              SHA-256: {k.pgrVigente.hash_sha256}
            </p>
          </div>
          <button
            onClick={() => setModalPGR(true)}
            className="text-xs font-semibold text-[#5BBD9B] hover:underline shrink-0"
          >
            Gerar nova versão
          </button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700">Nenhum PGR gerado ainda</p>
            <p className="text-xs text-amber-600 mt-0.5">
              O Programa de Gerenciamento de Riscos com seção psicossocial precisa ser formalizado.
            </p>
          </div>
          <button
            onClick={() => setModalPGR(true)}
            className="text-xs font-semibold text-amber-700 border border-amber-300 rounded-xl px-3 py-1.5 hover:bg-amber-100 transition-colors shrink-0"
          >
            Gerar agora
          </button>
        </div>
      )}

      {/* Mapeamento por setor */}
      {mapeamentos.length > 0 && (
        <Card title="Mapeamento de Riscos por Setor" sub="Inventário de fatores psicossociais identificados">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Setor</th>
                  <th className="px-4 py-2.5 text-left">Período</th>
                  <th className="px-4 py-2.5 text-left">Nível de Risco</th>
                  <th className="px-4 py-2.5 text-left">Exposto (%)</th>
                  <th className="px-4 py-2.5 text-left">Fatores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mapeamentos.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1A3A2C] text-xs">{m.setor}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtData(m.periodo_referencia)}</td>
                    <td className="px-4 py-3"><RiscoBadge nivel={m.nivel_risco_geral} /></td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {m.percentual_exposto != null ? `${m.percentual_exposto}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {(m.fatores_identificados ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(m.fatores_identificados as string[]).slice(0, 3).map((f: string, i: number) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                          {(m.fatores_identificados as string[]).length > 3 && (
                            <span className="text-[10px] text-gray-400">+{(m.fatores_identificados as string[]).length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">Não identificados</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Triagem dos funcionários */}
      {resumoTriagem.length > 0 && (
        <Card title="Resultado das Triagens dos Funcionários" sub="Dados anonimizados por setor — sem identificação individual">
          <div className="space-y-3">
            {resumoTriagem.map((r: any) => (
              <div key={r.setor} className="flex items-center gap-4">
                <span className="text-xs text-gray-600 w-32 shrink-0 truncate" title={r.setor}>{r.setor}</span>
                <div className="flex-1 flex rounded-full overflow-hidden h-2.5">
                  {r.percentualAlto > 0 && (
                    <div className="bg-red-400 h-full" style={{ width: `${r.percentualAlto}%` }}
                      title={`Alto: ${r.percentualAlto}%`} />
                  )}
                  {r.percentualMedio > 0 && (
                    <div className="bg-amber-300 h-full" style={{ width: `${r.percentualMedio}%` }}
                      title={`Médio: ${r.percentualMedio}%`} />
                  )}
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
          <p className="text-[10px] text-gray-300 mt-4">
            Os dados acima são resultado das triagens de saúde respondidas pelos funcionários. Nenhum dado individual é acessível.
          </p>
        </Card>
      )}

      {/* Plano de ação */}
      {planos.length > 0 && (
        <Card title="Plano de Ação" sub="Medidas de controle para os riscos identificados">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Setor</th>
                  <th className="px-4 py-2.5 text-left">Fator de Risco</th>
                  <th className="px-4 py-2.5 text-left">Medida</th>
                  <th className="px-4 py-2.5 text-left">Responsável</th>
                  <th className="px-4 py-2.5 text-left">Prazo</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {planosVisiveis.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-[#1A3A2C] font-medium">{p.setor ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate" title={p.fator_risco}>{p.fator_risco}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={p.medida_controle}>{p.medida_controle}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.responsavel_nome ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtData(p.prazo)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} prazo={p.prazo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {planos.length > 5 && (
            <button
              onClick={() => setExpandePlanos(!expandePlanos)}
              className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto"
            >
              {expandePlanos
                ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
                : <><ChevronDown className="w-3.5 h-3.5" /> Ver todos ({planos.length})</>}
            </button>
          )}
        </Card>
      )}

      {/* Sem dados — estado vazio */}
      {mapeamentos.length === 0 && planos.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-50">
          <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum dado de NR-1 registrado ainda</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Quando o mapeamento de riscos e o plano de ação forem cadastrados, eles aparecerão aqui para acompanhamento.
          </p>
        </div>
      )}

      {/* Monitoramentos recentes */}
      {monitoramentos.length > 0 && (
        <Card title="Registros de Monitoramento" sub="Últimos 12 meses">
          <div className="space-y-2">
            {monitoramentos.slice(0, 5).map((m: any) => (
              <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-2 h-2 rounded-full bg-[#5BBD9B] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#1A3A2C]">{fmtData(m.data_registro)}</span>
                    <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                      {{
                        revisao_periodica: 'Revisão periódica',
                        incidente: 'Incidente',
                        reavaliacao: 'Reavaliação',
                      }[m.tipo as string] ?? m.tipo}
                    </span>
                  </div>
                  {m.observacoes && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate" title={m.observacoes}>{m.observacoes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Histórico de versões do PGR */}
      {versoes.length > 0 && (
        <Card title="Histórico de versões do PGR" sub="Documentos gerados pela plataforma">
          <div className="space-y-2">
            {historicoVisivel.map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <FileText className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1A3A2C]">Versão {v.versao}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      v.status === 'vigente' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {v.status === 'vigente' ? 'Vigente' : v.status === 'substituido' ? 'Substituído' : 'Arquivado'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {fmtData(v.gerado_em)}
                    {v.assinante_nome && ` · ${v.assinante_nome}`}
                    {v.assinante_cargo && `, ${v.assinante_cargo}`}
                  </p>
                </div>
                <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
          {versoes.length > 3 && (
            <button
              onClick={() => setExpandeHistorico(!expandeHistorico)}
              className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto"
            >
              {expandeHistorico
                ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
                : <><ChevronDown className="w-3.5 h-3.5" /> Ver todas ({versoes.length})</>}
            </button>
          )}
        </Card>
      )}
    </div>
  )
}
