/**
 * GET /api/agendamento/lembrete
 *
 * Rota executada pelo Vercel Cron uma vez por dia às 12:00 UTC (09:00 BRT).
 * Busca todos os agendamentos confirmados do dia seguinte e envia
 * lembretes antecipados por email e WhatsApp para paciente e médico.
 *
 * Plano Hobby do Vercel: máximo 1 execução por dia.
 * Para lembretes em tempo real (1h antes), use cron-job.org gratuitamente
 * apontando para esta mesma URL a cada hora — o parâmetro ?janela=1h
 * alterna o modo de busca automaticamente.
 *
 * Para disparar manualmente:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://seusite.vercel.app/api/agendamento/lembrete
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://seusite.vercel.app/api/agendamento/lembrete?janela=1h
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

  // Modo de busca:
  //   ?janela=1h  → consultas entre 60–75 min no futuro (para cron externo horário)
  //   padrão      → consultas do dia seguinte (para cron Vercel diário às 09h BRT)
  const url = new URL(req.url)
  const janela = url.searchParams.get('janela')

  const agora = Date.now()
  let de: string, ate: string

  if (janela === '1h') {
    // Janela de 15 min centrada em 1 hora: evita duplicatas mesmo com atraso do cron
    de  = new Date(agora + 60 * 60 * 1000).toISOString()
    ate = new Date(agora + 75 * 60 * 1000).toISOString()
  } else {
    // Dia seguinte completo (00:00–23:59 de amanhã em UTC-3 / BRT)
    const amanha = new Date(agora + 24 * 60 * 60 * 1000)
    amanha.setUTCHours(3, 0, 0, 0)   // 00:00 BRT = 03:00 UTC
    const amanhaFim = new Date(amanha.getTime() + 24 * 60 * 60 * 1000 - 1)
    de  = amanha.toISOString()
    ate = amanhaFim.toISOString()
  }

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
