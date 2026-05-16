import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/medico/assumir-paciente
 *
 * Atribui o médico autenticado ao atendimento antes de entrar na consulta.
 * Regras de negócio:
 *  - O médico não pode assumir um novo paciente se já tiver uma consulta em andamento
 *  - O médico não pode assumir um novo paciente se já tiver outro aguardando (encaminhado ou assumido)
 *  - Race condition: usa .is('medico_id', null) para garantir atomicidade
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

  // ── Regra 1: médico não pode assumir se já tem consulta em andamento ──────
  const { data: consultaAtiva } = await admin
    .from('atendimentos')
    .select('id')
    .eq('medico_id', medico.id)
    .eq('status', 'em_andamento')
    .maybeSingle()

  if (consultaAtiva) {
    return NextResponse.json({
      error: 'Você está em uma consulta em andamento. Finalize a consulta atual antes de assumir outro paciente.',
    }, { status: 409 })
  }

  // ── Regra 2: médico não pode assumir se já tem outro paciente aguardando ──
  // (seja por encaminhamento ou por ter clicado no nome de outro paciente)
  // Exceção: laranja (urgente=true) + encaminhado não é laranja + nenhum outro médico online
  const [{ data: outroPendente }, { data: alvoInfo }] = await Promise.all([
    admin
      .from('atendimentos')
      .select('id, urgente, pacientes(nome)')
      .eq('medico_id', medico.id)
      .eq('status', 'aguardando')
      .neq('id', atendimento_id) // ignora o próprio alvo (idempotência)
      .maybeSingle(),
    admin
      .from('atendimentos')
      .select('urgente')
      .eq('id', atendimento_id)
      .maybeSingle(),
  ])

  if (outroPendente) {
    const alvoEhUrgente    = alvoInfo?.urgente === true
    const pendenteEhUrgente = (outroPendente as any).urgente === true

    let excecaoPermitida = false

    // Excepção: novo paciente é laranja + encaminhado não é laranja + nenhum outro médico online
    if (alvoEhUrgente && !pendenteEhUrgente) {
      const limiteOnline = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const { data: outrosMedOnline } = await admin
        .from('presenca_medicos')
        .select('medico_id')
        .gt('ultimo_ping', limiteOnline)
        .neq('medico_id', medico.id)

      if (!outrosMedOnline || outrosMedOnline.length === 0) {
        excecaoPermitida = true
      }
    }

    if (!excecaoPermitida) {
      const nomePaciente = (outroPendente as any).pacientes?.nome || 'outro paciente'
      return NextResponse.json({
        error: `Você já tem "${nomePaciente}" aguardando atendimento. Finalize essa consulta antes de assumir outro paciente.`,
      }, { status: 409 })
    }
  }

  // ── Verificar estado do atendimento alvo ──────────────────────────────────
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

  // Idempotente: este médico já assumiu
  if (atendimento.medico_id === medico.id) {
    return NextResponse.json({ ok: true })
  }

  // Já assumido por outro médico
  if (atendimento.medico_id !== null) {
    return NextResponse.json({ error: 'Paciente já foi assumido por outro médico' }, { status: 409 })
  }

  // ── Assumir atomicamente ──────────────────────────────────────────────────
  const { data: atualizado, error } = await admin
    .from('atendimentos')
    .update({ medico_id: medico.id })
    .eq('id', atendimento_id)
    .is('medico_id', null) // proteção contra race condition
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!atualizado || atualizado.length === 0) {
    return NextResponse.json({ error: 'Paciente já foi assumido por outro médico' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
