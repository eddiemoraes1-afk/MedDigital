import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const admin = createAdminClient()

  const { searchParams } = new URL(req.url)
  const de  = searchParams.get('de')  ?? new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
  const ate = searchParams.get('ate') ?? new Date().toISOString().split('T')[0]

  // Pacientes desta empresa
  const { data: vinculos } = await admin
    .from('vinculos_empresa')
    .select('id, paciente_id, nome_completo, cargo, tipo_cargo, departamento, relacao')
    .eq('empresa_id', empresaId)

  const pacienteIds = (vinculos ?? []).filter(v => v.paciente_id).map(v => v.paciente_id) as string[]

  if (pacienteIds.length === 0) {
    return NextResponse.json({ consultas: [], total: 0 })
  }

  const vinculoByPacId: Record<string, any> = {}
  ;(vinculos ?? []).forEach(v => { if (v.paciente_id) vinculoByPacId[v.paciente_id] = v })

  const deISO  = `${de}T00:00:00.000Z`
  const ateISO = `${ate}T23:59:59.999Z`

  // Atendimentos concluídos no período
  const { data: atendimentos } = await admin
    .from('atendimentos')
    .select('id, criado_em, finalizado_em, paciente_id, medico_id, agendamento_id, valor_cobrado')
    .in('paciente_id', pacienteIds)
    .eq('status', 'concluido')
    .gte('criado_em', deISO)
    .lte('criado_em', ateISO)
    .order('criado_em', { ascending: false })

  const ats = atendimentos ?? []
  const atIds = ats.map(a => a.id)

  // Médicos
  const medicoIds = [...new Set(ats.map(a => a.medico_id).filter(Boolean))] as string[]
  const { data: medicosData } = medicoIds.length > 0
    ? await admin.from('medicos').select('id, nome, especialidade').in('id', medicoIds)
    : { data: [] }
  const medicoMap: Record<string, { nome: string; especialidade: string }> = {}
  ;(medicosData ?? []).forEach(m => { medicoMap[m.id] = { nome: m.nome, especialidade: m.especialidade ?? '' } })

  // Receitas vinculadas aos atendimentos
  const { data: receitasData } = atIds.length > 0
    ? await admin
        .from('receitas')
        .select('id, atendimento_id, observacao, status')
        .in('atendimento_id', atIds)
        .eq('status', 'emitida')
    : { data: [] }
  const receitasByAt: Record<string, number> = {}
  ;(receitasData ?? []).forEach(r => {
    if (r.atendimento_id) receitasByAt[r.atendimento_id] = (receitasByAt[r.atendimento_id] ?? 0) + 1
  })

  // Atestados vinculados aos atendimentos
  const { data: atestadosData } = atIds.length > 0
    ? await admin
        .from('atestados')
        .select('id, atendimento_id, dias, cid, data_inicio, data_fim')
        .in('atendimento_id', atIds)
    : { data: [] }
  const atestadosByAt: Record<string, Array<{ dias: number; cid: string | null }>> = {}
  ;(atestadosData ?? []).forEach(a => {
    if (a.atendimento_id) {
      if (!atestadosByAt[a.atendimento_id]) atestadosByAt[a.atendimento_id] = []
      atestadosByAt[a.atendimento_id].push({ dias: a.dias ?? 0, cid: a.cid ?? null })
    }
  })

  // Montar resposta
  const consultas = ats.map(a => {
    const vinculo = vinculoByPacId[a.paciente_id]
    const medico = medicoMap[a.medico_id] ?? { nome: '—', especialidade: '—' }
    const receitas = receitasByAt[a.id] ?? 0
    const atestados = atestadosByAt[a.id] ?? []

    return {
      id: a.id,
      data: a.finalizado_em ?? a.criado_em,
      tipo: a.agendamento_id ? 'Agendada' : 'Virtual',
      paciente_id: a.paciente_id,
      funcionario: vinculo?.nome_completo ?? '—',
      relacao: vinculo?.relacao ?? 'Funcionário',
      cargo: vinculo?.cargo ?? '—',
      secretaria: vinculo?.departamento ?? '—',
      medico: medico.nome,
      especialidade: medico.especialidade,
      receitas,
      atestados: atestados.length,
      atestado_dias: atestados.reduce((s, x) => s + (x.dias ?? 0), 0),
      atestado_cid: atestados.map(x => x.cid).filter(Boolean).join(', ') || null,
    }
  })

  return NextResponse.json({ consultas, total: consultas.length })
}
