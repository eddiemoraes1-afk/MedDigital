import { requireEmpresa } from '@/lib/auth-sistema'
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

export async function GET(req: Request) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const adminSupabase = createAdminClient()

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setDate(defaultStart.getDate() - 30)
  const inicio = searchParams.get('inicio') || defaultStart.toISOString()
  const fim = searchParams.get('fim') || now.toISOString()

  // 1. Empresa (para preços)
  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('id, nome, preco_mensalidade, preco_consulta')
    .eq('id', empresaId)
    .single()

  // 2. Vínculos desta empresa
  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select('paciente_id, ativo, nome_completo, cargo, departamento, cpf')
    .eq('empresa_id', empresaId)

  const todosVinculos = (vinculos ?? []) as any[]
  const funcionariosAtivos = todosVinculos.filter(v => v.ativo).length
  const pacienteIds = todosVinculos.filter(v => v.paciente_id).map(v => v.paciente_id as string)
  const funcionariosComUso = todosVinculos.filter(v => v.paciente_id).length

  // Map paciente_id → vínculo (para nome e cargo)
  const vinculoMap = new Map<string, any>()
  for (const v of todosVinculos) {
    if (v.paciente_id) vinculoMap.set(v.paciente_id, v)
  }

  if (pacienteIds.length === 0) {
    // Nenhum funcionário ativou ainda
    return NextResponse.json({
      kpis: {
        totalConsultas: 0,
        totalGastosConsultas: 0,
        totalMensalidade: (empresa?.preco_mensalidade ?? 0) * funcionariosAtivos,
        totalGeral: (empresa?.preco_mensalidade ?? 0) * funcionariosAtivos,
        funcionariosAtivos,
        funcionariosComUso: 0,
        ticketMedio: 0,
        taxaUso: 0,
      },
      gastosPorMes: [],
      gastosPorMedico: [],
      gastosPorFaixaEtaria: [],
      gastosPorSexo: [],
      consultasPorStatus: [],
      consultasPorTipo: [],
      topFuncionarios: [],
      gastosPorDepartamento: [],
      gastosPorCargo: [],
    })
  }

  const [
    { data: atendimentos },
    { data: pacientes },
    { data: medicos },
    { data: agendamentos },
  ] = await Promise.all([
    adminSupabase
      .from('atendimentos')
      .select('id, valor_cobrado, criado_em, paciente_id, medico_id, agendamento_id')
      .eq('status', 'concluido')
      .in('paciente_id', pacienteIds)
      .gte('criado_em', inicio)
      .lte('criado_em', fim),
    adminSupabase
      .from('pacientes')
      .select('id, nome, data_nascimento, sexo')
      .in('id', pacienteIds),
    adminSupabase
      .from('medicos')
      .select('id, nome, especialidade'),
    adminSupabase
      .from('agendamentos')
      .select('id, status, paciente_id, medico_id, data_hora')
      .in('paciente_id', pacienteIds)
      .gte('data_hora', inicio)
      .lte('data_hora', fim),
  ])

  const pacienteMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))
  const medicoMap = new Map((medicos ?? []).map((m: any) => [m.id, m]))
  const ats = (atendimentos ?? []) as any[]

  const precoConsulta = empresa?.preco_consulta ?? 0

  // ===== GASTOS POR MÊS =====
  const mesMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const d = new Date(a.criado_em)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(key) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += precoConsulta
    mesMap.set(key, cur)
  }
  const gastosPorMes = [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }))

  // ===== GASTOS POR MÉDICO =====
  type MedRow = { nome: string; especialidade: string; consultas: number; valor: number }
  const medMap = new Map<string, MedRow>()
  for (const a of ats) {
    if (!a.medico_id) continue
    const m = medicoMap.get(a.medico_id) as any
    if (!m) continue
    const cur = medMap.get(a.medico_id) ?? { nome: m.nome, especialidade: m.especialidade || '', consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += precoConsulta
    medMap.set(a.medico_id, cur)
  }
  const gastosPorMedico = [...medMap.values()].sort((a, b) => b.valor - a.valor)

  // ===== FAIXA ETÁRIA =====
  const faixaMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const p = pacienteMap.get(a.paciente_id) as any
    const faixa = calcFaixaEtaria(p?.data_nascimento ?? null)
    const cur = faixaMap.get(faixa) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += precoConsulta
    faixaMap.set(faixa, cur)
  }
  const ordemFaixas = ['< 18', '18–29', '30–39', '40–49', '50–59', '60–69', '70+', 'Não informado']
  const gastosPorFaixaEtaria = ordemFaixas
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
    cur.valor += precoConsulta
    sexoMap.set(s, cur)
  }
  const gastosPorSexo = [...sexoMap.entries()].map(([sexo, v]) => ({ sexo, ...v }))

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

  // ===== GASTOS POR DEPARTAMENTO =====
  const deptMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const vinculo = vinculoMap.get(a.paciente_id)
    const dept = vinculo?.departamento || 'Não informado'
    const cur = deptMap.get(dept) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += empresa?.preco_consulta ?? 0
    deptMap.set(dept, cur)
  }
  const gastosPorDepartamento = [...deptMap.entries()]
    .map(([departamento, v]) => ({ departamento, ...v }))
    .sort((a, b) => b.valor - a.valor)

  // ===== GASTOS POR CARGO =====
  const cargoMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const vinculo = vinculoMap.get(a.paciente_id)
    const cargo = vinculo?.cargo || 'Não informado'
    const cur = cargoMap.get(cargo) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += empresa?.preco_consulta ?? 0
    cargoMap.set(cargo, cur)
  }
  const gastosPorCargo = [...cargoMap.entries()]
    .map(([cargo, v]) => ({ cargo, ...v }))
    .sort((a, b) => b.valor - a.valor)

  // ===== TOP FUNCIONÁRIOS POR GASTO =====
  const funcGasto = new Map<string, { nome: string; cargo: string; departamento: string; consultas: number; valor: number }>()
  for (const a of ats) {
    const vinculo = vinculoMap.get(a.paciente_id)
    const nome = vinculo?.nome_completo ?? (pacienteMap.get(a.paciente_id) as any)?.nome ?? '—'
    const cur = funcGasto.get(a.paciente_id) ?? {
      nome,
      cargo: vinculo?.cargo ?? '—',
      departamento: vinculo?.departamento ?? '—',
      consultas: 0,
      valor: 0,
    }
    cur.consultas++
    cur.valor += precoConsulta
    funcGasto.set(a.paciente_id, cur)
  }
  const topFuncionarios = [...funcGasto.values()]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10)

  // ===== KPIs =====
  const totalConsultas = ats.length
  const totalGastosConsultas = ats.length * precoConsulta
  const totalMensalidade = (empresa?.preco_mensalidade ?? 0) * funcionariosAtivos
  const totalGeral = totalGastosConsultas + totalMensalidade
  const ticketMedio = totalConsultas > 0 ? totalGastosConsultas / totalConsultas : 0
  const taxaUso = funcionariosAtivos > 0 ? Math.round((funcionariosComUso / funcionariosAtivos) * 100) : 0

  return NextResponse.json({
    kpis: {
      totalConsultas,
      totalGastosConsultas,
      totalMensalidade,
      totalGeral,
      funcionariosAtivos,
      funcionariosComUso,
      ticketMedio,
      taxaUso,
    },
    gastosPorMes,
    gastosPorMedico,
    gastosPorFaixaEtaria,
    gastosPorSexo,
    consultasPorStatus,
    consultasPorTipo,
    topFuncionarios,
    gastosPorDepartamento,
    gastosPorCargo,
  })
}
