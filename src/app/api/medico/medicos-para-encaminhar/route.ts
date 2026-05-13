import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a medico
  const { data: medicoAtual } = await supabase
    .from('medicos')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!medicoAtual) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminSupabase = createAdminClient()
  const onlineThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString()

  const [medicosRes, presencaRes] = await Promise.all([
    adminSupabase
      .from('medicos')
      .select('id, nome, especialidade, crm, crm_uf, sexo, foto_url')
      .eq('status', 'aprovado')
      .neq('id', medicoAtual.id) // exclude self
      .order('nome'),
    adminSupabase
      .from('presenca_medicos')
      .select('medico_id')
      .gte('ultimo_ping', onlineThreshold),
  ])

  const medicos = medicosRes.data ?? []
  const presencaSet = new Set((presencaRes.data ?? []).map((p: any) => p.medico_id))

  const resultado = medicos.map((m: any) => ({
    ...m,
    online: presencaSet.has(m.id),
  }))

  // Online first, then alphabetical
  resultado.sort((a: any, b: any) => {
    if (a.online !== b.online) return b.online ? 1 : -1
    return a.nome.localeCompare(b.nome)
  })

  return NextResponse.json(resultado)
}
