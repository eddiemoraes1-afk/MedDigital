'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart2, Loader2, RefreshCw, FileText, Calendar, Users, Clock, Filter, X } from 'lucide-react'
import { CidBadgePill, CidBadgeTable, GrupoLabel } from '@/components/CidTooltip'

const COLORS = ['#5BBD9B','#3B82F6','#F59E0B','#8B5CF6','#EF4444','#14B8A6','#EC4899','#6366F1']

function formatMes(ym: string) {
  const [year, month] = ym.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[parseInt(month)-1]}/${year.slice(2)}`
}

// ── SVG Donut ────────────────────────────────────────────────────────────────
function DonutChart({ slices, centerLabel }: { slices: { label: string; value: number; color: string }[]; centerLabel?: string }) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="h-36 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  function polar(deg: number, r: number): [number, number] {
    const rad = (deg - 90) * Math.PI / 180
    return [r * Math.cos(rad), r * Math.sin(rad)]
  }
  function sector(s: number, e: number) {
    if (e - s >= 360) e = s + 359.9
    const [x1, y1] = polar(s, 80); const [x2, y2] = polar(e, 80)
    const [ix2, iy2] = polar(e, 52); const [ix1, iy1] = polar(s, 52)
    const lg = e - s > 180 ? 1 : 0
    return `M${x1},${y1} A80,80 0 ${lg} 1 ${x2},${y2} L${ix2},${iy2} A52,52 0 ${lg} 0 ${ix1},${iy1}Z`
  }
  let cum = 0
  const sectors = slices.map(s => { const deg = (s.value / total) * 360; const start = cum; cum += deg; return { ...s, path: sector(start, cum) } })
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="-95 -95 190 190" className="w-40 h-40">
        {sectors.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2"><title>{s.label}: {s.value}</title></path>)}
        <text x="0" y="-5" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1A3A2C">{centerLabel ?? total}</text>
        <text x="0" y="10" textAnchor="middle" fontSize="7" fill="#9CA3AF">total</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-xs">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate max-w-[80px]" title={s.label}>{s.label}</span>
            <span className="font-semibold">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal Bar ───────────────────────────────────────────────────────────
function HBar({ data, labelKey, valueKey, color = '#5BBD9B', suffix = '' }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string; suffix?: string
}) {
  if (!data.length) return <div className="h-24 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-28 truncate shrink-0" title={d[labelKey]}>{d[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${(d[valueKey] / max) * 100}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-12 text-right shrink-0">{d[valueKey]}{suffix}</span>
        </div>
      ))}
    </div>
  )
}

// ── Bar vertical ─────────────────────────────────────────────────────────────
function BarV({ data, labelKey, valueKey, color = '#5BBD9B' }: {
  data: Record<string, any>[]; labelKey: string; valueKey: string; color?: string
}) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-xs text-gray-300">Sem dados</div>
  const W = 560, H = 180, PAD = { top: 20, right: 12, bottom: 44, left: 44 }
  const plotW = W - PAD.left - PAD.right; const plotH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  const n = data.length; const slotW = plotW / n; const barW = slotW * 0.6
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = PAD.top + plotH - f * plotH
        const v = f * maxVal
        return <g key={i}><line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F3F4F6" strokeWidth="1"/><text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">{v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}</text></g>
      })}
      {data.map((d, i) => {
        const x = PAD.left + i * slotW + (slotW - barW) / 2
        const h = Math.max(2, (d[valueKey] / maxVal) * plotH)
        const y = PAD.top + plotH - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={color} rx="3" opacity="0.9"><title>{d[labelKey]}: {d[valueKey]}</title></rect>
            <text x={x + barW / 2} y={PAD.top + plotH + 14} textAnchor="middle" fontSize="8" fill="#6B7280" transform={n > 6 ? `rotate(-30,${x + barW/2},${PAD.top + plotH + 14})` : ''}>{d[labelKey]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
      <div className="mb-4"><h3 className="font-bold text-[#1A3A2C] text-sm">{title}</h3>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#1A3A2C] leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

// ── Legenda de cores de dias ──────────────────────────────────────────────────
function diasCor(dias: number | null): string {
  if (dias == null) return 'bg-gray-100 text-gray-500'
  if (dias === 1)   return 'bg-green-100 text-green-700'
  if (dias === 2)   return 'bg-yellow-100 text-yellow-700'
  if (dias === 3)   return 'bg-orange-100 text-orange-700'
  if (dias <= 6)    return 'bg-red-100 text-red-700'
  if (dias <= 14)   return 'bg-red-200 text-red-800'
  return 'bg-purple-100 text-purple-700'
}

// ── Lista por Dias de Afastamento (anônima, com filtros) ──────────────────────
function ListaAtestados({ lista }: { lista: any[] }) {
  const [filtroCargo,      setFiltroCargo]      = useState('')
  const [filtroSecretaria, setFiltroSecretaria] = useState('')
  const [filtroCid,        setFiltroCid]        = useState('')
  const [filtroDataDe,     setFiltroDataDe]     = useState('')
  const [filtroDataAte,    setFiltroDataAte]    = useState('')
  const [ordenacao,        setOrdenacao]        = useState('dias_desc')

  const cargos = useMemo(
    () => [...new Set(lista.map(a => a.cargo).filter((c: string) => c && c !== '—'))].sort(),
    [lista],
  )
  const secretarias = useMemo(
    () => [...new Set(lista.map(a => a.secretaria).filter((s: string) => s && s !== '—'))].sort(),
    [lista],
  )

  const listaFiltrada = useMemo(() => {
    let items = lista
    if (filtroCargo)      items = items.filter(a => a.cargo === filtroCargo)
    if (filtroSecretaria) items = items.filter(a => a.secretaria === filtroSecretaria)
    if (filtroCid)        items = items.filter(a => a.cid?.toUpperCase().includes(filtroCid.toUpperCase()))
    if (filtroDataDe)     items = items.filter(a => a.inicio_raw >= filtroDataDe)
    if (filtroDataAte)    items = items.filter(a => a.fim_raw <= filtroDataAte)

    return [...items].sort((a, b) => {
      if (ordenacao === 'dias_desc') return (b.dias ?? 0) - (a.dias ?? 0)
      if (ordenacao === 'dias_asc')  return (a.dias ?? 0) - (b.dias ?? 0)
      if (ordenacao === 'data_desc') return b.data_raw.localeCompare(a.data_raw)
      return a.data_raw.localeCompare(b.data_raw)
    })
  }, [lista, filtroCargo, filtroSecretaria, filtroCid, filtroDataDe, filtroDataAte, ordenacao])

  const temFiltro = filtroCargo || filtroSecretaria || filtroCid || filtroDataDe || filtroDataAte

  function limparFiltros() {
    setFiltroCargo(''); setFiltroSecretaria(''); setFiltroCid('')
    setFiltroDataDe(''); setFiltroDataAte('')
  }

  const selectCls = 'border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#5BBD9B] focus:outline-none'
  const inputCls  = 'border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#5BBD9B] focus:outline-none'

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mr-1">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </div>

        {cargos.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Cargo</label>
            <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {cargos.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {secretarias.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Secretaria</label>
            <select value={filtroSecretaria} onChange={e => setFiltroSecretaria(e.target.value)} className={selectCls}>
              <option value="">Todas</option>
              {secretarias.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">CID</label>
          <input
            type="text" value={filtroCid} onChange={e => setFiltroCid(e.target.value)}
            placeholder="ex: J11" className={`${inputCls} w-24`}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Início a partir de</label>
          <input type="date" value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)} className={inputCls} />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Fim até</label>
          <input type="date" value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)} className={inputCls} />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Ordenar por</label>
          <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)} className={selectCls}>
            <option value="dias_desc">Mais dias primeiro</option>
            <option value="dias_asc">Menos dias primeiro</option>
            <option value="data_desc">Mais recente primeiro</option>
            <option value="data_asc">Mais antigo primeiro</option>
          </select>
        </div>

        {temFiltro && (
          <button onClick={limparFiltros}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white transition-colors self-end">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}

        <span className="text-xs text-gray-400 self-end ml-auto">
          {listaFiltrada.length} registro{listaFiltrada.length !== 1 ? 's' : ''}
          {temFiltro && ` de ${lista.length}`}
        </span>
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-wrap items-center gap-3 mb-3 px-1">
        {[
          { label: '1 dia', cls: 'bg-green-100 text-green-700' },
          { label: '2 dias', cls: 'bg-yellow-100 text-yellow-700' },
          { label: '3 dias', cls: 'bg-orange-100 text-orange-700' },
          { label: '4–6 dias', cls: 'bg-red-100 text-red-700' },
          { label: '7–14 dias', cls: 'bg-red-200 text-red-800' },
          { label: '15+ dias', cls: 'bg-purple-100 text-purple-700' },
        ].map(l => (
          <span key={l.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l.cls}`}>{l.label}</span>
        ))}
      </div>

      {/* Tabela */}
      {listaFiltrada.length === 0 ? (
        <p className="text-center text-xs text-gray-300 py-8">Nenhum atestado encontrado com os filtros aplicados</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">#</th>
                <th className="px-4 py-2.5 text-left">Emissão</th>
                <th className="px-4 py-2.5 text-left">Início</th>
                <th className="px-4 py-2.5 text-left">Fim</th>
                <th className="px-4 py-2.5 text-left">Cargo</th>
                <th className="px-4 py-2.5 text-left">Secretaria</th>
                <th className="px-4 py-2.5 text-left">CID</th>
                <th className="px-4 py-2.5 text-center">Dias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listaFiltrada.map((a: any, i: number) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-300">{i + 1}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{a.data}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{a.inicio}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{a.fim}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">{a.cargo}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">{a.secretaria}</td>
                  <td className="px-4 py-2.5">
                    {a.cid
                      ? <CidBadgeTable cid={a.cid} />
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {a.dias != null
                      ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diasCor(a.dias)}`}>{a.dias}d</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function AtestadosDashboard() {
  const [data, setData] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/empresa/atestados')
      if (!res.ok) throw new Error('Erro ao carregar dados')
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
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando dados de atestados...</span>
    </div>
  )

  if (erro) return (
    <div className="text-center py-16 text-red-500 text-sm">{erro}</div>
  )

  if (!data) return null

  const k = data.kpis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2"><FileText className="w-4 h-4 text-[#5BBD9B]" /> Dashboard de Atestados</h2>
          <p className="text-xs text-gray-400 mt-0.5">Afastamentos médicos dos funcionários</p>
        </div>
        <button onClick={carregar} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A3A2C] border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total de Atestados" value={k.total} sub="no período" icon={FileText} color="#5BBD9B" />
        <KpiCard label="Total de Dias" value={k.totalDias} sub="dias de afastamento" icon={Clock} color="#3B82F6" />
        <KpiCard label="Média por Atestado" value={`${k.mediaDias} dias`} sub="média de afastamento" icon={Calendar} color="#F59E0B" />
        <KpiCard label="Funcionários" value={k.funcionariosComAtestado} sub="com ao menos 1 atestado" icon={Users} color="#8B5CF6" />
      </div>

      {k.total === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-50">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum atestado registrado ainda</p>
          <p className="text-sm text-gray-400 mt-1">Os atestados emitidos pelos médicos aparecerão aqui.</p>
        </div>
      )}

      {k.total > 0 && (
        <>
          {/* Row 1 */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card title="Atestados por Mês" sub="Quantidade de atestados emitidos">
                <BarV data={data.porMes.map((d: any) => ({ ...d, mes: formatMes(d.mes) }))} labelKey="mes" valueKey="atestados" color="#5BBD9B" />
              </Card>
            </div>
            <Card title="Dias de Afastamento por Mês" sub="Total de dias acumulados">
              <BarV data={data.porMes.map((d: any) => ({ ...d, mes: formatMes(d.mes) }))} labelKey="mes" valueKey="dias" color="#3B82F6" />
            </Card>
          </div>

          {/* Row 2 — Donuts */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card title="Por Sexo" sub="Distribuição por gênero">
              <DonutChart slices={data.porSexo.map((d: any, i: number) => ({ label: d.sexo, value: d.atestados, color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF' }))} />
            </Card>
            <Card title="Por Relação" sub="Tipo de vínculo">
              <DonutChart slices={data.porRelacao.map((d: any, i: number) => ({ label: d.relacao, value: d.atestados, color: COLORS[i % COLORS.length] }))} />
            </Card>
            <Card title="Dias por Sexo" sub="Total de dias por gênero">
              <DonutChart slices={data.porSexo.map((d: any) => ({ label: d.sexo, value: d.dias, color: d.sexo === 'Masculino' ? '#3B82F6' : d.sexo === 'Feminino' ? '#EC4899' : '#9CA3AF' }))} centerLabel={String(k.totalDias)} />
            </Card>
          </div>

          {/* Row 3 — CID */}
          <Card title="Atestados por CID-10" sub="Diagnósticos mais frequentes — passe o mouse no código para ver a descrição">
            <div className="space-y-2">
              {(data.porCID ?? []).slice(0, 12).map((c: any, i: number) => {
                const max = data.porCID[0]?.atestados ?? 1
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-20 shrink-0"><CidBadgePill cid={c.cid} /></span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${(c.atestados / max) * 100}%`, backgroundColor: '#5BBD9B' }} />
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="font-semibold text-gray-700 w-6 text-right">{c.atestados}</span>
                      <span className="text-gray-400 w-14 text-right">{c.dias} dias</span>
                      <span className="text-gray-400 w-16 text-right">{c.funcionarios} func.</span>
                    </div>
                  </div>
                )
              })}
              {(!data.porCID || data.porCID.length === 0) && (
                <p className="text-xs text-gray-300 text-center py-4">Sem dados de CID</p>
              )}
            </div>
          </Card>

          {/* Grupos CID-10 */}
          {data.porGrupoCID && data.porGrupoCID.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card title="Atestados por Grupo CID-10" sub="22 grupos oficiais — passe o mouse no grupo para ver o nome completo">
                <DonutChart
                  slices={(data.porGrupoCID as any[]).slice(0, 8).map((g: any, i: number) => ({
                    label: g.abrev,
                    value: g.atestados,
                    color: COLORS[i % COLORS.length],
                  }))}
                />
                <div className="mt-3 space-y-1.5">
                  {(data.porGrupoCID as any[]).slice(0, 8).map((g: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <GrupoLabel abrev={g.abrev} grupo={g.grupo} />
                      <span className="ml-auto font-semibold text-gray-700">{g.atestados}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Dias de Afastamento por Grupo CID-10" sub="Total de dias por categoria de diagnóstico">
                <div className="space-y-2">
                  {(data.porGrupoCID as any[]).slice(0, 10).map((g: any, i: number) => {
                    const max = data.porGrupoCID[0]?.atestados ?? 1
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="shrink-0" style={{ width: '120px' }}>
                          <GrupoLabel abrev={g.abrev} grupo={g.grupo} className="text-xs text-gray-600 cursor-help truncate block" />
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${(g.atestados / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          <span className="font-semibold text-gray-700 w-6 text-right">{g.atestados}</span>
                          <span className="text-gray-400 w-14 text-right">{g.dias} dias</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* CID por Secretaria */}
          {data.cidPorSecretaria && data.cidPorSecretaria.length > 0 && (
            <Card title="CIDs Mais Frequentes por Secretaria" sub="Top 3 diagnósticos em cada unidade">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Secretaria</th>
                      <th className="px-4 py-2.5 text-left">CIDs mais frequentes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.cidPorSecretaria.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-medium text-[#1A3A2C]">{s.secretaria}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {s.topCID.map((c: any, j: number) => (
                              <span key={j} className="flex items-center gap-1">
                                <CidBadgePill cid={c.cid} />
                                <span className="text-blue-400 text-xs">×{c.n}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* CID por Cargo */}
          {data.cidPorCargo && data.cidPorCargo.length > 0 && (
            <Card title="CIDs Mais Frequentes por Cargo" sub="Top 3 diagnósticos em cada função — sem identificação nominal">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Cargo</th>
                      <th className="px-4 py-2.5 text-left">CIDs mais frequentes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.cidPorCargo.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-medium text-[#1A3A2C] max-w-[160px] truncate" title={c.cargo}>{c.cargo}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {c.topCID.map((t: any, j: number) => (
                              <span key={j} className="flex items-center gap-1">
                                <CidBadgePill cid={t.cid} />
                                <span className="text-blue-400 text-xs">×{t.n}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Row 4 — Barras horizontais */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Atestados por Secretaria" sub="Quantidade por unidade">
              <HBar data={data.porSecretaria} labelKey="secretaria" valueKey="atestados" color="#5BBD9B" />
            </Card>
            <Card title="Dias por Secretaria" sub="Total de dias afastados por unidade">
              <HBar data={data.porSecretaria} labelKey="secretaria" valueKey="dias" color="#3B82F6" suffix=" dias" />
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Atestados por Cargo" sub="Quantidade por função">
              <HBar data={data.porCargo} labelKey="cargo" valueKey="atestados" color="#8B5CF6" />
            </Card>
            <Card title="Dias por Cargo" sub="Total de dias por função">
              <HBar data={data.porCargo} labelKey="cargo" valueKey="dias" color="#F59E0B" suffix=" dias" />
            </Card>
          </div>

          {/* Tipo de cargo */}
          {data.porTipoCargo && data.porTipoCargo.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card title="Atestados por Tipo de Cargo" sub="Celetista, concursado, comissionado, etc.">
                <HBar data={data.porTipoCargo} labelKey="tipo_cargo" valueKey="atestados" color="#14B8A6" />
              </Card>
              <Card title="Dias Afastados por Tipo de Cargo" sub="Total de dias por vínculo empregatício">
                <HBar data={data.porTipoCargo} labelKey="tipo_cargo" valueKey="dias" color="#EC4899" suffix=" dias" />
              </Card>
            </div>
          )}

          {/* CID por tipo de cargo */}
          {data.cidPorTipoCargo && data.cidPorTipoCargo.length > 0 && (
            <Card title="CIDs Mais Frequentes por Tipo de Cargo" sub="Top 3 diagnósticos em cada vínculo — sem identificação nominal">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.cidPorTipoCargo.map((tc: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-[#1A3A2C] mb-3 uppercase tracking-wide truncate" title={tc.tipoCargo}>
                      {tc.tipoCargo}
                    </p>
                    <div className="space-y-2">
                      {tc.topCID.map((c: any, j: number) => (
                        <div key={j} className="flex items-center justify-between gap-2">
                          <CidBadgePill cid={c.cid} />
                          <span className="text-xs font-semibold text-gray-600 shrink-0">{c.n} atestado{c.n !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Lista por Dias de Afastamento — LGPD-anônima, com filtros */}
          <Card title={`Lista por Dias de Afastamento (${data.lista?.length ?? 0})`} sub="Dados anonimizados conforme LGPD — sem identificação nominal">
            <ListaAtestados lista={data.lista ?? []} />
          </Card>
        </>
      )}
    </div>
  )
}
