import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Chamado pelo HeartbeatProvider a cada 2 minutos enquanto o usuário está ativo.
// Atualiza ultima_atividade da sessão aberta mais recente do usuário.
// Também marca no Supabase Auth que a sessão ainda está viva.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const admin = createAdminClient()
    const agora = new Date().toISOString()

    // Atualizar ultima_atividade da sessão aberta mais recente
    // Se a coluna ultima_atividade não existir ainda, o erro é silenciado
    await admin
      .from('sessoes_sistema')
      .update({ ultima_atividade: agora })
      .eq('usuario_id', user.id)
      .is('logout_em', null)
      .order('login_em', { ascending: false })
      .limit(1)

    return NextResponse.json({ ok: true, ts: agora })
  } catch {
    // Silencioso — não queremos quebrar a UX por causa do heartbeat
    return NextResponse.json({ ok: false })
  }
}
