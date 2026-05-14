import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/medico/assumir-paciente
 *
 * Atribui o médico autenticado ao atendimento ANTES de entrar na consulta.
 * Acontece quando o médico clica no nome do paciente na fila (vai ao prontuário)
 * ou quando clica em "Atender".
 *
 * Usa update condicional (.is('medico_id', null)) para garantir atomicidade:
 * se dois médicos tentarem simultaneamente, apenas um ganha.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { atendimento_id } = await req.json()
  if (!atendimento_id) {
    return NextResponse.json({ error: 'atendimento_id obrigatório' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar médico aprovado
  const { data: medico } = await admin
    .from('medicos')
    .select('id, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Verificar estado atual do atendimento
  const { data: atendimento } = await admin
    .from('atendimentos')
    .select('id, status, medico_id')
    .eq('id', atendimento_id)
    .single()

  if (!atendimento) {
    return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 })
  }

  if (atendimento.status !== 'aguardando') {
    return NextResponse.json({ error: 'Atendimento não está aguardando' }, { status: 409 })
  }

  // Idempotente: já é deste médico
  if (atendimento.medico_id === medico.id) {
    return NextResponse.json({ ok: true })
  }

  // Já assumido por outro médico
  if (atendimento.medico_id !== null) {
    return NextResponse.json({ error: 'Paciente já foi assumido por outro médico' }, { status: 409 })
  }

  // Assumir atomicamente: só atualiza se medico_id ainda for null
  const { data: atualizado, error } = await admin
    .from('atendimentos')
    .update({ medico_id: medico.id })
    .eq('id', atendimento_id)
    .is('medico_id', null)  // proteção contra race condition
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!atualizado || atualizado.length === 0) {
    // Outra requisição ganhou a corrida
    return NextResponse.json({ error: 'Paciente já foi assumido por outro médico' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
