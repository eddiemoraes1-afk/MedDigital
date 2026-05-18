'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart2, Loader2, RefreshCw, FileText, Calendar, Users, Clock } from 'lucide-react'

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
          <Card title="Atestados por CID-10" sub="Diagnósticos mais frequentes">
            <div className="space-y-2">
              {(data.porCID ?? []).slice(0, 12).map((c: any, i: number) => {
                const max = data.porCID[0]?.atestados ?? 1
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#1A3A2C] w-20 shrink-0">{c.cid}</span>
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
              <Card title="Atestados por Grupo CID-10" sub="Classificação oficial — 22 grupos">
                <DonutChart
                  slices={(data.porGrupoCID as any[]).slice(0, 8).map((g: any, i: number) => ({
                    label: g.abrev,
                    value: g.atestados,
                    color: COLORS[i % COLORS.length],
                  }))}
                />
              </Card>
              <Card title="Dias de Afastamento por Grupo CID-10" sub="Total de dias por categoria de diagnóstico">
                <div className="space-y-2">
                  {(data.porGrupoCID as any[]).slice(0, 10).map((g: any, i: number) => {
                    const max = data.porGrupoCID[0]?.atestados ?? 1
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="text-xs text-gray-600 shrink-0 truncate"
                          style={{ width: '120px' }}
                          title={g.grupo}
                        >
                          {g.abrev}
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
                          <div className="flex flex-wrap gap-1.5">
                            {s.topCID.map((c: any, j: number) => (
                              <span key={j} className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                                {c.cid} <span className="text-blue-400">×{c.n}</span>
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

          {/* Top funcionários com CID */}
          <Card title="Top Funcionários por Dias de Afastamento" sub="Ordenado por total de dias — inclui CID principal">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left">#</th>
                    <th className="px-4 py-2.5 text-left">Funcionário</th>
                    <th className="px-4 py-2.5 text-left">Cargo</th>
                    <th className="px-4 py-2.5 text-left">Secretaria</th>
                    <th className="px-4 py-2.5 text-left">CID Principal</th>
                    <th className="px-4 py-2.5 text-center">Atestados</th>
                    <th className="px-4 py-2.5 text-center">Dias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topFuncionarios.map((f: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-[#1A3A2C] text-xs">{f.nome}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{f.cargo}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{f.secretaria}</td>
                      <td className="px-4 py-2.5">
                        {f.cidPrincipal && f.cidPrincipal !== '—' ? (
                          <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{f.cidPrincipal}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{f.atestados}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{f.dias}d</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Lista completa de atestados */}
          {data.lista && data.lista.length > 0 && (
            <Card title={`Lista Completa de Atestados (${data.lista.length})`} sub="Todos os atestados do período com detalhes completos">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Paciente</th>
                      <th className="px-4 py-3 text-left">Médico</th>
                      <th className="px-4 py-3 text-left">CID</th>
                      <th className="px-4 py-3 text-center">Dias</th>
                      <th className="px-4 py-3 text-left">Início</th>
                      <th className="px-4 py-3 text-left">Fim</th>
                      <th className="px-4 py-3 text-left">Empresa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.lista.map((a: any) => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{a.data}</td>
                        <td className="px-4 py-3 font-semibold text-[#1A3A2C] text-xs whitespace-nowrap">{a.paciente}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.medico}</td>
                        <td className="px-4 py-3">
                          {a.cid ? (
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md font-semibold">{a.cid}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.dias != null ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              a.dias >= 3 ? 'bg-orange-100 text-orange-700'
                              : a.dias === 2 ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-50 text-blue-600'
                            }`}>{a.dias}d</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{a.inicio}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{a.fim}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{a.empresa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
