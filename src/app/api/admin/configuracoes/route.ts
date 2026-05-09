import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  await requireAdmin()
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('configuracoes_sistema')
    .select('chave, valor')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const config: Record<string, string> = {}
  for (const row of data ?? []) config[row.chave] = row.valor
  return NextResponse.json(config)
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json()
  const adminSupabase = createAdminClient()

  const updates = Object.entries(body as Record<string, string>)
  for (const [chave, valor] of updates) {
    const { error } = await adminSupabase
      .from('configuracoes_sistema')
      .upsert({ chave, valor: String(valor) }, { onConflict: 'chave' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
