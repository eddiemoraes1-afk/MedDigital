import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  CheckCircle2, FileText, ClipboardList,
  DollarSign, TrendingUp, AlertCircle,
} from 'lucide-react'
import MedicoHeader from '../MedicoHeader'
import ProducaoFiltroClient from './ProducaoFiltroClient'
import ProducaoListasClient, {
  type ConsultaRow, type AtestadoRow, type ReceitaRow,
} from './ProducaoListasClient'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  } catch { return '' }
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Converte "2026-05-01" → "01/05" (DD/MM)
function labelDDMM(isoDate: string): string {
  return isoDate.slice(8) + '/' + isoDate.slice(5, 7)
}

// ── Bar chart SVG (server-side) ───────────────────────────────────────────────

function BarChartSVG({
  data,
  barColor = '#5BBD9B',
  todayColor = '#1A3A2C',
}: {
  data: { date: string; count: number }[]
  barColor?: string
  todayColor?: string
}) {
  if (data.length === 0) return null
  const W = 700
  const H = 90
  const LABEL_H = 20
  const showLabels = data.length <= 31
  const totalH = H + (showLabels ? LABEL_H : 0)
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const gap  = data.length > 30 ? 1 : 2
  const barW = Math.max(2, Math.floor((W - gap * (data.length - 1)) / data.length))
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      style={{ height: totalH }}
    >
      {data.map((d, i) => {
        const x    = i * (barW + gap)
        const barH = d.count > 0 ? Math.max(4, Math.round((d.count / maxCount) * (H - 8))) : 2
        const y    = H - barH
        const isToday = d.date === hoje
        return (
          <g key={d.date}>
            <rect
              x={x} y={y} width={barW} height={barH} rx="2"
              fill={d.count === 0 ? '#e5e7eb' : isToday ? todayColor : barColor}
            />
            {d.count > 0 && barH > 16 && (
              <text
                x={x + barW / 2} y={y + barH / 2 + 4}
                textAnchor="middle" fontSize="9" fill="white" fontWeight="600"
              >
                {d.count}
              </text>
            )}
            {showLabels && (i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
              <text
                x={x + barW / 2} y={H + LABEL_H - 4}
                textAnchor="middle" fontSize="9" fill="#9ca3af"
              >
                {labelDDMM(d.date)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Chart section wrapper ─────────────────────────────────────────────────────

function ChartCard({
  icon, title, count, avg, data, barColor, todayColor,
}: {
  icon: React.ReactNode
  title: string
  count: number
  avg: string
  data: { date: string; count: number }[]
  barColor?: string
  todayColor?: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-[#1A3A2C] text-sm flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <span className="text-xs text-gray-400">Média: {avg} por dia ativo</span>
      </div>
      <div className="px-6 py-4">
        <BarChartSVG data={data} barColor={barColor} todayColor={todayColor} />
      </div>
    </div>
  )
}

// ── Util: gera chartData para um conjunto de datas ────────────────────────────

function buildChartData(
  dates: string[],  // array de datas ISO (sv-SE) de cada item
  dataIni: string,
  dataFim: string,
): { date: string; count: number }[] {
  const porDia = new Map<string, number>()
  dates.forEach(d => porDia.set(d, (porDia.get(d) ?? 0) + 1))

  const result: { date: string; count: number }[] = []
  const cur = new Date(dataIni + 'T12:00:00-03:00')
  const end = new Date(dataFim + 'T12:00:00-03:00')
  while (cur <= end) {
    const d = cur.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    result.push({ date: d, count: porDia.get(d) ?? 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

function calcMedia(total: number, chartData: { count: number }[]): string {
  const diasAtivos = chartData.filter(d => d.count > 0).length
  if (total === 0 || diasAtivos === 0) return '0'
  return (total / diasAtivos).toFixed(1)
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
  const hoje     = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const mesAtual = hoje.slice(0, 7)
  const dataIni  = de  || `${mesAtual}-01`
  const dataFim  = ate || hoje

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
      .select('id, criado_em, tipo, paciente_id, valor_medico, pacientes(id, nome)')
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

  // Só renovações geram ganho (valor_medico > 0); receitas emitidas em consulta = sem ganho
  const renovacoesRecs = recs.filter((r: any) => Number(r.valor_medico ?? 0) > 0)
  const ganhoConsultas = ats.length * custoConsulta
  const ganhoReceitas  = renovacoesRecs.reduce((s: number, r: any) => s + Number(r.valor_medico), 0)
  const totalGanho     = ganhoConsultas + ganhoReceitas
  const valorConfigurado = custoConsulta > 0 || custoReceita > 0

  // ── Lookup: pacienteId → atestado/receita no mesmo dia ───────────────────
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

  // ── Chart data ────────────────────────────────────────────────────────────
  const atsChartDates   = ats.map(a => toLocalDate(a.finalizado_em)).filter(Boolean)
  const atestChartDates = atests.map(a => toLocalDate(a.criado_em)).filter(Boolean)
  const recChartDates   = recs.map(r => toLocalDate(r.criado_em)).filter(Boolean)

  const atsChart   = buildChartData(atsChartDates,   dataIni, dataFim)
  const atestChart = buildChartData(atestChartDates, dataIni, dataFim)
  const recChart   = buildChartData(recChartDates,   dataIni, dataFim)

  // ── Dados serializáveis para os clientes ──────────────────────────────────
  const consultaRows: ConsultaRow[] = ats.map(a => ({
    id:           a.id,
    finalizado_em: a.finalizado_em ?? '',
    paciente_id:  a.paciente_id ?? '',
    paciente_nome: (a.pacientes as any)?.nome ?? 'Paciente',
    tem_atestado: !!(atestPorDia[toLocalDate(a.finalizado_em)]?.has(a.paciente_id ?? '')),
    tem_receita:  !!(recPorDia[toLocalDate(a.finalizado_em)]?.has(a.paciente_id ?? '')),
    custo:        custoConsulta,
  }))

  const atestadoRows: AtestadoRow[] = atests.map(a => ({
    id:           a.id,
    criado_em:    a.criado_em ?? '',
    paciente_id:  a.paciente_id ?? '',
    paciente_nome: (a.pacientes as any)?.nome ?? 'Paciente',
    dias:         a.dias ?? 0,
    cid:          a.cid ?? null,
  }))

  const receitaRows: ReceitaRow[] = recs.map((r: any) => ({
    id:           r.id,
    criado_em:    r.criado_em ?? '',
    paciente_id:  r.paciente_id ?? '',
    paciente_nome: (r.pacientes as any)?.nome ?? 'Paciente',
    tipo:         r.tipo ?? 'simples',
    valor_medico: r.valor_medico != null ? Number(r.valor_medico) : null,
  }))

  // ── Label de período ──────────────────────────────────────────────────────
  const labelPeriodo = [
    new Date(dataIni + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    '→',
    new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
  ].join(' ')

  const periodoTexto = `${dataIni} a ${dataFim}`

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader titulo="Minha Produção" backHref="/medico/dashboard" medicoNome={medico.nome} medicoSexo={medico.sexo} medicoFotoUrl={medico.foto_url} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-[#1A3A2C]">Minha Produção</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {medico.sexo === 'feminino' ? 'Dra.' : medico.sexo === 'masculino' ? 'Dr.' : 'Dr(a).'} {medico.nome} · {medico.especialidade} · CRM {medico.crm}/{medico.crm_uf}
          </p>
        </div>

        {/* ── Filtro de datas (client — atualiza automaticamente) ── */}
        <ProducaoFiltroClient dataIni={dataIni} dataFim={dataFim} label={labelPeriodo} />

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#1A3A2C] rounded-2xl p-5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div className="text-3xl font-bold text-white">{ats.length}</div>
            <div className="text-sm text-green-300 mt-1">Consultas</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-[#1A3A2C]">{atests.length}</div>
            <div className="text-sm text-gray-400 mt-1">Atestados</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-[#1A3A2C]">{recs.length}</div>
            <div className="text-sm text-gray-400 mt-1">Receitas</div>
          </div>

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
              {ganhoReceitas > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Renovações de receita
                    <span className="ml-2 text-gray-400 text-xs">({renovacoesRecs.length} × {formatBRL(custoReceita)})</span>
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

        {/* ── Gráficos ── */}
        <ChartCard
          icon={<CheckCircle2 className="w-4 h-4 text-[#5BBD9B]" />}
          title="Consultas por dia"
          count={ats.length}
          avg={calcMedia(ats.length, atsChart)}
          data={atsChart}
          barColor="#5BBD9B"
          todayColor="#1A3A2C"
        />

        <ChartCard
          icon={<FileText className="w-4 h-4 text-amber-500" />}
          title="Atestados por dia"
          count={atests.length}
          avg={calcMedia(atests.length, atestChart)}
          data={atestChart}
          barColor="#f59e0b"
          todayColor="#92400e"
        />

        <ChartCard
          icon={<ClipboardList className="w-4 h-4 text-purple-500" />}
          title="Receitas por dia"
          count={recs.length}
          avg={calcMedia(recs.length, recChart)}
          data={recChart}
          barColor="#a855f7"
          todayColor="#4c1d95"
        />

        {/* ── Histórico detalhado (client — com filtro e download) ── */}
        <ProducaoListasClient
          consultas={consultaRows}
          atestados={atestadoRows}
          receitas={receitaRows}
          custoConsulta={custoConsulta}
          periodo={periodoTexto}
          medicoNome={medico.nome}
        />

      </main>
    </div>
  )
}
