import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Tempo sem heartbeat para considerar sessão encerrada (horas)
const TIMEOUT_HORAS = 4

async function autoCleanup(admin: ReturnType<typeof createAdminClient>) {
  try {
    const limite = new Date(Date.now() - TIMEOUT_HORAS * 60 * 60 * 1000).toISOString()
    // Busca sessões antigas sem logout
    const { data: velhas } = await admin
      .from('sessoes_sistema')
      .select('id, login_em')
      .is('logout_em', null)
      .lt('login_em', limite)
    if (!velhas || velhas.length === 0) return
    for (const s of velhas) {
      const logoutEst = new Date(
        new Date((s as any).login_em).getTime() + TIMEOUT_HORAS * 60 * 60 * 1000
      ).toISOString()
      await admin.from('sessoes_sistema').update({
        logout_em: logoutEst,
        duracao_segundos: TIMEOUT_HORAS * 3600,
      }).eq('id', (s as any).id)
    }
  } catch { /* silencioso */ }
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const admin = createAdminClient()

  // Fechar automaticamente sessões antigas sem logout (fire-and-forget)
  autoCleanup(admin)

  const { searchParams } = new URL(req.url)
  const dataInicio  = searchParams.get('dataInicio') || ''
  const dataFim     = searchParams.get('dataFim')    || ''
  const emailFiltro = searchParams.get('email')?.toLowerCase().trim() || ''
  const perfilFiltro= searchParams.get('perfil')     || ''

  const tsInicio = dataInicio ? new Date(dataInicio + 'T00:00:00-03:00').toISOString() : null
  const tsFim    = dataFim    ? new Date(dataFim    + 'T23:59:59-03:00').toISOString() : null

  let q = admin
    .from('sessoes_sistema')
    .select('id, usuario_id, email, perfil, login_em, logout_em, duracao_segundos, ip')
    .order('login_em', { ascending: false })
    .limit(2000)

  if (tsInicio) q = q.gte('login_em', tsInicio)
  if (tsFim)    q = q.lte('login_em', tsFim)
  if (perfilFiltro) q = q.eq('perfil', perfilFiltro)

  const { data: rows, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sessoes = rows ?? []

  // Filtro por email (client-side para suportar partial match)
  if (emailFiltro) {
    sessoes = sessoes.filter((s: any) => s.email.toLowerCase().includes(emailFiltro))
  }

  // KPIs
  const total         = sessoes.length
  const comLogout     = sessoes.filter((s: any) => s.logout_em).length
  const emAberto      = total - comLogout
  const duracoes      = sessoes.filter((s: any) => s.duracao_segundos != null).map((s: any) => s.duracao_segundos as number)
  const mediaSeg      = duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : 0
  const maxSeg        = duracoes.length ? Math.max(...duracoes) : 0
  const usuariosUnicos= new Set(sessoes.map((s: any) => s.usuario_id)).size

  // Por perfil
  const porPerfil: Record<string, number> = {}
  for (const s of sessoes) porPerfil[(s as any).perfil] = (porPerfil[(s as any).perfil] ?? 0) + 1

  // Lista de emails únicos para filtro no frontend
  const emails = [...new Set(sessoes.map((s: any) => s.email))].sort()

  return NextResponse.json({
    sessoes,
    kpis: { total, comLogout, emAberto, mediaSeg, maxSeg, usuariosUnicos },
    porPerfil,
    emails,
  })
}
