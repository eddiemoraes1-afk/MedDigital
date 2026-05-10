import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  CheckCircle2, FileText, ClipboardList, FlaskConical,
  DollarSign, TrendingUp, Calendar, AlertCircle,
} from 'lucide-react'
import MedicoHeader from '../MedicoHeader'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  } catch { return '' }
}

function formatarHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  })
}

function formatarDataBonita(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Bar chart SVG (server-side) ───────────────────────────────────────────────

function BarChartSVG({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return null
  const W = 700
  const H = 90
  const LABEL_H = 20
  const showLabels = data.length <= 31
  const totalH = H + (showLabels ? LABEL_H : 0)
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const gap = data.length > 30 ? 1 : 2
  const barW = Math.max(2, Math.floor((W - gap * (data.length - 1)) / data.length))

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      style={{ height: totalH }}
    >
      {data.map((d, i) => {
        const x = i * (barW + gap)
        const barH = d.count > 0 ? Math.max(4, Math.round((d.count / maxCount) * (H - 8))) : 2
        const y = H - barH
        const isToday = d.date === new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
        return (
          <g key={d.date}>
            <rect
              x={x} y={y} width={barW} height={barH} rx="2"
              fill={d.count === 0 ? '#e5e7eb' : isToday ? '#1A3A2C' : '#5BBD9B'}
            />
            {d.count > 0 && barH > 16 && (
              <text x={x + barW / 2} y={y + barH / 2 + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                {d.count}
              </text>
            )}
            {showLabels && (i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
              <text x={x + barW / 2} y={H + LABEL_H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {d.date.slice(5).replace('-', '/')}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProducaoMedicoPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  const { de, ate } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: medico } = await supabase
    .from('medicos')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') redirect('/medico/dashboard')

  // ── Período padrão: mês atual ─────────────────────────────────────────────
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const mesAtual = hoje.slice(0, 7) // "2026-05"
  const dataIni = de  || `${mesAtual}-01`
  const dataFim = ate || hoje

  const inicioISO = new Date(dataIni + 'T00:00:00-03:00').toISOString()
  const fimISO    = new Date(dataFim + 'T23:59:59-03:00').toISOString()

  // ── Busca paralela ────────────────────────────────────────────────────────
  const [atsRes, atestRes, recRes] = await Promise.all([
    admin
      .from('atendimentos')
      .select('id, finalizado_em, paciente_id, pacientes(id, nome)')
      .eq('medico_id', medico.id)
      .eq('status', 'concluido')
      .gte('finalizado_em', inicioISO)
      .lte('finalizado_em', fimISO)
      .order('finalizado_em', { ascending: false }),

    admin
      .from('atestados')
      .select('id, criado_em, dias, cid, paciente_id, pacientes(id, nome)')
      .eq('medico_id', medico.id)
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO)
      .order('criado_em', { ascending: false }),

    admin
      .from('receitas')
      .select('id, criado_em, status, paciente_id, pacientes(id, nome)')
      .eq('medico_id', medico.id)
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO)
      .order('criado_em', { ascending: false }),
  ])

  const ats    = atsRes.data   ?? []
  const atests = atestRes.data ?? []
  const recs   = recRes.data   ?? []

  // ── Valores configurados pelo admin ──────────────────────────────────────
  const custoConsulta = Number(medico.custo_consulta ?? 0)
  const custoReceita  = Number(medico.custo_receita  ?? 0)
  const ganhoConsultas = ats.length   * custoConsulta
  const ganhoReceitas  = recs.length  * custoReceita
  const totalGanho     = ganhoConsultas + ganhoReceitas
  const valorConfigurado = custoConsulta > 0 || custoReceita > 0

  // ── Lookups por data: pacienteId → atestado/receita no mesmo dia ──────────
  const atestPorDia: Record<string, Set<string>> = {}
  atests.forEach(a => {
    const d = toLocalDate(a.criado_em)
    if (!atestPorDia[d]) atestPorDia[d] = new Set()
    if (a.paciente_id) atestPorDia[d].add(a.paciente_id)
  })
  const recPorDia: Record<string, Set<string>> = {}
  recs.forEach(r => {
    const d = toLocalDate(r.criado_em)
    if (!recPorDia[d]) recPorDia[d] = new Set()
    if (r.paciente_id) recPorDia[d].add(r.paciente_id)
  })

  // ── Agrupar atendimentos por data (desc) ──────────────────────────────────
  const porDia = new Map<string, typeof ats>()
  ats.forEach(a => {
    const d = toLocalDate(a.finalizado_em)
    if (!porDia.has(d)) porDia.set(d, [])
    porDia.get(d)!.push(a)
  })
  const datasOrdenadas = Array.from(porDia.keys()).sort((a, b) => b.localeCompare(a))

  // ── Dados do gráfico: todos os dias do período ────────────────────────────
  const chartData: { date: string; count: number }[] = []
  const cur = new Date(dataIni + 'T12:00:00-03:00')
  const end = new Date(dataFim + 'T12:00:00-03:00')
  while (cur <= end) {
    const d = cur.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    chartData.push({ date: d, count: porDia.get(d)?.length ?? 0 })
    cur.setDate(cur.getDate() + 1)
  }

  const primeiroNome = medico.nome.split(' ')[0]

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader titulo="Minha Produção" backHref="/medico/dashboard" medicoNome={medico.nome} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-[#1A3A2C]">Minha Produção</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Dr(a). {medico.nome} · {medico.especialidade} · CRM {medico.crm}/{medico.crm_uf}
          </p>
        </div>

        {/* ── Filtro de datas ── */}
        <form method="GET" className="bg-white rounded-2xl px-6 py-4 shadow-sm flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">De</label>
            <input
              type="date" name="de" defaultValue={dataIni}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Até</label>
            <input
              type="date" name="ate" defaultValue={dataFim}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
            />
          </div>
          <button
            type="submit"
            className="bg-[#1A3A2C] hover:bg-[#122a1f] text-white px-5 py-1.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Aplicar
          </button>
          <span className="text-xs text-gray-400 self-center">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            {new Date(dataIni + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            {' → '}
            {new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </form>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Consultas */}
          <div className="bg-[#1A3A2C] rounded-2xl p-5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div className="text-3xl font-bold text-white">{ats.length}</div>
            <div className="text-sm text-green-300 mt-1">Consultas</div>
          </div>

          {/* Atestados */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-[#1A3A2C]">{atests.length}</div>
            <div className="text-sm text-gray-400 mt-1">Atestados</div>
          </div>

          {/* Receitas */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-[#1A3A2C]">{recs.length}</div>
            <div className="text-sm text-gray-400 mt-1">Receitas</div>
          </div>

          {/* Total a receber */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className={`text-2xl font-bold leading-tight mt-1 ${valorConfigurado ? 'text-green-600' : 'text-gray-300'}`}>
              {valorConfigurado ? formatBRL(totalGanho) : '—'}
            </div>
            <div className="text-sm text-gray-400 mt-1">Total a receber</div>
          </div>
        </div>

        {/* ── Detalhamento de ganhos ── */}
        {valorConfigurado ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h2 className="font-bold text-[#1A3A2C] text-sm">Detalhamento de Ganhos</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              {custoConsulta > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Consultas concluídas
                    <span className="ml-2 text-gray-400 text-xs">({ats.length} × {formatBRL(custoConsulta)})</span>
                  </span>
                  <span className="font-bold text-[#1A3A2C]">{formatBRL(ganhoConsultas)}</span>
                </div>
              )}
              {custoReceita > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Renovações de receita
                    <span className="ml-2 text-gray-400 text-xs">({recs.length} × {formatBRL(custoReceita)})</span>
                  </span>
                  <span className="font-bold text-[#1A3A2C]">{formatBRL(ganhoReceitas)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-bold text-[#1A3A2C]">Total a receber no período</span>
                <span className="text-xl font-bold text-green-600">{formatBRL(totalGanho)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Valores de remuneração não configurados</p>
              <p className="text-xs text-amber-600 mt-0.5">
                O administrador ainda não cadastrou o valor por consulta e por receita para o seu perfil.
                Quando configurado, você verá aqui o total a receber no período.
              </p>
            </div>
          </div>
        )}

        {/* ── Gráfico: consultas por dia ── */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-[#1A3A2C] text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5BBD9B]" />
                Consultas por dia
              </h2>
              <span className="text-xs text-gray-400">
                Média: {ats.length > 0 ? (ats.length / Math.max(chartData.filter(d => d.count > 0).length, 1)).toFixed(1) : '0'} por dia ativo
              </span>
            </div>
            <div className="px-6 py-4">
              <BarChartSVG data={chartData} />
            </div>
          </div>
        )}

        {/* ── Timeline por data ── */}
        <div className="space-y-4">
          <h2 className="font-bold text-[#1A3A2C] text-sm px-1">Histórico de Consultas</h2>

          {datasOrdenadas.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-14 text-center">
              <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nenhuma consulta concluída no período</p>
            </div>
          ) : (
            datasOrdenadas.map(data => {
              const consultas = porDia.get(data)!
              const atestsDia = atestPorDia[data]
              const recsDia   = recPorDia[data]

              return (
                <div key={data} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Cabeçalho do dia */}
                  <div className="px-6 py-3.5 bg-[#1A3A2C]/5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#5BBD9B]" />
                      <span className="font-bold text-[#1A3A2C] text-sm capitalize">
                        {formatarDataBonita(data)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-semibold text-[#1A3A2C]">{consultas.length} consulta{consultas.length !== 1 ? 's' : ''}</span>
                      {custoConsulta > 0 && (
                        <span className="text-green-600 font-semibold">{formatBRL(consultas.length * custoConsulta)}</span>
                      )}
                    </div>
                  </div>

                  {/* Consultas do dia */}
                  <div className="divide-y divide-gray-50">
                    {consultas.map((a: any, idx: number) => {
                      const temAtestado = atestsDia?.has(a.paciente_id)
                      const temReceita  = recsDia?.has(a.paciente_id)
                      return (
                        <div key={a.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                          {/* Número */}
                          <span className="text-xs text-gray-300 font-mono w-4 shrink-0 text-right">{idx + 1}</span>

                          {/* Hora */}
                          <span className="text-xs text-gray-400 font-mono shrink-0 w-11">
                            {formatarHora(a.finalizado_em)}
                          </span>

                          {/* Paciente */}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/medico/pacientes/${a.pacientes?.id}?back=${encodeURIComponent('/medico/producao')}`}
                              className="text-sm font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                            >
                              {a.pacientes?.nome || 'Paciente'}
                            </Link>
                          </div>

                          {/* Chips */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {temAtestado && (
                              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                <FileText className="w-3 h-3" /> Atestado
                              </span>
                            )}
                            {temReceita && (
                              <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                <ClipboardList className="w-3 h-3" /> Receita
                              </span>
                            )}
                          </div>

                          {/* Valor a receber */}
                          {custoConsulta > 0 && (
                            <span className="text-sm font-bold text-green-600 shrink-0">
                              {formatBRL(custoConsulta)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

      </main>
    </div>
  )
}
