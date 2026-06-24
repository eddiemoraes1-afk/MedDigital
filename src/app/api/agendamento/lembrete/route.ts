/**
 * GET /api/agendamento/lembrete
 *
 * Rota executada pelo Vercel Cron a cada hora (vercel.json).
 * Busca agendamentos confirmados cuja data_hora esteja entre
 * 60 e 75 minutos no futuro e envia lembretes por email e WhatsApp
 * para o paciente e para o médico.
 *
 * A janela de 15 minutos (60–75 min) garante que, mesmo que o cron
 * atrase alguns minutos, o lembrete ainda seja enviado sem duplicatas.
 *
 * Para disparar manualmente em dev:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/agendamento/lembrete
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  enviarEmailLembretePaciente,
  enviarEmailLembreteMedico,
  enviarWhatsAppLembrete,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Proteção simples: aceita apenas chamadas do Vercel Cron (Authorization header)
  // ou chamadas internas sem o header (ambiente de dev)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Janela: agendamentos entre 60 e 75 minutos a partir de agora
  const agora = Date.now()
  const de  = new Date(agora + 60 * 60 * 1000).toISOString()   // +60 min
  const ate = new Date(agora + 75 * 60 * 1000).toISOString()   // +75 min

  const { data: agendamentos, error } = await admin
    .from('agendamentos')
    .select('id, data_hora, paciente_id, medico_id')
    .in('status', ['confirmado', 'agendado'])
    .gte('data_hora', de)
    .lte('data_hora', ate)

  if (error) {
    console.error('[LEMBRETE CRON] Erro ao buscar agendamentos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!agendamentos || agendamentos.length === 0) {
    console.log('[LEMBRETE CRON] Nenhum agendamento na janela 60–75 min')
    return NextResponse.json({ enviados: 0 })
  }

  console.log(`[LEMBRETE CRON] ${agendamentos.length} agendamento(s) para lembrar`)

  // Buscar pacientes e médicos em batch
  const pacienteIds = [...new Set(agendamentos.map((a: any) => a.paciente_id))]
  const medicoIds   = [...new Set(agendamentos.map((a: any) => a.medico_id))]

  const [{ data: pacientes }, { data: medicos }] = await Promise.all([
    admin.from('pacientes').select('id, nome, telefone').in('id', pacienteIds),
    admin.from('medicos').select('id, nome, especialidade, sexo, usuario_id').in('id', medicoIds),
  ])

  const pacienteMap: Record<string, any> = {}
  ;(pacientes || []).forEach((p: any) => { pacienteMap[p.id] = p })

  const medicoMap: Record<string, any> = {}
  ;(medicos || []).forEach((m: any) => { medicoMap[m.id] = m })

  // Buscar emails dos médicos via Auth
  const emailsMedico: Record<string, string> = {}
  await Promise.all(
    (medicos || []).map(async (m: any) => {
      if (!m.usuario_id) return
      try {
        const { data } = await admin.auth.admin.getUserById(m.usuario_id)
        if (data?.user?.email) emailsMedico[m.id] = data.user.email
      } catch { /* silencia */ }
    })
  )

  // Buscar emails dos pacientes via Auth (via usuarios vinculados)
  const { data: pacientesAuth } = await admin
    .from('pacientes')
    .select('id, usuario_id')
    .in('id', pacienteIds)

  const emailsPaciente: Record<string, string> = {}
  await Promise.all(
    (pacientesAuth || []).map(async (p: any) => {
      if (!p.usuario_id) return
      try {
        const { data } = await admin.auth.admin.getUserById(p.usuario_id)
        if (data?.user?.email) emailsPaciente[p.id] = data.user.email
      } catch { /* silencia */ }
    })
  )

  let enviados = 0

  await Promise.all(
    agendamentos.map(async (ag: any) => {
      const paciente = pacienteMap[ag.paciente_id]
      const medico   = medicoMap[ag.medico_id]
      if (!paciente || !medico) return

      const dataHora = new Date(ag.data_hora.endsWith('Z') ? ag.data_hora : ag.data_hora + 'Z')
      const emailPaciente = emailsPaciente[ag.paciente_id]
      const emailMedico   = emailsMedico[ag.medico_id]

      const dadosBase = {
        pacienteNome:       paciente.nome,
        pacienteEmail:      emailPaciente || '',
        pacienteTelefone:   paciente.telefone,
        medicoNome:         medico.nome,
        medicoSexo:         medico.sexo ?? null,
        medicoEspecialidade: medico.especialidade || '',
        dataHora,
      }

      const promises = []

      // Lembrete para o paciente (email + WhatsApp)
      if (emailPaciente) {
        promises.push(enviarEmailLembretePaciente(dadosBase))
      }
      if (paciente.telefone) {
        promises.push(enviarWhatsAppLembrete(dadosBase))
      }

      // Lembrete para o médico (email)
      if (emailMedico) {
        promises.push(enviarEmailLembreteMedico({ ...dadosBase, medicoEmail: emailMedico }))
      }

      await Promise.allSettled(promises)
      enviados++
    })
  )

  console.log(`[LEMBRETE CRON] Lembretes enviados para ${enviados} agendamento(s)`)
  return NextResponse.json({ enviados })
}
