import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function calcFaixaEtaria(dataNasc: string | null): string {
  if (!dataNasc) return 'Não informado'
  const anos = Math.floor((Date.now() - new Date(dataNasc).getTime()) / (365.25 * 24 * 3600 * 1000))
  if (anos < 18) return '< 18'
  if (anos < 30) return '18–29'
  if (anos < 40) return '30–39'
  if (anos < 50) return '40–49'
  if (anos < 60) return '50–59'
  if (anos < 70) return '60–69'
  return '70+'
}

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item)
    const bucket = map.get(k) ?? []
    bucket.push(item)
    map.set(k, bucket)
  }
  return map
}

export async function GET(req: Request) {
  await requireAdmin()
  const adminSupabase = createAdminClient()
  const { searchParams } = new URL(req.url)

  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setDate(defaultStart.getDate() - 30)

  const inicio = searchParams.get('inicio') || defaultStart.toISOString()
  const fim = searchParams.get('fim') || now.toISOString()

  const [
    { data: atendimentos },
    { data: pacientes },
    { data: medicos },
    { data: empresas },
    { data: vinculos },
    { data: agendamentos },
  ] = await Promise.all([
    adminSupabase
      .from('atendimentos')
      .select('id, valor_cobrado, criado_em, paciente_id, medico_id, agendamento_id')
      .eq('status', 'concluido')
      .gte('criado_em', inicio)
      .lte('criado_em', fim),
    adminSupabase
      .from('pacientes')
      .select('id, nome, data_nascimento, sexo'),
    adminSupabase
      .from('medicos')
      .select('id, nome, especialidade'),
    adminSupabase
      .from('empresas')
      .select('id, nome, preco_mensalidade, preco_consulta, ativo'),
    adminSupabase
      .from('vinculos_empresa')
      .select('empresa_id, paciente_id, ativo'),
    adminSupabase
      .from('agendamentos')
      .select('id, status, paciente_id, medico_id, data_hora')
      .gte('data_hora', inicio)
      .lte('data_hora', fim),
  ])

  // ---- Build lookup maps ----
  const pacienteMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))
  const medicoMap = new Map((medicos ?? []).map((m: any) => [m.id, m]))
  const empresaMap = new Map((empresas ?? []).map((e: any) => [e.id, e]))

  // paciente_id → empresa_id (first match)
  const pacienteEmpresa = new Map<string, string>()
  for (const v of vinculos ?? []) {
    if (!pacienteEmpresa.has((v as any).paciente_id)) {
      pacienteEmpresa.set((v as any).paciente_id, (v as any).empresa_id)
    }
  }

  // funcionarios ativos por empresa
  const funcAtivosMap = new Map<string, number>()
  for (const v of vinculos ?? []) {
    if ((v as any).ativo) {
      const eid = (v as any).empresa_id
      funcAtivosMap.set(eid, (funcAtivosMap.get(eid) ?? 0) + 1)
    }
  }

  const ats = (atendimentos ?? []) as any[]

  // ===== FATURAMENTO POR MÊS =====
  const mesMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const d = new Date(a.criado_em)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(key) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += a.valor_cobrado ?? 0
    mesMap.set(key, cur)
  }
  const faturamentoPorMes = [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }))

  // ===== FATURAMENTO POR EMPRESA =====
  type EmpRow = { nome: string; consultas: number; valorConsultas: number; mensalidade: number; funcionariosAtivos: number }
  const empMap = new Map<string, EmpRow>()

  for (const e of (empresas ?? []) as any[]) {
    if (!e.ativo) continue
    const ativos = funcAtivosMap.get(e.id) ?? 0
    empMap.set(e.id, {
      nome: e.nome,
      consultas: 0,
      valorConsultas: 0,
      mensalidade: (e.preco_mensalidade ?? 0) * ativos,
      funcionariosAtivos: ativos,
    })
  }
  for (const a of ats) {
    const empId = pacienteEmpresa.get(a.paciente_id)
    if (!empId) continue
    const cur = empMap.get(empId)
    if (!cur) continue
    cur.consultas++
    cur.valorConsultas += a.valor_cobrado ?? 0
  }
  const faturamentoPorEmpresa = [...empMap.values()]
    .sort((a, b) => (b.valorConsultas + b.mensalidade) - (a.valorConsultas + a.mensalidade))

  // ===== PACIENTES PARTICULARES =====
  const particulares = ats.filter(a => !pacienteEmpresa.has(a.paciente_id))
  const valorParticular = particulares.reduce((s: number, a: any) => s + (a.valor_cobrado ?? 0), 0)
  const consultasParticulares = particulares.length

  // ===== FATURAMENTO POR MÉDICO =====
  type MedRow = { nome: string; especialidade: string; consultas: number; valor: number }
  const medMap = new Map<string, MedRow>()
  for (const a of ats) {
    if (!a.medico_id) continue
    const m = medicoMap.get(a.medico_id) as any
    if (!m) continue
    const cur = medMap.get(a.medico_id) ?? { nome: m.nome, especialidade: m.especialidade || '', consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += a.valor_cobrado ?? 0
    medMap.set(a.medico_id, cur)
  }
  const faturamentoPorMedico = [...medMap.values()].sort((a, b) => b.valor - a.valor)

  // ===== FAIXA ETÁRIA =====
  const faixaMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const p = pacienteMap.get(a.paciente_id) as any
    const faixa = calcFaixaEtaria(p?.data_nascimento ?? null)
    const cur = faixaMap.get(faixa) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += a.valor_cobrado ?? 0
    faixaMap.set(faixa, cur)
  }
  const ordemFaixas = ['< 18', '18–29', '30–39', '40–49', '50–59', '60–69', '70+', 'Não informado']
  const faturamentoPorFaixaEtaria = ordemFaixas
    .filter(f => faixaMap.has(f))
    .map(f => ({ faixa: f, ...faixaMap.get(f)! }))

  // ===== SEXO =====
  const sexoMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const p = pacienteMap.get(a.paciente_id) as any
    const raw = p?.sexo
    const s = raw === 'masculino' ? 'Masculino' : raw === 'feminino' ? 'Feminino' : 'Não informado'
    const cur = sexoMap.get(s) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += a.valor_cobrado ?? 0
    sexoMap.set(s, cur)
  }
  const faturamentoPorSexo = [...sexoMap.entries()].map(([sexo, v]) => ({ sexo, ...v }))

  // ===== STATUS AGENDAMENTOS =====
  const statusMap: Record<string, number> = {}
  for (const ag of (agendamentos ?? []) as any[]) {
    statusMap[ag.status] = (statusMap[ag.status] ?? 0) + 1
  }
  const consultasPorStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // ===== TIPO ATENDIMENTO =====
  const consultasPorTipo = [
    { tipo: 'Agendada', count: ats.filter((a: any) => a.agendamento_id).length },
    { tipo: 'Fila / Hora', count: ats.filter((a: any) => !a.agendamento_id).length },
  ]

  // ===== FUNCIONÁRIOS × CONSULTAS POR EMPRESA =====
  const funcionariosPorEmpresa = ((empresas ?? []) as any[])
    .filter(e => e.ativo)
    .map(e => ({
      nome: e.nome.length > 22 ? e.nome.slice(0, 20) + '…' : e.nome,
      funcionarios: funcAtivosMap.get(e.id) ?? 0,
      consultas: empMap.get(e.id)?.consultas ?? 0,
    }))
    .sort((a, b) => b.funcionarios - a.funcionarios)
    .slice(0, 10)

  // ===== KPIs =====
  const totalConsultas = ats.length
  const totalFaturamento = ats.reduce((s: number, a: any) => s + (a.valor_cobrado ?? 0), 0)
  const totalMensalidades = [...empMap.values()].reduce((s, e) => s + e.mensalidade, 0)
  const totalEmpresasAtivas = ((empresas ?? []) as any[]).filter(e => e.ativo).length
  const totalMedicos = medMap.size
  const ticketMedio = totalConsultas > 0 ? totalFaturamento / totalConsultas : 0

  // ===== RANKING DE PACIENTES (top 10 por gasto) =====
  const pacienteGasto = new Map<string, { nome: string; consultas: number; valor: number; empresa: string }>()
  for (const a of ats) {
    const p = pacienteMap.get(a.paciente_id) as any
    const empId = pacienteEmpresa.get(a.paciente_id)
    const emp = empId ? (empresaMap.get(empId) as any)?.nome ?? '—' : 'Particular'
    const cur = pacienteGasto.get(a.paciente_id) ?? { nome: p?.nome ?? '—', consultas: 0, valor: 0, empresa: emp }
    cur.consultas++
    cur.valor += a.valor_cobrado ?? 0
    pacienteGasto.set(a.paciente_id, cur)
  }
  const topPacientes = [...pacienteGasto.values()]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10)

  return NextResponse.json({
    kpis: {
      totalConsultas,
      totalFaturamento,
      totalMensalidades,
      totalGeral: totalFaturamento + totalMensalidades,
      totalEmpresasAtivas,
      totalMedicos,
      ticketMedio,
      valorParticular,
      consultasParticulares,
    },
    faturamentoPorMes,
    faturamentoPorEmpresa,
    faturamentoPorMedico,
    faturamentoPorFaixaEtaria,
    faturamentoPorSexo,
    consultasPorStatus,
    consultasPorTipo,
    funcionariosPorEmpresa,
    topPacientes,
  })
}
