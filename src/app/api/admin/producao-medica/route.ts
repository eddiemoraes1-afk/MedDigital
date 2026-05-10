import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  await requireAdmin()
  const admin = createAdminClient()
  const { searchParams } = new URL(req.url)

  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const inicio = searchParams.get('inicio') || defaultStart.toISOString().split('T')[0]
  const fim = searchParams.get('fim') || now.toISOString().split('T')[0]
  const medicoFiltro = searchParams.get('medico_id') || ''
  const espFiltro = searchParams.get('especialidade') || ''

  const deISO = `${inicio}T00:00:00.000Z`
  const ateISO = `${fim}T23:59:59.999Z`

  // ── Medicos (todos aprovados) ─────────────────────────────────────────────
  const { data: medicosData } = await admin
    .from('medicos')
    .select('id, nome, especialidade, crm, crm_uf')
    .eq('status', 'aprovado')
    .order('nome')
  const medicos = (medicosData ?? []) as any[]

  const especialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))].sort() as string[]

  // Medicos a consultar (após filtros de especialidade/médico)
  let medicosFiltrados = espFiltro ? medicos.filter(m => m.especialidade === espFiltro) : medicos
  if (medicoFiltro) medicosFiltrados = medicosFiltrados.filter(m => m.id === medicoFiltro)

  const medicoIds = medicosFiltrados.map(m => m.id)
  const medicoMap = new Map(medicos.map(m => [m.id, m]))

  // ── Queries paralelas ─────────────────────────────────────────────────────
  const [
    { data: atendimentos },
    { data: atestados },
    { data: receitas },
    { data: vinculos },
    { data: empresas },
  ] = await Promise.all([
    medicoIds.length > 0
      ? admin.from('atendimentos')
          .select('id, medico_id, paciente_id, criado_em, valor_cobrado, agendamento_id')
          .eq('status', 'concluido')
          .in('medico_id', medicoIds)
          .gte('criado_em', deISO)
          .lte('criado_em', ateISO)
          .order('criado_em', { ascending: false })
      : ({ data: [] } as any),

    medicoIds.length > 0
      ? admin.from('atestados')
          .select('id, medico_id, paciente_id, criado_em, dias, cid')
          .in('medico_id', medicoIds)
          .gte('criado_em', deISO)
          .lte('criado_em', ateISO)
      : ({ data: [] } as any),

    admin.from('receitas')
      .select('id, medico_id, paciente_id, valor_cobrado, criado_em, status')
      .eq('status', 'emitida')
      .gte('criado_em', deISO)
      .lte('criado_em', ateISO),

    admin.from('vinculos_empresa')
      .select('paciente_id, empresa_id, ativo'),

    admin.from('empresas')
      .select('id, nome, preco_consulta'),
  ])

  const ats = (atendimentos ?? []) as any[]
  const atests = (atestados ?? []) as any[]
  const recs = ((receitas ?? []) as any[]).filter((r: any) => {
    // Se receita tem medico_id, filtra pelo conjunto; senão inclui tudo
    if (r.medico_id && medicoIds.length > 0) return medicoIds.includes(r.medico_id)
    return true
  })

  // Lookup: paciente_id → empresa
  const pacienteEmpresa = new Map<string, string>()
  for (const v of (vinculos ?? []) as any[]) {
    if (!pacienteEmpresa.has(v.paciente_id)) pacienteEmpresa.set(v.paciente_id, v.empresa_id)
  }
  const empresaMap = new Map(((empresas ?? []) as any[]).map(e => [e.id, e]))

  function precoConsulta(pacienteId: string, valorFallback: number): number {
    const eId = pacienteEmpresa.get(pacienteId)
    const emp = eId ? (empresaMap.get(eId) as any) : null
    return emp?.preco_consulta ?? valorFallback ?? 0
  }

  // ── Produção por médico ───────────────────────────────────────────────────
  type ProdRow = {
    medico_id: string; nome: string; especialidade: string; crm: string
    consultas: number; faturamento: number; atestados: number; receitas: number; exames: number
  }
  const prodMap = new Map<string, ProdRow>()

  for (const m of medicosFiltrados) {
    prodMap.set(m.id, {
      medico_id: m.id, nome: m.nome,
      especialidade: m.especialidade ?? '—',
      crm: m.crm ? `${m.crm}/${m.crm_uf ?? ''}` : '—',
      consultas: 0, faturamento: 0, atestados: 0, receitas: 0, exames: 0,
    })
  }

  for (const a of ats) {
    const cur = prodMap.get(a.medico_id)
    if (!cur) continue
    cur.consultas++
    cur.faturamento += precoConsulta(a.paciente_id, a.valor_cobrado)
  }
  for (const a of atests) {
    const cur = prodMap.get(a.medico_id)
    if (cur) cur.atestados++
  }
  for (const r of recs) {
    if (r.medico_id) {
      const cur = prodMap.get(r.medico_id)
      if (cur) cur.receitas++
    }
  }

  const producao = [...prodMap.values()].sort((a, b) => b.faturamento - a.faturamento)

  // ── Por especialidade ─────────────────────────────────────────────────────
  const espMap = new Map<string, { especialidade: string; consultas: number; faturamento: number; medicos: Set<string> }>()
  for (const a of ats) {
    const m = medicoMap.get(a.medico_id) as any
    const esp = m?.especialidade ?? 'Não informado'
    const cur = espMap.get(esp) ?? { especialidade: esp, consultas: 0, faturamento: 0, medicos: new Set() }
    cur.consultas++
    cur.faturamento += precoConsulta(a.paciente_id, a.valor_cobrado)
    cur.medicos.add(a.medico_id)
    espMap.set(esp, cur)
  }
  const porEspecialidade = [...espMap.values()]
    .map(e => ({ ...e, medicos: e.medicos.size }))
    .sort((a, b) => b.faturamento - a.faturamento)

  // ── Por mês ───────────────────────────────────────────────────────────────
  const mesMap = new Map<string, { mes: string; consultas: number; faturamento: number; atestados: number; receitas: number }>()

  for (const a of ats) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(mes) ?? { mes, consultas: 0, faturamento: 0, atestados: 0, receitas: 0 }
    cur.consultas++
    cur.faturamento += precoConsulta(a.paciente_id, a.valor_cobrado)
    mesMap.set(mes, cur)
  }
  for (const a of atests) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(mes) ?? { mes, consultas: 0, faturamento: 0, atestados: 0, receitas: 0 }
    cur.atestados++
    mesMap.set(mes, cur)
  }
  for (const r of recs) {
    const d = new Date(r.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(mes) ?? { mes, consultas: 0, faturamento: 0, atestados: 0, receitas: 0 }
    cur.receitas++
    mesMap.set(mes, cur)
  }
  const porMes = [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)

  // ── Totais ────────────────────────────────────────────────────────────────
  const totais = {
    consultas: ats.length,
    faturamento: ats.reduce((s, a) => s + precoConsulta(a.paciente_id, a.valor_cobrado), 0),
    atestados: atests.length,
    receitas: recs.length,
    exames: 0, // tabela ainda não criada
  }

  return NextResponse.json({
    medicos: medicosFiltrados,
    especialidades,
    producao,
    porEspecialidade,
    porMes,
    totais,
  })
}
