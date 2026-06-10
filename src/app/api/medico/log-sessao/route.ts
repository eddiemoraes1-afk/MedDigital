import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/medico/log-sessao
 *
 * Registra um evento de sessão do médico (login, logout, assumiu_paciente, encerrou_consulta).
 * O IP é capturado automaticamente dos headers da requisição.
 *
 * Body: { tipo, descricao?, dados? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const admin = createAdminClient()

    const { data: medico } = await admin
      .from('medicos')
      .select('id')
      .eq('usuario_id', user.id)
      .single()

    if (!medico) return NextResponse.json({ ok: false }, { status: 404 })

    const { tipo, descricao, dados } = await req.json()

    if (!tipo) return NextResponse.json({ ok: false, error: 'tipo obrigatório' }, { status: 400 })

    // Capturar IP — respeita proxies/CDN
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'desconhecido'

    await admin.from('logs_sessao_medico').insert({
      medico_id: medico.id,
      tipo,
      descricao: descricao ?? null,
      ip,
      dados:     dados ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
