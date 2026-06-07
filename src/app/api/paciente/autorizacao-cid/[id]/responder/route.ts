import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * PATCH /api/paciente/autorizacao-cid/[id]/responder
 * Paciente responde se autoriza ou não a inclusão do CID no atestado.
 * Body: { resposta: 'autorizado' | 'negado' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const { resposta } = await req.json()

  if (!['autorizado', 'negado'].includes(resposta))
    return NextResponse.json({ error: 'Resposta inválida' }, { status: 400 })

  const admin = createAdminClient()

  // Verifica que a autorização pertence a este paciente
  const { data: paciente } = await admin
    .from('pacientes').select('id').eq('usuario_id', user.id).single()
  if (!paciente) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { error } = await admin
    .from('autorizacoes_cid')
    .update({ status: resposta, respondido_em: new Date().toISOString() })
    .eq('id', id)
    .eq('paciente_id', paciente.id)
    .eq('status', 'pendente')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status: resposta })
}
