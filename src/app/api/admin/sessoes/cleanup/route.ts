import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'

// INATIVIDADE_MINUTOS: minutos sem heartbeat para encerrar a sessão
const INATIVIDADE_MINUTOS = 30

// TIMEOUT_SEM_HEARTBEAT_HORAS: horas sem nenhum heartbeat (sessões antigas, pré-coluna)
const TIMEOUT_SEM_HEARTBEAT_HORAS = 4

export async function POST(req: NextRequest) {
  // Permite chamada interna (sem auth) via header interno OU chamada admin normal
  const ehInterno = req.headers.get('x-internal-call') === process.env.INTERNAL_CLEANUP_TOKEN
  if (!ehInterno) await requireAdmin()

  const admin = createAdminClient()
  const agora = new Date()

  const limiteInatividade = new Date(agora.getTime() - INATIVIDADE_MINUTOS * 60 * 1000).toISOString()
  const limiteSemHeartbeat = new Date(agora.getTime() - TIMEOUT_SEM_HEARTBEAT_HORAS * 60 * 60 * 1000).toISOString()

  let totalFechadas = 0

  // ── 1. Sessões com heartbeat, mas última atividade > 30 min atrás ──────────
  try {
    const { data: comHeartbeat } = await admin
      .from('sessoes_sistema')
      .select('id, login_em, ultima_atividade')
      .is('logout_em', null)
      .not('ultima_atividade', 'is', null)
      .lt('ultima_atividade', limiteInatividade)

    if (comHeartbeat && comHeartbeat.length > 0) {
      for (const s of comHeartbeat) {
        const ultimaAtiv = (s as any).ultima_atividade
        const loginEm = (s as any).login_em
        const encerradoEm = ultimaAtiv ?? agora.toISOString()
        const duracao = Math.round(
          (new Date(encerradoEm).getTime() - new Date(loginEm).getTime()) / 1000
        )
        await admin
          .from('sessoes_sistema')
          .update({ logout_em: encerradoEm, duracao_segundos: Math.max(0, duracao) })
          .eq('id', (s as any).id)
        totalFechadas++
      }
    }
  } catch {
    // Coluna ultima_atividade pode não existir ainda — ignorar
  }

  // ── 2. Sessões sem heartbeat, abertas há mais de 4 horas ──────────────────
  try {
    const { data: semHeartbeat } = await admin
      .from('sessoes_sistema')
      .select('id, login_em')
      .is('logout_em', null)
      .is('ultima_atividade', null)
      .lt('login_em', limiteSemHeartbeat)

    if (semHeartbeat && semHeartbeat.length > 0) {
      for (const s of semHeartbeat) {
        const loginEm = (s as any).login_em
        // Estima o encerramento como login + timeout
        const logoutEstimado = new Date(
          new Date(loginEm).getTime() + TIMEOUT_SEM_HEARTBEAT_HORAS * 60 * 60 * 1000
        ).toISOString()
        await admin
          .from('sessoes_sistema')
          .update({
            logout_em: logoutEstimado,
            duracao_segundos: TIMEOUT_SEM_HEARTBEAT_HORAS * 3600,
          })
          .eq('id', (s as any).id)
        totalFechadas++
      }
    }
  } catch {
    // Fallback: sem coluna ultima_atividade, apenas filtrar por login_em
    const { data: sessoesVelhas } = await admin
      .from('sessoes_sistema')
      .select('id, login_em')
      .is('logout_em', null)
      .lt('login_em', limiteSemHeartbeat)

    if (sessoesVelhas && sessoesVelhas.length > 0) {
      for (const s of sessoesVelhas) {
        const loginEm = (s as any).login_em
        const logoutEstimado = new Date(
          new Date(loginEm).getTime() + TIMEOUT_SEM_HEARTBEAT_HORAS * 60 * 60 * 1000
        ).toISOString()
        await admin
          .from('sessoes_sistema')
          .update({
            logout_em: logoutEstimado,
            duracao_segundos: TIMEOUT_SEM_HEARTBEAT_HORAS * 3600,
          })
          .eq('id', (s as any).id)
        totalFechadas++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    fechadas: totalFechadas,
    thresholds: {
      comHeartbeat: `${INATIVIDADE_MINUTOS} minutos`,
      semHeartbeat: `${TIMEOUT_SEM_HEARTBEAT_HORAS} horas`,
    },
  })
}
