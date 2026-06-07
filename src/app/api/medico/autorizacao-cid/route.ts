import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/medico/autorizacao-cid
 * Médico cria um pedido de autorização de CID para o paciente responder.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: medico } = await admin
    .from('medicos').select('id, status').eq('usuario_id', user.id).single()
  if (!medico || medico.status !== 'aprovado')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { atendimento_id, paciente_id, cid } = await req.json()
  if (!atendimento_id || !paciente_id || !cid)
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })

  // Cancela qualquer pedido pendente anterior para este atendimento
  await admin.from('autorizacoes_cid')
    .update({ status: 'negado', respondido_em: new Date().toISOString() })
    .eq('atendimento_id', atendimento_id)
    .eq('status', 'pendente')

  const { data, error } = await admin.from('autorizacoes_cid').insert({
    atendimento_id, paciente_id, cid, status: 'pendente',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ autorizacao: data })
}
