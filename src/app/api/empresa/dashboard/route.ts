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
    .select('id, paciente_id, ativo, nome_completo, cargo, departamento, cpf, relacao, titular_id, registro_funcional')
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

  // ===== RELAÇÃO: FUNCIONÁRIO vs DEPENDENTE =====
  function classRelacao(rel: string | null | undefined): 'Funcionário' | 'Dependente' {
    if (!rel) return 'Funcionário'
    return rel.trim().toLowerCase() === 'funcionário' || rel.trim().toLowerCase() === 'funcionario'
      ? 'Funcionário' : 'Dependente'
  }

  // Composição da base (cadastros)
  const composicaoMap = new Map<string, { cadastros: number; pacientesAtivos: number }>()
  for (const v of todosVinculos) {
    const cat = classRelacao(v.relacao)
    const cur = composicaoMap.get(cat) ?? { cadastros: 0, pacientesAtivos: 0 }
    cur.cadastros++
    if (v.paciente_id) cur.pacientesAtivos++
    composicaoMap.set(cat, cur)
  }

  // Consultas por relação
  const consultasRelMap = new Map<string, number>()
  const diasRelMap = new Map<string, number>()
  for (const a of ats) {
    const v = vinculoMap.get(a.paciente_id)
    const cat = classRelacao(v?.relacao)
    consultasRelMap.set(cat, (consultasRelMap.get(cat) ?? 0) + 1)
  }

  // Detalhamento por tipo exato de relação
  const tipoRelMap = new Map<string, { cadastros: number; consultas: number; pacientesAtivos: number }>()
  for (const v of todosVinculos) {
    const rel = (v.relacao?.trim() || 'Não informado')
    const cur = tipoRelMap.get(rel) ?? { cadastros: 0, consultas: 0, pacientesAtivos: 0 }
    cur.cadastros++
    if (v.paciente_id) cur.pacientesAtivos++
    tipoRelMap.set(rel, cur)
  }
  for (const a of ats) {
    const v = vinculoMap.get(a.paciente_id)
    const rel = (v?.relacao?.trim() || 'Não informado')
    const cur = tipoRelMap.get(rel)
    if (cur) cur.consultas++
  }
  const detalheRelacao = [...tipoRelMap.entries()]
    .map(([relacao, d]) => ({
      relacao,
      categoria: classRelacao(relacao),
      cadastros: d.cadastros,
      pacientesAtivos: d.pacientesAtivos,
      consultas: d.consultas,
      taxaUso: d.pacientesAtivos > 0 ? Math.round((d.consultas / d.pacientesAtivos) * 100) : 0,
    }))
    .sort((a, b) => b.consultas - a.consultas)

  // Consultas por relação por mês
  const relMesMap = new Map<string, { funcionarios: number; dependentes: number }>()
  for (const a of ats) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const v = vinculoMap.get(a.paciente_id)
    const cat = classRelacao(v?.relacao)
    const cur = relMesMap.get(mes) ?? { funcionarios: 0, dependentes: 0 }
    if (cat === 'Funcionário') cur.funcionarios++
    else cur.dependentes++
    relMesMap.set(mes, cur)
  }
  const consultasRelacaoPorMes = [...relMesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }))

  const distribuicaoRelacao = ['Funcionário', 'Dependente'].map(cat => ({
    categoria: cat,
    cadastros: composicaoMap.get(cat)?.cadastros ?? 0,
    pacientesAtivos: composicaoMap.get(cat)?.pacientesAtivos ?? 0,
    consultas: consultasRelMap.get(cat) ?? 0,
    taxaUso: (() => {
      const ativos = composicaoMap.get(cat)?.pacientesAtivos ?? 0
      const c = consultasRelMap.get(cat) ?? 0
      return ativos > 0 ? Math.round((c / ativos) * 100) : 0
    })(),
  }))

  // ===== GASTOS POR TITULAR (funcionário + seus dependentes) =====
  // Maps para resolução rápida
  const vinculoById = new Map<string, any>()
  for (const v of todosVinculos) vinculoById.set(v.id, v)

  // Para cada atendimento, descobre quem é o titular cobrado
  // Se o paciente é dependente → o titular é o funcionário com titular_id apontado
  // Se o paciente é funcionário (ou sem titular_id) → ele mesmo é o titular
  type TitularRow = {
    nome: string
    cargo: string
    departamento: string
    registroFuncional: string
    consultasProprias: number
    consultasDependentes: number
    valorProprio: number
    valorDependentes: number
    dependentes: Map<string, { nome: string; relacao: string; consultas: number; valor: number }>
  }

  const titularMap = new Map<string, TitularRow>()

  for (const a of ats) {
    const vinculo = vinculoMap.get(a.paciente_id)
    if (!vinculo) continue

    const isDependente = classRelacao(vinculo.relacao) === 'Dependente' && vinculo.titular_id
    const titularVinculo = isDependente ? vinculoById.get(vinculo.titular_id) : vinculo
    const titularKey = isDependente ? vinculo.titular_id : (vinculo.id ?? a.paciente_id)

    if (!titularVinculo && !isDependente) {
      // Funcionário sem vinculo.id — usa paciente_id como chave
    }

    const resolvedTitularKey = titularKey
    if (!resolvedTitularKey) continue

    const titularNome = titularVinculo?.nome_completo ?? vinculo.nome_completo ?? '—'
    const cur = titularMap.get(resolvedTitularKey) ?? {
      nome: titularNome,
      cargo: titularVinculo?.cargo ?? vinculo?.cargo ?? '—',
      departamento: titularVinculo?.departamento ?? vinculo?.departamento ?? '—',
      registroFuncional: titularVinculo?.registro_funcional ?? vinculo?.registro_funcional ?? '—',
      consultasProprias: 0,
      consultasDependentes: 0,
      valorProprio: 0,
      valorDependentes: 0,
      dependentes: new Map(),
    }

    if (isDependente) {
      cur.consultasDependentes++
      cur.valorDependentes += precoConsulta
      const depKey = a.paciente_id
      const depCur = cur.dependentes.get(depKey) ?? {
        nome: vinculo.nome_completo ?? '—',
        relacao: vinculo.relacao ?? '—',
        consultas: 0,
        valor: 0,
      }
      depCur.consultas++
      depCur.valor += precoConsulta
      cur.dependentes.set(depKey, depCur)
    } else {
      cur.consultasProprias++
      cur.valorProprio += precoConsulta
    }

    titularMap.set(resolvedTitularKey, cur)
  }

  const gastosPorTitular = [...titularMap.values()]
    .map(t => ({
      nome: t.nome,
      cargo: t.cargo,
      departamento: t.departamento,
      registroFuncional: t.registroFuncional,
      consultasProprias: t.consultasProprias,
      consultasDependentes: t.consultasDependentes,
      totalConsultas: t.consultasProprias + t.consultasDependentes,
      valorProprio: t.valorProprio,
      valorDependentes: t.valorDependentes,
      totalValor: t.valorProprio + t.valorDependentes,
      dependentes: [...t.dependentes.values()],
    }))
    .sort((a, b) => b.totalValor - a.totalValor)
    .slice(0, 20)

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
    distribuicaoRelacao,
    detalheRelacao,
    consultasRelacaoPorMes,
    gastosPorTitular,
  })
}
