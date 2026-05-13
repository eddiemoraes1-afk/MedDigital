'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, RefreshCw, LogIn, LogOut, Clock, Users,
  Download, Printer, Search, X, SlidersHorizontal,
  ChevronLeft, ChevronRight, Wifi, WifiOff,
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtTs(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDuracao(seg: number | null): string {
  if (seg == null) return '—'
  if (seg < 60)    return `${seg}s`
  if (seg < 3600)  return `${Math.floor(seg / 60)}min ${seg % 60}s`
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  return `${h}h ${m}min`
}

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value)
  useEffect(() => { const h = setTimeout(() => setDv(value), delay); return () => clearTimeout(h) }, [value, delay])
  return dv
}

// ── Badge de perfil ───────────────────────────────────────────────────────────
const PERFIL_CFG: Record<string, { label: string; bg: string; cor: string }> = {
  admin:       { label: 'Admin',    bg: '#1A3A2C1A', cor: '#1A3A2C' },
  empresa:     { label: 'Empresa',  bg: '#dbeafe',   cor: '#1d4ed8' },
  medico:      { label: 'Médico',   bg: '#d1fae5',   cor: '#065f46' },
  paciente:    { label: 'Paciente', bg: '#fce7f3',   cor: '#9d174d' },
  desconhecido:{ label: '?',        bg: '#f3f4f6',   cor: '#6b7280' },
}
function PerfilBadge({ perfil }: { perfil: string }) {
  const cfg = PERFIL_CFG[perfil] ?? PERFIL_CFG.desconhecido
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: cfg.bg, color: cfg.cor }}>
      {cfg.label}
    </span>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, cor }: { label: string; value: string | number; icon: React.ElementType; cor: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${cor}18` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: cor }} />
        </div>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#1A3A2C]">{value}</p>
    </div>
  )
}

// ── Input helpers ─────────────────────────────────────────────────────────────
function FLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>
}
function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white" />
}
function FSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white">
      {children}
    </select>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Sessao {
  id: string
  usuario_id: string
  email: string
  perfil: string
  login_em: string
  logout_em: string | null
  duracao_segundos: number | null
  ip: string | null
}
interface ApiResp {
  sessoes: Sessao[]
  kpis: { total: number; comLogout: number; emAberto: number; mediaSeg: number; maxSeg: number; usuariosUnicos: number }
  porPerfil: Record<string, number>
  emails: string[]
}

const PAGE_SIZE = 50

export default function SessoesDashboard() {
  const [data, setData]   = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // Filtros server-side
  const [dataInicio,  setDataInicio]  = useState('')
  const [dataFim,     setDataFim]     = useState('')
  const [perfilFiltro,setPerfilFiltro]= useState('')

  // Filtros client-side
  const [emailBusca, setEmailBusca] = useState('')
  const [somenteAbertos, setSomenteAbertos] = useState(false)
  const dbEmail = useDebounce(emailBusca, 300)

  const [pagina, setPagina] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const p = new URLSearchParams()
      if (dataInicio)   p.set('dataInicio', dataInicio)
      if (dataFim)      p.set('dataFim', dataFim)
      if (perfilFiltro) p.set('perfil', perfilFiltro)
      const res = await fetch(`/api/admin/sessoes?${p}`)
      if (!res.ok) throw new Error('Erro ao carregar sessões')
      setData(await res.json())
      setPagina(1)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [dataInicio, dataFim, perfilFiltro])

  useEffect(() => { fetchData() }, [fetchData])

  const sessoesFiltradas = useMemo(() => {
    if (!data) return []
    let arr = data.sessoes
    if (dbEmail)        arr = arr.filter(s => s.email.toLowerCase().includes(dbEmail.toLowerCase()))
    if (somenteAbertos) arr = arr.filter(s => !s.logout_em)
    return arr
  }, [data, dbEmail, somenteAbertos])

  const totalPags  = Math.max(1, Math.ceil(sessoesFiltradas.length / PAGE_SIZE))
  const pagRegistros = sessoesFiltradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  const temFiltro = !!(dataInicio || dataFim || perfilFiltro || emailBusca || somenteAbertos)

  function limpar() {
    setDataInicio(''); setDataFim(''); setPerfilFiltro(''); setEmailBusca(''); setSomenteAbertos(false); setPagina(1)
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  function exportarExcel() {
    if (!sessoesFiltradas.length) return
    const wb = XLSX.utils.book_new()

    const ws1 = XLSX.utils.json_to_sheet(sessoesFiltradas.map(s => ({
      'E-mail':          s.email,
      'Perfil':          PERFIL_CFG[s.perfil]?.label ?? s.perfil,
      'Login em':        fmtTs(s.login_em),
      'Logout em':       fmtTs(s.logout_em),
      'Duração':         fmtDuracao(s.duracao_segundos),
      'Duração (seg)':   s.duracao_segundos ?? '',
      'IP':              s.ip ?? '',
      'Status':          s.logout_em ? 'Encerrada' : 'Em aberto',
    })))
    ws1['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Sessões')

    // Resumo por perfil
    const ws2 = XLSX.utils.json_to_sheet(
      Object.entries(data?.porPerfil ?? {}).map(([perfil, n]) => ({ 'Perfil': perfil, 'Sessões': n }))
    )
    ws2['!cols'] = [{ wch: 15 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Perfil')

    // Por usuário
    const porUsuario: Record<string, { email: string; total: number; totalSeg: number }> = {}
    for (const s of sessoesFiltradas) {
      const cur = porUsuario[s.email] ?? { email: s.email, total: 0, totalSeg: 0 }
      cur.total++
      cur.totalSeg += s.duracao_segundos ?? 0
      porUsuario[s.email] = cur
    }
    const ws3 = XLSX.utils.json_to_sheet(
      Object.values(porUsuario).sort((a, b) => b.total - a.total).map(u => ({
        'E-mail':         u.email,
        'Total de Sessões': u.total,
        'Tempo Total':    fmtDuracao(u.totalSeg),
      }))
    )
    ws3['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Usuário')

    XLSX.writeFile(wb, `sessoes_sistema_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  function exportarPDF() {
    const w = window.open('', '_blank')!
    const rows = sessoesFiltradas.slice(0, 2000)
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Sessões do Sistema</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 20px; }
  h1 { font-size: 16px; color: #1A3A2C; margin-bottom: 4px; }
  .sub { font-size: 9px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1A3A2C; color: white; padding: 5px 6px; text-align: left; font-size: 9px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  .badge { display: inline-block; padding: 1px 5px; border-radius: 99px; font-size: 8px; font-weight: 600; }
  @media print { button { display: none; } }
</style></head>
<body>
<h1>Sessões do Sistema</h1>
<p class="sub">Gerado em: ${fmtTs(new Date().toISOString())} · Total: ${rows.length} sessões</p>
<table>
<thead><tr>
  <th>E-mail</th><th>Perfil</th><th>Login</th><th>Logout</th><th>Duração</th><th>IP</th><th>Status</th>
</tr></thead>
<tbody>
${rows.map(s => {
  const cfg = PERFIL_CFG[s.perfil] ?? PERFIL_CFG.desconhecido
  return `<tr>
  <td>${s.email}</td>
  <td><span class="badge" style="background:${cfg.bg};color:${cfg.cor}">${cfg.label}</span></td>
  <td>${fmtDate(s.login_em)}<br/><small>${fmtTime(s.login_em)}</small></td>
  <td>${s.logout_em ? fmtDate(s.logout_em) + '<br/><small>' + fmtTime(s.logout_em) + '</small>' : '—'}</td>
  <td>${fmtDuracao(s.duracao_segundos)}</td>
  <td style="font-family:monospace;font-size:8px">${s.ip ?? '—'}</td>
  <td>${s.logout_em ? 'Encerrada' : '<b style="color:#d97706">Em aberto</b>'}</td>
</tr>`}).join('')}
</tbody></table>
<script>window.onload=()=>window.print()</script>
</body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-5 mt-8 pt-8 border-t border-gray-100">

      {/* Cabeçalho da seção */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-[#1A3A2C] rounded-xl">
          <LogIn className="w-4 h-4 text-[#5BBD9B]" />
        </div>
        <div>
          <h2 className="font-bold text-[#1A3A2C] text-sm">Relatório de Sessões</h2>
          <p className="text-xs text-gray-400">Histórico de login, logout e tempo de sessão por usuário</p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#1A3A2C]">
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </span>
          <div className="flex gap-2 flex-wrap">
            {temFiltro && (
              <button onClick={limpar} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 transition">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
            <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-[#1A3A2C] hover:bg-[#2a5040] transition disabled:opacity-60">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Atualizar
            </button>
            <button onClick={exportarExcel} disabled={!sessoesFiltradas.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={exportarPDF} disabled={!sessoesFiltradas.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-40">
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Data início */}
          <div>
            <FLabel>Data início</FLabel>
            <FInput type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          {/* Data fim */}
          <div>
            <FLabel>Data fim</FLabel>
            <FInput type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          {/* Perfil */}
          <div>
            <FLabel>Perfil</FLabel>
            <FSelect value={perfilFiltro} onChange={e => setPerfilFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="admin">Admin</option>
              <option value="empresa">Empresa</option>
              <option value="medico">Médico</option>
              <option value="paciente">Paciente</option>
            </FSelect>
          </div>
          {/* Busca email */}
          <div className="lg:col-span-2">
            <FLabel>E-mail</FLabel>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={emailBusca}
                onChange={e => { setEmailBusca(e.target.value); setPagina(1) }}
                placeholder="Buscar por e-mail..."
                className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white"
              />
            </div>
          </div>
          {/* Toggle sessões abertas */}
          <div className="flex items-end">
            <button
              onClick={() => { setSomenteAbertos(v => !v); setPagina(1) }}
              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
                somenteAbertos
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              {somenteAbertos ? 'Em aberto ✓' : 'Em aberto'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total de sessões"    value={sessoesFiltradas.length}  icon={LogIn}   cor="#1A3A2C" />
            <KpiCard label="Usuários únicos"      value={new Set(sessoesFiltradas.map(s => s.email)).size} icon={Users} cor="#3b82f6" />
            <KpiCard label="Sessões encerradas"   value={sessoesFiltradas.filter(s => s.logout_em).length} icon={LogOut} cor="#10b981" />
            <KpiCard label="Em aberto"            value={sessoesFiltradas.filter(s => !s.logout_em).length} icon={WifiOff} cor="#f59e0b" />
            <KpiCard label="Duração média"        value={fmtDuracao(data?.kpis.mediaSeg ?? null)} icon={Clock} cor="#8b5cf6" />
            <KpiCard label="Maior sessão"         value={fmtDuracao(data?.kpis.maxSeg ?? null)}  icon={Clock} cor="#ec4899" />
          </div>

          {/* ── Por perfil ── */}
          {data && Object.keys(data.porPerfil).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-[#1A3A2C] mb-4">Sessões por perfil</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.porPerfil).sort((a, b) => b[1] - a[1]).map(([perfil, n]) => {
                  const cfg = PERFIL_CFG[perfil] ?? PERFIL_CFG.desconhecido
                  return (
                    <div key={perfil} className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: cfg.bg, borderColor: `${cfg.cor}33` }}>
                      <span className="text-2xl font-bold" style={{ color: cfg.cor }}>{n}</span>
                      <span className="text-xs font-semibold" style={{ color: cfg.cor }}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Tabela ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-[#1A3A2C]" />
                <span className="font-semibold text-[#1A3A2C] text-sm">Registro de Sessões</span>
                <span className="text-xs text-gray-400">({sessoesFiltradas.length} registros)</span>
              </div>
              <span className="text-xs text-gray-400">Página {pagina} de {totalPags}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">E-mail</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Perfil</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Data Login</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Hora Login</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Hora Logout</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Duração</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">IP</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagRegistros.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                        Nenhuma sessão encontrada
                      </td>
                    </tr>
                  ) : (
                    pagRegistros.map(s => {
                      const emAberto = !s.logout_em
                      return (
                        <tr key={s.id} className={`border-b border-gray-50 transition-colors ${emAberto ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3 text-xs text-gray-700 font-mono">{s.email}</td>
                          <td className="px-4 py-3"><PerfilBadge perfil={s.perfil} /></td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(s.login_em)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">{fmtTime(s.login_em)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap font-mono">
                            {s.logout_em ? fmtTime(s.logout_em) : <span className="text-amber-500 font-medium">em aberto</span>}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {s.duracao_segundos != null ? (
                              <span className="font-semibold text-[#1A3A2C]">{fmtDuracao(s.duracao_segundos)}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-gray-400 font-mono whitespace-nowrap">{s.ip ?? '—'}</td>
                          <td className="px-4 py-3">
                            {emAberto ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <Wifi className="w-3 h-3" /> Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <WifiOff className="w-3 h-3" /> Encerrada
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPags > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(7, totalPags) }, (_, i) => {
                    let p = totalPags <= 7 ? i + 1 : pagina <= 4 ? i + 1 : pagina >= totalPags - 3 ? totalPags - 6 + i : pagina - 3 + i
                    return (
                      <button key={p} onClick={() => setPagina(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition ${p === pagina ? 'bg-[#1A3A2C] text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                        {p}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
