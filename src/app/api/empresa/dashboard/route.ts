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
    .select('id, nome, preco_mensalidade, preco_consulta, preco_receita, percentual_coparticipacao')
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

  // Map vínculo.id → vínculo (para resolver titular_id)
  const vinculoById = new Map<string, any>()
  for (const v of todosVinculos) vinculoById.set(v.id, v)

  // Map registro_funcional → vínculo FUNCIONÁRIO (fallback quando titular_id é nulo)
  const regFuncTitularMap = new Map<string, any>()

  function classRelacao(rel: string | null | undefined): 'Funcionário' | 'Dependente' {
    if (!rel) return 'Funcionário'
    return rel.trim().toLowerCase() === 'funcionário' || rel.trim().toLowerCase() === 'funcionario'
      ? 'Funcionário' : 'Dependente'
  }

  for (const v of todosVinculos) {
    if (v.registro_funcional && classRelacao(v.relacao) === 'Funcionário') {
      regFuncTitularMap.set(v.registro_funcional, v)
    }
  }

  // Helper: dado um vínculo, retorna o vínculo do titular
  function resolverTitularVinculo(v: any): any {
    if (!v) return null
    const eDep = classRelacao(v.relacao) === 'Dependente'
    if (!eDep) return v
    if (v.titular_id && vinculoById.has(v.titular_id)) return vinculoById.get(v.titular_id)
    if (v.registro_funcional && regFuncTitularMap.has(v.registro_funcional)) {
      return regFuncTitularMap.get(v.registro_funcional)
    }
    return null
  }

  // Helper: dado um paciente_id, retorna o vínculo do titular (próprio ou do funcionário responsável)
  function resolverTitular(pacienteId: string): any {
    const v = vinculoMap.get(pacienteId)
    if (!v) return v
    const t = resolverTitularVinculo(v)
    return t ?? v
  }

  const precoConsulta = empresa?.preco_consulta ?? 0
  const precoReceita = empresa?.preco_receita ?? 0

  if (pacienteIds.length === 0) {
    const totalMensalidade = (empresa?.preco_mensalidade ?? 0) * funcionariosAtivos
    return NextResponse.json({
      kpis: {
        totalConsultas: 0,
        totalGastosConsultas: 0,
        totalMensalidade,
        totalRenovacoes: 0,
        totalGastosRenovacoes: 0,
        totalGeral: totalMensalidade,
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
    { data: receitasData },
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
    adminSupabase
      .from('receitas')
      .select('id, paciente_id, atendimento_id, valor_cobrado, criado_em')
      .in('paciente_id', pacienteIds)
      .eq('status', 'emitida')
      .is('atendimento_id', null)   // apenas renovações (sem consulta vinculada)
      .gte('criado_em', inicio)
      .lte('criado_em', fim),
  ])

  const pacienteMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))
  const medicoMap = new Map((medicos ?? []).map((m: any) => [m.id, m]))
  const ats = (atendimentos ?? []) as any[]

  // Renovações com valor resolvido
  const renovacoes = ((receitasData ?? []) as any[]).map(r => ({
    ...r,
    valorFinal: (r.valor_cobrado != null && r.valor_cobrado > 0) ? r.valor_cobrado : precoReceita,
  }))

  // ===== GASTOS POR MÊS (consultas + renovações) =====
  const mesMap = new Map<string, { consultas: number; valor: number; renovacoes: number; valorRenovacoes: number }>()
  for (const a of ats) {
    const d = new Date(a.criado_em)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(key) ?? { consultas: 0, valor: 0, renovacoes: 0, valorRenovacoes: 0 }
    cur.consultas++
    cur.valor += precoConsulta
    mesMap.set(key, cur)
  }
  for (const r of renovacoes) {
    const d = new Date(r.criado_em)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(key) ?? { consultas: 0, valor: 0, renovacoes: 0, valorRenovacoes: 0 }
    cur.renovacoes++
    cur.valorRenovacoes += r.valorFinal
    mesMap.set(key, cur)
  }
  const gastosPorMes = [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v, valorTotal: v.valor + v.valorRenovacoes }))

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

  // ===== GASTOS POR DEPARTAMENTO (usa dept do titular quando dependente) =====
  const deptMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const titular = resolverTitular(a.paciente_id)
    const dept = titular?.departamento || 'Não informado'
    const cur = deptMap.get(dept) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += precoConsulta
    deptMap.set(dept, cur)
  }
  const gastosPorDepartamento = [...deptMap.entries()]
    .map(([departamento, v]) => ({ departamento, ...v }))
    .sort((a, b) => b.valor - a.valor)

  // ===== GASTOS POR CARGO (usa cargo do titular quando dependente) =====
  const cargoMap = new Map<string, { consultas: number; valor: number }>()
  for (const a of ats) {
    const titular = resolverTitular(a.paciente_id)
    const cargo = titular?.cargo || 'Não informado'
    const cur = cargoMap.get(cargo) ?? { consultas: 0, valor: 0 }
    cur.consultas++
    cur.valor += precoConsulta
    cargoMap.set(cargo, cur)
  }
  const gastosPorCargo = [...cargoMap.entries()]
    .map(([cargo, v]) => ({ cargo, ...v }))
    .sort((a, b) => b.valor - a.valor)

  // ===== TOP FUNCIONÁRIOS POR GASTO (consultas + renovações, dependentes somados ao titular) =====
  const funcGasto = new Map<string, { nome: string; cargo: string; departamento: string; consultas: number; valor: number; renovacoes: number; valorRenovacoes: number }>()

  for (const a of ats) {
    const vinculo = vinculoMap.get(a.paciente_id)
    const isDep = classRelacao(vinculo?.relacao) === 'Dependente'
    const titularVinculo = isDep ? (resolverTitularVinculo(vinculo) ?? vinculo) : vinculo
    const key = titularVinculo?.id ?? vinculo?.id ?? a.paciente_id
    if (!key) continue
    const nome = titularVinculo?.nome_completo ?? (pacienteMap.get(a.paciente_id) as any)?.nome ?? '—'
    const cur = funcGasto.get(key) ?? {
      nome,
      cargo: titularVinculo?.cargo ?? '—',
      departamento: titularVinculo?.departamento ?? '—',
      consultas: 0, valor: 0, renovacoes: 0, valorRenovacoes: 0,
    }
    cur.consultas++
    cur.valor += precoConsulta
    funcGasto.set(key, cur)
  }

  for (const r of renovacoes) {
    const vinculo = vinculoMap.get(r.paciente_id)
    const isDep = classRelacao(vinculo?.relacao) === 'Dependente'
    const titularVinculo = isDep ? (resolverTitularVinculo(vinculo) ?? vinculo) : vinculo
    const key = titularVinculo?.id ?? vinculo?.id ?? r.paciente_id
    if (!key) continue
    const nome = titularVinculo?.nome_completo ?? '—'
    const cur = funcGasto.get(key) ?? {
      nome,
      cargo: titularVinculo?.cargo ?? '—',
      departamento: titularVinculo?.departamento ?? '—',
      consultas: 0, valor: 0, renovacoes: 0, valorRenovacoes: 0,
    }
    cur.renovacoes++
    cur.valorRenovacoes += r.valorFinal
    funcGasto.set(key, cur)
  }

  const topFuncionarios = [...funcGasto.values()]
    .map(f => ({ ...f, totalValor: f.valor + f.valorRenovacoes }))
    .sort((a, b) => b.totalValor - a.totalValor)
    .slice(0, 10)

  // ===== RELAÇÃO: FUNCIONÁRIO vs DEPENDENTE =====
  const composicaoMap = new Map<string, { cadastros: number; pacientesAtivos: number }>()
  for (const v of todosVinculos) {
    const cat = classRelacao(v.relacao)
    const cur = composicaoMap.get(cat) ?? { cadastros: 0, pacientesAtivos: 0 }
    cur.cadastros++
    if (v.paciente_id) cur.pacientesAtivos++
    composicaoMap.set(cat, cur)
  }

  const consultasRelMap = new Map<string, number>()
  const valorRelMap = new Map<string, number>()
  for (const a of ats) {
    const v = vinculoMap.get(a.paciente_id)
    const cat = classRelacao(v?.relacao)
    consultasRelMap.set(cat, (consultasRelMap.get(cat) ?? 0) + 1)
    valorRelMap.set(cat, (valorRelMap.get(cat) ?? 0) + precoConsulta)
  }

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

  const relMesMap = new Map<string, { funcionarios: number; dependentes: number; valorFuncionarios: number; valorDependentes: number }>()
  for (const a of ats) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const v = vinculoMap.get(a.paciente_id)
    const cat = classRelacao(v?.relacao)
    const cur = relMesMap.get(mes) ?? { funcionarios: 0, dependentes: 0, valorFuncionarios: 0, valorDependentes: 0 }
    if (cat === 'Funcionário') { cur.funcionarios++; cur.valorFuncionarios += precoConsulta }
    else { cur.dependentes++; cur.valorDependentes += precoConsulta }
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
    valor: valorRelMap.get(cat) ?? 0,
    taxaUso: (() => {
      const ativos = composicaoMap.get(cat)?.pacientesAtivos ?? 0
      const c = consultasRelMap.get(cat) ?? 0
      return ativos > 0 ? Math.round((c / ativos) * 100) : 0
    })(),
  }))

  // ===== GASTOS POR TITULAR (consultas + renovações, dependentes atribuídos ao titular) =====
  type TitularRow = {
    nome: string; cargo: string; departamento: string; registroFuncional: string
    consultasProprias: number; consultasDependentes: number
    valorProprio: number; valorDependentes: number
    renovacoesProprias: number; renovacoesDependentes: number
    valorRenovacoesProprias: number; valorRenovacoesDependentes: number
    dependentes: Map<string, { nome: string; relacao: string; consultas: number; valor: number; renovacoes: number; valorRenovacoes: number }>
  }

  const titularMap = new Map<string, TitularRow>()

  function ensureTitular(key: string, titularVinculo: any, fallbackVinculo: any): TitularRow {
    if (!titularMap.has(key)) {
      titularMap.set(key, {
        nome: titularVinculo?.nome_completo ?? fallbackVinculo?.nome_completo ?? '—',
        cargo: titularVinculo?.cargo ?? fallbackVinculo?.cargo ?? '—',
        departamento: titularVinculo?.departamento ?? fallbackVinculo?.departamento ?? '—',
        registroFuncional: titularVinculo?.registro_funcional ?? fallbackVinculo?.registro_funcional ?? '—',
        consultasProprias: 0, consultasDependentes: 0,
        valorProprio: 0, valorDependentes: 0,
        renovacoesProprias: 0, renovacoesDependentes: 0,
        valorRenovacoesProprias: 0, valorRenovacoesDependentes: 0,
        dependentes: new Map(),
      })
    }
    return titularMap.get(key)!
  }

  for (const a of ats) {
    const vinculo = vinculoMap.get(a.paciente_id)
    if (!vinculo) continue
    const isDependente = classRelacao(vinculo.relacao) === 'Dependente'
    const titularVinculo = isDependente ? resolverTitularVinculo(vinculo) : vinculo
    const titularKey = isDependente
      ? (titularVinculo?.id ?? vinculo.id ?? a.paciente_id)
      : (vinculo.id ?? a.paciente_id)
    if (!titularKey) continue

    const cur = ensureTitular(titularKey, titularVinculo, vinculo)

    if (isDependente) {
      cur.consultasDependentes++
      cur.valorDependentes += precoConsulta
      const depKey = a.paciente_id
      const depCur = cur.dependentes.get(depKey) ?? { nome: vinculo.nome_completo ?? '—', relacao: vinculo.relacao ?? '—', consultas: 0, valor: 0, renovacoes: 0, valorRenovacoes: 0 }
      depCur.consultas++
      depCur.valor += precoConsulta
      cur.dependentes.set(depKey, depCur)
    } else {
      cur.consultasProprias++
      cur.valorProprio += precoConsulta
    }
    titularMap.set(titularKey, cur)
  }

  for (const r of renovacoes) {
    const vinculo = vinculoMap.get(r.paciente_id)
    if (!vinculo) continue
    const isDependente = classRelacao(vinculo.relacao) === 'Dependente'
    const titularVinculo = isDependente ? resolverTitularVinculo(vinculo) : vinculo
    const titularKey = isDependente
      ? (titularVinculo?.id ?? vinculo.id ?? r.paciente_id)
      : (vinculo.id ?? r.paciente_id)
    if (!titularKey) continue

    const cur = ensureTitular(titularKey, titularVinculo, vinculo)

    if (isDependente) {
      cur.renovacoesDependentes++
      cur.valorRenovacoesDependentes += r.valorFinal
      const depKey = r.paciente_id
      const depCur = cur.dependentes.get(depKey) ?? { nome: vinculo.nome_completo ?? '—', relacao: vinculo.relacao ?? '—', consultas: 0, valor: 0, renovacoes: 0, valorRenovacoes: 0 }
      depCur.renovacoes++
      depCur.valorRenovacoes += r.valorFinal
      cur.dependentes.set(depKey, depCur)
    } else {
      cur.renovacoesProprias++
      cur.valorRenovacoesProprias += r.valorFinal
    }
    titularMap.set(titularKey, cur)
  }

  const gastosPorTitular = [...titularMap.values()]
    .map(t => ({
      nome: t.nome, cargo: t.cargo, departamento: t.departamento, registroFuncional: t.registroFuncional,
      consultasProprias: t.consultasProprias, consultasDependentes: t.consultasDependentes,
      totalConsultas: t.consultasProprias + t.consultasDependentes,
      valorProprio: t.valorProprio, valorDependentes: t.valorDependentes,
      totalValorConsultas: t.valorProprio + t.valorDependentes,
      renovacoesProprias: t.renovacoesProprias, renovacoesDependentes: t.renovacoesDependentes,
      totalRenovacoes: t.renovacoesProprias + t.renovacoesDependentes,
      valorRenovacoesProprias: t.valorRenovacoesProprias, valorRenovacoesDependentes: t.valorRenovacoesDependentes,
      totalValorRenovacoes: t.valorRenovacoesProprias + t.valorRenovacoesDependentes,
      totalValor: t.valorProprio + t.valorDependentes + t.valorRenovacoesProprias + t.valorRenovacoesDependentes,
      dependentes: [...t.dependentes.values()],
    }))
    .sort((a, b) => b.totalValor - a.totalValor)
    .slice(0, 20)

  // ===== KPIs =====
  const totalConsultas = ats.length
  const totalGastosConsultas = ats.length * precoConsulta
  const totalMensalidade = (empresa?.preco_mensalidade ?? 0) * funcionariosAtivos
  const totalRenovacoes = renovacoes.length
  const totalGastosRenovacoes = renovacoes.reduce((s, r) => s + r.valorFinal, 0)
  const totalGeral = totalGastosConsultas + totalMensalidade + totalGastosRenovacoes
  const ticketMedio = totalConsultas > 0 ? totalGastosConsultas / totalConsultas : 0
  const taxaUso = funcionariosAtivos > 0 ? Math.round((funcionariosComUso / funcionariosAtivos) * 100) : 0

  return NextResponse.json({
    kpis: {
      totalConsultas,
      totalGastosConsultas,
      totalMensalidade,
      totalRenovacoes,
      totalGastosRenovacoes,
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
