import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/logs-antecedentes
 * Retorna todas as edições de antecedentes pessoais para auditoria admin.
 * Suporta filtros: dataInicio, dataFim, nomePaciente, nomeMedico
 */
export async function GET(req: NextRequest) {
  await requireAdmin()
  const admin = createAdminClient()

  const { searchParams } = new URL(req.url)
  const dataInicio   = searchParams.get('dataInicio') || ''
  const dataFim      = searchParams.get('dataFim')    || ''
  const nomePaciente = searchParams.get('paciente')?.toLowerCase().trim() || ''
  const nomeMedico   = searchParams.get('medico')?.toLowerCase().trim()   || ''

  const tsInicio = dataInicio ? new Date(dataInicio + 'T00:00:00-03:00').toISOString() : null
  const tsFim    = dataFim    ? new Date(dataFim    + 'T23:59:59-03:00').toISOString() : null

  let q = admin
    .from('logs_antecedentes')
    .select(`
      id, criado_em, campos_alterados, ip_address,
      paciente_id, medico_id,
      medicos(id, nome, crm, crm_uf, sexo),
      pacientes(id, nome, cpf)
    `)
    .order('criado_em', { ascending: false })
    .limit(500)

  if (tsInicio) q = q.gte('criado_em', tsInicio)
  if (tsFim)    q = q.lte('criado_em', tsFim)

  const { data: rows, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtros por nome (client-side após fetch para manter query simples)
  let resultado = rows ?? []
  if (nomePaciente) {
    resultado = resultado.filter((r: any) =>
      (r.pacientes?.nome ?? '').toLowerCase().includes(nomePaciente)
    )
  }
  if (nomeMedico) {
    resultado = resultado.filter((r: any) =>
      (r.medicos?.nome ?? '').toLowerCase().includes(nomeMedico)
    )
  }

  return NextResponse.json({ logs: resultado, total: resultado.length })
}
