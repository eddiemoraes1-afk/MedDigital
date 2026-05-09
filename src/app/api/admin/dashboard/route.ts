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

function classRelacao(rel: string | null | undefined): 'Funcionário' | 'Dependente' {
  if (!rel) return 'Funcionário'
  const v = rel.trim().toLowerCase()
  return v === 'funcionário' || v === 'funcionario' ? 'Funcionário' : 'Dependente'
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
      .select('id, empresa_id, paciente_id, ativo, relacao, titular_id, nome_completo, cargo, departamento, registro_funcional'),
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
    // Usa preco_consulta da empresa (mesma lógica dos relatórios individuais)
    const empIdM = pacienteEmpresa.get(a.paciente_id)
    const empM = empIdM ? (empresaMap.get(empIdM) as any) : null
    cur.valor += empM?.preco_consulta ?? a.valor_cobrado ?? 0
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
    // Usa preco_consulta da empresa para consistência com os relatórios individuais
    const empRef = empresaMap.get(empId) as any
    cur.consultas++
    cur.valorConsultas += empRef?.preco_consulta ?? a.valor_cobrado ?? 0
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
  // Usa preco_consulta por empresa (alinhado com os relatórios individuais)
  const totalFaturamento = ats.reduce((s: number, a: any) => {
    const eId = pacienteEmpresa.get(a.paciente_id)
    const emp = eId ? (empresaMap.get(eId) as any) : null
    return s + (emp?.preco_consulta ?? a.valor_cobrado ?? 0)
  }, 0)
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

  // ===== RELAÇÃO GLOBAL (Funcionário vs Dependente) =====
  const allVinculos = (vinculos ?? []) as any[]

  // paciente_id → vínculo (for relacao lookup in atendimentos)
  const vinculoMapGlobal = new Map<string, any>()
  for (const v of allVinculos) {
    if (v.paciente_id && !vinculoMapGlobal.has(v.paciente_id)) {
      vinculoMapGlobal.set(v.paciente_id, v)
    }
  }

  // Composição da base de cadastros (todos os vínculos)
  const composicaoGlobal = new Map<string, { cadastros: number; pacientesAtivos: number }>()
  for (const v of allVinculos) {
    const cat = classRelacao(v.relacao)
    const cur = composicaoGlobal.get(cat) ?? { cadastros: 0, pacientesAtivos: 0 }
    cur.cadastros++
    if (v.paciente_id) cur.pacientesAtivos++
    composicaoGlobal.set(cat, cur)
  }

  // Consultas por categoria de relação
  const consultasRelGlobal = new Map<string, number>()
  for (const a of ats) {
    const v = vinculoMapGlobal.get(a.paciente_id)
    const cat = classRelacao(v?.relacao)
    consultasRelGlobal.set(cat, (consultasRelGlobal.get(cat) ?? 0) + 1)
  }

  const distribuicaoRelacaoGlobal = ['Funcionário', 'Dependente'].map(cat => ({
    categoria: cat,
    cadastros: composicaoGlobal.get(cat)?.cadastros ?? 0,
    pacientesAtivos: composicaoGlobal.get(cat)?.pacientesAtivos ?? 0,
    consultas: consultasRelGlobal.get(cat) ?? 0,
    taxaUso: (() => {
      const ativos = composicaoGlobal.get(cat)?.pacientesAtivos ?? 0
      const c = consultasRelGlobal.get(cat) ?? 0
      return ativos > 0 ? Math.round((c / ativos) * 100) : 0
    })(),
  }))

  // Detalhe por tipo exato de relação
  const tipoRelGlobal = new Map<string, { cadastros: number; consultas: number; pacientesAtivos: number }>()
  for (const v of allVinculos) {
    const rel = (v.relacao?.trim() || 'Não informado')
    const cur = tipoRelGlobal.get(rel) ?? { cadastros: 0, consultas: 0, pacientesAtivos: 0 }
    cur.cadastros++
    if (v.paciente_id) cur.pacientesAtivos++
    tipoRelGlobal.set(rel, cur)
  }
  for (const a of ats) {
    const v = vinculoMapGlobal.get(a.paciente_id)
    const rel = (v?.relacao?.trim() || 'Não informado')
    const cur = tipoRelGlobal.get(rel)
    if (cur) cur.consultas++
  }
  const detalheRelacaoGlobal = [...tipoRelGlobal.entries()]
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
  const relMesGlobal = new Map<string, { funcionarios: number; dependentes: number }>()
  for (const a of ats) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const v = vinculoMapGlobal.get(a.paciente_id)
    const cat = classRelacao(v?.relacao)
    const cur = relMesGlobal.get(mes) ?? { funcionarios: 0, dependentes: 0 }
    if (cat === 'Funcionário') cur.funcionarios++
    else cur.dependentes++
    relMesGlobal.set(mes, cur)
  }
  const consultasRelacaoPorMesGlobal = [...relMesGlobal.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }))

  // ===== GASTOS POR TITULAR (global, todas as empresas) =====
  const vinculoByIdGlobal = new Map<string, any>()
  for (const v of allVinculos) vinculoByIdGlobal.set(v.id, v)

  // Map registro_funcional → vínculo titular (somente funcionários, global)
  const regFuncTitularGlobal = new Map<string, any>()
  for (const v of allVinculos) {
    if (v.registro_funcional && classRelacao(v.relacao) === 'Funcionário') {
      regFuncTitularGlobal.set(v.registro_funcional, v)
    }
  }

  function resolverTitularVinculoGlobal(v: any): any {
    if (!v) return null
    if (classRelacao(v.relacao) !== 'Dependente') return v
    if (v.titular_id && vinculoByIdGlobal.has(v.titular_id)) return vinculoByIdGlobal.get(v.titular_id)
    if (v.registro_funcional && regFuncTitularGlobal.has(v.registro_funcional)) {
      return regFuncTitularGlobal.get(v.registro_funcional)
    }
    return null
  }

  type TitularRowAdmin = {
    nome: string
    cargo: string
    departamento: string
    registroFuncional: string
    empresa: string
    consultasProprias: number
    consultasDependentes: number
    valorProprio: number
    valorDependentes: number
    dependentes: Map<string, { nome: string; relacao: string; consultas: number; valor: number }>
  }

  const titularMapGlobal = new Map<string, TitularRowAdmin>()

  for (const a of ats) {
    const vinculo = vinculoMapGlobal.get(a.paciente_id)
    if (!vinculo) continue

    const isDependente = classRelacao(vinculo.relacao) === 'Dependente'
    const titularVinculo = isDependente ? (resolverTitularVinculoGlobal(vinculo) ?? vinculo) : vinculo
    const titularKey = titularVinculo?.id ?? vinculo.id ?? a.paciente_id
    if (!titularKey) continue

    const empId = pacienteEmpresa.get(a.paciente_id) ?? (vinculo.empresa_id as string | undefined)
    const empresaNome = empId ? (empresaMap.get(empId) as any)?.nome ?? '—' : 'Particular'

    const titularNome = titularVinculo?.nome_completo ?? vinculo.nome_completo ?? '—'
    const cur = titularMapGlobal.get(titularKey) ?? {
      nome: titularNome,
      cargo: titularVinculo?.cargo ?? vinculo?.cargo ?? '—',
      departamento: titularVinculo?.departamento ?? vinculo?.departamento ?? '—',
      registroFuncional: titularVinculo?.registro_funcional ?? vinculo?.registro_funcional ?? '—',
      empresa: empresaNome,
      consultasProprias: 0,
      consultasDependentes: 0,
      valorProprio: 0,
      valorDependentes: 0,
      dependentes: new Map(),
    }

    const valor = a.valor_cobrado ?? 0
    if (isDependente) {
      cur.consultasDependentes++
      cur.valorDependentes += valor
      const depCur = cur.dependentes.get(a.paciente_id) ?? {
        nome: vinculo.nome_completo ?? '—',
        relacao: vinculo.relacao ?? '—',
        consultas: 0,
        valor: 0,
      }
      depCur.consultas++
      depCur.valor += valor
      cur.dependentes.set(a.paciente_id, depCur)
    } else {
      cur.consultasProprias++
      cur.valorProprio += valor
    }

    titularMapGlobal.set(titularKey, cur)
  }

  const gastosPorTitularGlobal = [...titularMapGlobal.values()]
    .map(t => ({
      nome: t.nome,
      cargo: t.cargo,
      departamento: t.departamento,
      registroFuncional: t.registroFuncional,
      empresa: t.empresa,
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

  // ===== RECEITAS POR MÊS — detalhado (consultas empresa + mensalidade + particular) =====
  const mensalidadeMensal = totalMensalidades // valor de 1 mês de mensalidade de todas as empresas
  const recMesMap = new Map<string, { valorConsultas: number; valorMensalidade: number; valorParticular: number }>()

  for (const a of ats) {
    const d = new Date(a.criado_em)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = recMesMap.get(mes) ?? { valorConsultas: 0, valorMensalidade: 0, valorParticular: 0 }
    const eId = pacienteEmpresa.get(a.paciente_id)
    if (eId) {
      const emp = empresaMap.get(eId) as any
      cur.valorConsultas += emp?.preco_consulta ?? a.valor_cobrado ?? 0
    } else {
      cur.valorParticular += a.valor_cobrado ?? 0
    }
    recMesMap.set(mes, cur)
  }

  // Enumera meses no período e atribui mensalidade (fee mensal fixo por mês)
  const pStart = new Date(inicio)
  const pEnd = new Date(fim)
  const mCursor = new Date(pStart.getFullYear(), pStart.getMonth(), 1)
  while (mCursor <= pEnd) {
    const mes = `${mCursor.getFullYear()}-${String(mCursor.getMonth() + 1).padStart(2, '0')}`
    const cur = recMesMap.get(mes) ?? { valorConsultas: 0, valorMensalidade: 0, valorParticular: 0 }
    cur.valorMensalidade = mensalidadeMensal
    recMesMap.set(mes, cur)
    mCursor.setMonth(mCursor.getMonth() + 1)
  }

  const receitasPorMes = [...recMesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }))

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
    distribuicaoRelacaoGlobal,
    detalheRelacaoGlobal,
    consultasRelacaoPorMesGlobal,
    gastosPorTitularGlobal,
    receitasPorMes,
  })
}
