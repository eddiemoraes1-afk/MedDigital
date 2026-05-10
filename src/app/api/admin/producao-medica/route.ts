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
    .select('id, nome, especialidade, crm, crm_uf, custo_consulta')
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
      .select('id, medico_id, paciente_id, atendimento_id, valor_cobrado, criado_em, status')
      .eq('status', 'emitida')
      .gte('criado_em', deISO)
      .lte('criado_em', ateISO),

    admin.from('vinculos_empresa')
      .select('paciente_id, empresa_id, ativo'),

    admin.from('empresas')
      .select('id, nome, preco_consulta, preco_receita'),
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

  function calcValorRenovacao(r: any): number {
    const eId = pacienteEmpresa.get(r.paciente_id)
    const emp = eId ? (empresaMap.get(eId) as any) : null
    const precoReceita = emp?.preco_receita ?? 0
    return (r.valor_cobrado != null && r.valor_cobrado > 0) ? r.valor_cobrado : precoReceita
  }

  // Divide receitas: renovações (atendimento_id IS NULL) vs emitidas em consulta
  const renovacoes = recs.filter((r: any) => r.atendimento_id == null)
  const receitasEmConsulta = recs.filter((r: any) => r.atendimento_id != null)

  // ── Produção por médico ───────────────────────────────────────────────────
  type ProdRow = {
    medico_id: string; nome: string; especialidade: string; crm: string
    consultas: number; faturamento: number; custo_consulta: number; custo: number; margem: number
    atestados: number; receitas: number; renovacoes: number; receitas_em_consulta: number; gasto_renovacoes: number; exames: number
  }
  const prodMap = new Map<string, ProdRow>()

  for (const m of medicosFiltrados) {
    const custoUnit = Number(m.custo_consulta ?? 0)
    prodMap.set(m.id, {
      medico_id: m.id, nome: m.nome,
      especialidade: m.especialidade ?? '—',
      crm: m.crm ? `${m.crm}/${m.crm_uf ?? ''}` : '—',
      consultas: 0, faturamento: 0,
      custo_consulta: custoUnit,
      custo: 0, margem: 0,
      atestados: 0, receitas: 0, renovacoes: 0, receitas_em_consulta: 0, gasto_renovacoes: 0, exames: 0,
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
  for (const r of renovacoes) {
    if (r.medico_id) {
      const cur = prodMap.get(r.medico_id)
      if (cur) {
        cur.renovacoes++
        cur.receitas++
        cur.gasto_renovacoes += calcValorRenovacao(r)
      }
    }
  }
  for (const r of receitasEmConsulta) {
    if (r.medico_id) {
      const cur = prodMap.get(r.medico_id)
      if (cur) {
        cur.receitas_em_consulta++
        cur.receitas++
      }
    }
  }

  // Recalcula custo e margem após consolidar consultas
  for (const row of prodMap.values()) {
    row.custo = row.consultas * row.custo_consulta
    row.margem = row.faturamento - row.custo
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
  type MesEntry = { mes: string; consultas: number; faturamento: number; atestados: number; receitas: number; renovacoes: number; receitas_em_consulta: number }
  const mesMap = new Map<string, MesEntry>()

  const emptyMes = (mes: string): MesEntry => ({ mes, consultas: 0, faturamento: 0, atestados: 0, receitas: 0, renovacoes: 0, receitas_em_consulta: 0 })

  for (const a of ats) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(mes) ?? emptyMes(mes)
    cur.consultas++
    cur.faturamento += precoConsulta(a.paciente_id, a.valor_cobrado)
    mesMap.set(mes, cur)
  }
  for (const a of atests) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(mes) ?? emptyMes(mes)
    cur.atestados++
    mesMap.set(mes, cur)
  }
  for (const r of renovacoes) {
    const d = new Date(r.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(mes) ?? emptyMes(mes)
    cur.receitas++
    cur.renovacoes++
    mesMap.set(mes, cur)
  }
  for (const r of receitasEmConsulta) {
    const d = new Date(r.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(mes) ?? emptyMes(mes)
    cur.receitas++
    cur.receitas_em_consulta++
    mesMap.set(mes, cur)
  }
  const porMes = [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)

  // ── Totais ────────────────────────────────────────────────────────────────
  const totalFaturamento = ats.reduce((s, a) => s + precoConsulta(a.paciente_id, a.valor_cobrado), 0)
  const totalCusto = [...prodMap.values()].reduce((s, r) => s + r.custo, 0)
  const totalGastosRenovacoes = renovacoes.reduce((sum: number, r: any) => sum + calcValorRenovacao(r), 0)

  const totais = {
    consultas: ats.length,
    faturamento: totalFaturamento,
    custo: totalCusto,
    margem: totalFaturamento - totalCusto,
    atestados: atests.length,
    receitas: recs.length,
    renovacoes: renovacoes.length,
    receitas_em_consulta: receitasEmConsulta.length,
    gastos_renovacoes: totalGastosRenovacoes,
    exames: 0,
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
