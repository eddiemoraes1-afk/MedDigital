'use client'

import { useEffect, useState } from 'react'
import {
  X, Loader2, User, AlertTriangle, Activity, ClipboardList,
  Pill, FlaskConical, FileText, ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Props {
  pacienteId: string
  onFechar: () => void
}

const COR_RISCO: Record<string, string> = {
  verde:    'bg-green-500/20 text-green-300 border-green-500/30',
  amarelo:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  laranja:  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  vermelho: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const LABEL_RISCO: Record<string, string> = {
  verde: '🟢 Baixo', amarelo: '🟡 Moderado',
  laranja: '🟠 Alto', vermelho: '🔴 Urgência',
}

const STATUS_EXCL: Record<string, string> = {
  apto: '✅ Apto', apto_ressalvas: '⚠️ Apto c/ ressalvas',
  nao_apto: '❌ Não apto', emergencia: '🚨 Emergência',
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

function fmtDH(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function calcIdade(nasc: string | null) {
  if (!nasc) return null
  const n = new Date(nasc)
  const hoje = new Date()
  let idade = hoje.getFullYear() - n.getFullYear()
  const m = hoje.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) idade--
  return idade
}

function Secao({ titulo, icone, count, children }: {
  titulo: string; icone: React.ReactNode; count?: number; children: React.ReactNode
}) {
  const [aberto, setAberto] = useState(true)
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-green-200 uppercase tracking-wide">
          {icone} {titulo}
          {count !== undefined && count > 0 && (
            <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">{count}</span>
          )}
        </span>
        {aberto
          ? <ChevronUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-green-400 shrink-0" />}
      </button>
      {aberto && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  )
}

export default function ProntuarioDrawer({ pacienteId, onFechar }: Props) {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/medico/prontuario-inline/${pacienteId}`)
      .then(r => r.json())
      .then(setDados)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [pacienteId])

  return (
    <div className="absolute inset-y-0 left-0 w-[400px] z-20 flex flex-col bg-[#0F2318] border-r border-white/10 shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1A3A2C] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#5BBD9B]" />
          <span className="text-sm font-bold text-white">Prontuário do Paciente</span>
        </div>
        <button
          onClick={onFechar}
          className="text-green-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#5BBD9B]" />
            <p className="text-xs text-green-300">Carregando prontuário...</p>
          </div>
        ) : !dados ? (
          <div className="p-6 text-center text-green-400 text-sm">Erro ao carregar dados.</div>
        ) : (
          <>
            {/* Dados do paciente */}
            <div className="px-4 py-3 bg-[#1A3A2C]/60 border-b border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#5BBD9B]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-[#5BBD9B]" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">{dados.paciente?.nome ?? '—'}</p>
                  <p className="text-green-300 text-xs mt-0.5">
                    {dados.paciente?.data_nascimento
                      ? `${calcIdade(dados.paciente.data_nascimento)} anos • Nasc. ${fmt(dados.paciente.data_nascimento + 'T12:00:00')}`
                      : ''}
                    {dados.paciente?.sexo ? ` • ${dados.paciente.sexo}` : ''}
                  </p>
                  {dados.paciente?.cpf && (
                    <p className="text-green-400 text-xs">CPF: {dados.paciente.cpf}</p>
                  )}
                  {dados.paciente?.telefone && (
                    <p className="text-green-400 text-xs">{dados.paciente.telefone}</p>
                  )}
                </div>
              </div>

              {/* Alertas de antecedentes */}
              {(dados.paciente?.alergias || dados.paciente?.hpp || dados.paciente?.medicamentos_em_uso) && (
                <div className="mt-3 space-y-1.5 bg-amber-900/30 rounded-xl p-3 border border-amber-700/30">
                  {dados.paciente?.alergias && (
                    <p className="text-xs text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span><strong>Alergias:</strong> {dados.paciente.alergias}</span>
                    </p>
                  )}
                  {dados.paciente?.hpp && (
                    <p className="text-xs text-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
                      <span><strong>HPP:</strong> {dados.paciente.hpp}</span>
                    </p>
                  )}
                  {dados.paciente?.medicamentos_em_uso && (
                    <p className="text-xs text-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
                      <span><strong>Uso contínuo:</strong> {dados.paciente.medicamentos_em_uso}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Triagens */}
            <Secao titulo="Triagens" icone={<Activity className="w-3.5 h-3.5" />} count={dados.triagens?.length}>
              {dados.triagens?.length === 0 ? (
                <p className="text-xs text-green-500 italic">Nenhuma triagem registrada.</p>
              ) : dados.triagens?.map((t: any) => (
                <div key={t.id} className="bg-white/5 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-green-400">{fmtDH(t.criado_em)}</span>
                    {t.classificacao_risco && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COR_RISCO[t.classificacao_risco] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                        {LABEL_RISCO[t.classificacao_risco] ?? t.classificacao_risco}
                      </span>
                    )}
                  </div>
                  {t.resumo_ia && (
                    <p className="text-xs text-blue-200 italic leading-relaxed">"{t.resumo_ia}"</p>
                  )}
                  {t.sintomas && (
                    <p className="text-xs text-green-300 leading-relaxed">{
                      Array.isArray(t.sintomas) ? t.sintomas.join(', ') : String(t.sintomas)
                    }</p>
                  )}
                </div>
              ))}
            </Secao>

            {/* Consultas anteriores */}
            <Secao titulo="Consultas anteriores" icone={<ClipboardList className="w-3.5 h-3.5" />} count={dados.atendimentos?.length}>
              {dados.atendimentos?.length === 0 ? (
                <p className="text-xs text-green-500 italic">Nenhuma consulta anterior.</p>
              ) : dados.atendimentos?.map((a: any) => (
                <div key={a.id} className="bg-white/5 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-green-400">{fmtDH(a.finalizado_em ?? a.criado_em)}</span>
                    {a.medicos?.nome && (
                      <span className="text-xs text-green-300">{a.medicos.nome}</span>
                    )}
                  </div>
                  {a.queixa_principal && (
                    <p className="text-xs text-blue-200"><strong className="text-green-300">QP:</strong> {a.queixa_principal}</p>
                  )}
                  {a.hipotese_diag && (
                    <p className="text-xs text-blue-200">
                      <strong className="text-green-300">Hipótese:</strong> {a.hipotese_diag}
                      {a.cid ? ` (${a.cid})` : ''}
                    </p>
                  )}
                  {a.plano_terapeutico && (
                    <p className="text-xs text-blue-200"><strong className="text-green-300">Plano:</strong> {a.plano_terapeutico}</p>
                  )}
                  {a.evolucao && (
                    <p className="text-xs text-blue-200"><strong className="text-green-300">Evolução:</strong> {a.evolucao}</p>
                  )}
                  {!a.queixa_principal && !a.hipotese_diag && a.notas_medico && (
                    <p className="text-xs text-blue-200 italic">{a.notas_medico}</p>
                  )}
                </div>
              ))}
            </Secao>

            {/* Atestados */}
            <Secao titulo="Atestados" icone={<ClipboardList className="w-3.5 h-3.5" />} count={dados.atestados?.length}>
              {dados.atestados?.length === 0 ? (
                <p className="text-xs text-green-500 italic">Nenhum atestado emitido.</p>
              ) : dados.atestados?.map((a: any) => (
                <div key={a.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-green-400">{fmt(a.data_emissao ?? a.criado_em)}</span>
                    {a.dias && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        {a.dias} {a.dias === 1 ? 'dia' : 'dias'}
                      </span>
                    )}
                  </div>
                  {a.cid && <p className="text-xs text-blue-200 mt-1">CID: {a.cid}</p>}
                  {a.medicos?.nome && <p className="text-xs text-green-300 mt-0.5">{a.medicos.nome}</p>}
                </div>
              ))}
            </Secao>

            {/* Receitas */}
            <Secao titulo="Receitas" icone={<Pill className="w-3.5 h-3.5" />} count={dados.receitas?.length}>
              {dados.receitas?.length === 0 ? (
                <p className="text-xs text-green-500 italic">Nenhuma receita emitida.</p>
              ) : dados.receitas?.map((r: any) => (
                <div key={r.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-green-400">{fmtDH(r.criado_em)}</span>
                    {r.validade && (
                      <span className="text-xs text-purple-300">Válida até {fmt(r.validade)}</span>
                    )}
                  </div>
                  {r.observacao && (
                    <p className="text-xs text-blue-200 mt-1.5 leading-relaxed whitespace-pre-line line-clamp-3">{r.observacao}</p>
                  )}
                  {r.medicos?.nome && <p className="text-xs text-green-300 mt-1">{r.medicos.nome}</p>}
                </div>
              ))}
            </Secao>

            {/* Exames */}
            <Secao titulo="Exames solicitados" icone={<FlaskConical className="w-3.5 h-3.5" />} count={dados.exames?.length}>
              {dados.exames?.length === 0 ? (
                <p className="text-xs text-green-500 italic">Nenhum exame solicitado.</p>
              ) : dados.exames?.map((e: any) => (
                <div key={e.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-green-400">{fmt(e.data_solicitacao ?? e.criado_em)}</span>
                    {e.urgencia && e.urgencia !== 'normal' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        e.urgencia === 'emergencia'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                      }`}>
                        {e.urgencia === 'emergencia' ? 'Emergência' : 'Urgente'}
                      </span>
                    )}
                  </div>
                  {e.exames && (
                    <div className="mt-1.5 space-y-0.5">
                      {e.exames.split('\n').filter(Boolean).map((x: string, i: number) => (
                        <p key={i} className="text-xs text-blue-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5BBD9B] shrink-0" />
                          {x.trim()}
                        </p>
                      ))}
                    </div>
                  )}
                  {e.indicacao_clinica && (
                    <p className="text-xs text-green-400 mt-1 italic">{e.indicacao_clinica}</p>
                  )}
                  {e.medicos?.nome && <p className="text-xs text-green-300 mt-1">{e.medicos.nome}</p>}
                </div>
              ))}
            </Secao>

            {/* Exclusões */}
            {dados.exclusoes?.length > 0 && (
              <Secao titulo="Elegibilidade Online" icone={<ShieldCheck className="w-3.5 h-3.5" />} count={dados.exclusoes?.length}>
                {dados.exclusoes?.map((e: any) => (
                  <div key={e.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-green-400">{fmtDH(e.criado_em)}</span>
                      <span className="text-xs text-teal-300">{STATUS_EXCL[e.status] ?? e.status}</span>
                    </div>
                    {e.motivos?.length > 0 && (
                      <p className="text-xs text-blue-200 mt-1">Motivos: {e.motivos.join(', ')}</p>
                    )}
                    {e.conduta && (
                      <p className="text-xs text-green-300 mt-0.5 italic">{e.conduta}</p>
                    )}
                    {e.medicos?.nome && <p className="text-xs text-green-400 mt-1">{e.medicos.nome}</p>}
                  </div>
                ))}
              </Secao>
            )}

            {/* História familiar e social */}
            {(dados.paciente?.historia_familiar || dados.paciente?.historia_social) && (
              <Secao titulo="História" icone={<User className="w-3.5 h-3.5" />}>
                {dados.paciente?.historia_familiar && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-green-300 font-semibold mb-1">História Familiar</p>
                    <p className="text-xs text-blue-200">{dados.paciente.historia_familiar}</p>
                  </div>
                )}
                {dados.paciente?.historia_social && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-green-300 font-semibold mb-1">História Social</p>
                    <p className="text-xs text-blue-200">{dados.paciente.historia_social}</p>
                  </div>
                )}
              </Secao>
            )}
          </>
        )}
      </div>
    </div>
  )
}
