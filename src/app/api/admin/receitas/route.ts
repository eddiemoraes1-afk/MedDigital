import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/** Extrai nomes de medicamentos de um bloco de texto (1 por linha) */
function parseMedicamentos(texto: string): string[] {
  return texto
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      // Pega o texto antes do primeiro traço/hífen (ex: "Paracetamol 500mg - 1 cp")
      const semTraco = l.split(/\s*[-–—]\s*/)[0].trim()
      // Pega até as 3 primeiras palavras (nome + dosagem)
      const palavras = semTraco.split(' ')
      return palavras.slice(0, palavras.length > 2 ? 2 : palavras.length).join(' ')
    })
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const admin = createAdminClient()

  const { searchParams } = new URL(req.url)
  const dataInicio      = searchParams.get('dataInicio')
  const dataFim         = searchParams.get('dataFim')
  const empresaId       = searchParams.get('empresa_id')
  const tipoFilter      = searchParams.get('tipo')
  const nomeFilter      = searchParams.get('nome')?.toLowerCase().trim() || ''
  const medFilter       = searchParams.get('medicamento')?.toLowerCase().trim() || ''

  // Empresas para o dropdown
  const { data: empresas } = await admin.from('empresas').select('id, nome').order('nome')

  // Query de receitas
  let query = admin
    .from('receitas')
    .select('id, paciente_id, medico_id, empresa_id, atendimento_id, tipo, medicamentos, instrucoes, data_emissao, validade, status, valor_cobrado, valor_medico, valor_coparticipacao, criado_em')
    .order('data_emissao', { ascending: false })

  if (dataInicio) query = query.gte('data_emissao', dataInicio)
  if (dataFim)    query = query.lte('data_emissao', dataFim)
  if (empresaId)  query = query.eq('empresa_id', empresaId)
  if (tipoFilter) query = query.eq('tipo', tipoFilter)
  if (medFilter)  query = query.ilike('medicamentos', `%${medFilter}%`)

  const { data: receitas } = await query
  let recs = (receitas ?? []) as any[]

  // Buscar pacientes
  const pacIds = [...new Set(recs.map(r => r.paciente_id).filter(Boolean))]
  const { data: pacientes } = pacIds.length
    ? await admin.from('pacientes').select('id, nome, sexo, cpf').in('id', pacIds)
    : { data: [] }
  const pacMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))

  // Filtrar por nome de paciente
  if (nomeFilter) {
    recs = recs.filter(r => {
      const p = pacMap.get(r.paciente_id) as any
      return p?.nome?.toLowerCase().includes(nomeFilter)
    })
  }

  // Buscar médicos
  const medIds = [...new Set(recs.map(r => r.medico_id).filter(Boolean))]
  const { data: medicos } = medIds.length
    ? await admin.from('medicos').select('id, nome, especialidade').in('id', medIds)
    : { data: [] }
  const medMap = new Map((medicos ?? []).map((m: any) => [m.id, m]))
  const empresaMap = new Map((empresas ?? []).map((e: any) => [e.id, e]))

  if (recs.length === 0) {
    return NextResponse.json({
      kpis: { total: 0, totalMedicamentos: 0, pacientesUnicos: 0, valorTotal: 0 },
      porMes: [], porTipo: [], porSexo: [], porMedico: [], porEmpresa: [],
      topMedicamentos: [], topPacientes: [], registros: [],
      empresas: empresas ?? [],
    })
  }

  // KPIs
  const total = recs.length
  const pacientesUnicos = new Set(recs.map(r => r.paciente_id)).size
  const valorTotal = recs.reduce((s: number, r: any) => s + (Number(r.valor_cobrado) || 0), 0)
  const todosMeds = recs.flatMap(r => parseMedicamentos(r.medicamentos ?? ''))
  const totalMedicamentos = todosMeds.length

  // Por mês
  const mesMap = new Map<string, { receitas: number; medicamentos: number }>()
  for (const r of recs) {
    const d = new Date(r.data_emissao || r.criado_em)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(key) ?? { receitas: 0, medicamentos: 0 }
    cur.receitas++
    cur.medicamentos += parseMedicamentos(r.medicamentos ?? '').length
    mesMap.set(key, cur)
  }
  const porMes = [...mesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }))

  // Por tipo
  const tipoMap = new Map<string, number>()
  for (const r of recs) {
    const t = r.tipo ?? 'simples'
    tipoMap.set(t, (tipoMap.get(t) ?? 0) + 1)
  }
  const porTipo = [...tipoMap.entries()]
    .map(([tipo, receitas]) => ({ tipo, receitas }))
    .sort((a, b) => b.receitas - a.receitas)

  // Por sexo
  const sexoMap = new Map<string, { receitas: number; medicamentos: number }>()
  for (const r of recs) {
    const p = pacMap.get(r.paciente_id) as any
    const s = p?.sexo === 'masculino' ? 'Masculino' : p?.sexo === 'feminino' ? 'Feminino' : 'Não informado'
    const cur = sexoMap.get(s) ?? { receitas: 0, medicamentos: 0 }
    cur.receitas++
    cur.medicamentos += parseMedicamentos(r.medicamentos ?? '').length
    sexoMap.set(s, cur)
  }
  const porSexo = [...sexoMap.entries()].map(([sexo, v]) => ({ sexo, ...v }))

  // Por médico
  const medAtMap = new Map<string, { nome: string; especialidade: string; receitas: number; medicamentos: number }>()
  for (const r of recs) {
    if (!r.medico_id) continue
    const m = medMap.get(r.medico_id) as any
    if (!m) continue
    const cur = medAtMap.get(r.medico_id) ?? { nome: m.nome, especialidade: m.especialidade ?? '', receitas: 0, medicamentos: 0 }
    cur.receitas++
    cur.medicamentos += parseMedicamentos(r.medicamentos ?? '').length
    medAtMap.set(r.medico_id, cur)
  }
  const porMedico = [...medAtMap.values()].sort((a, b) => b.receitas - a.receitas)

  // Por empresa
  const empAtMap = new Map<string, { nome: string; receitas: number; medicamentos: number }>()
  for (const r of recs) {
    const empNome = r.empresa_id ? (empresaMap.get(r.empresa_id) as any)?.nome ?? '—' : 'Particular'
    const key = r.empresa_id ?? '_particular'
    const cur = empAtMap.get(key) ?? { nome: empNome, receitas: 0, medicamentos: 0 }
    cur.receitas++
    cur.medicamentos += parseMedicamentos(r.medicamentos ?? '').length
    empAtMap.set(key, cur)
  }
  const porEmpresa = [...empAtMap.values()].sort((a, b) => b.receitas - a.receitas)

  // Top medicamentos
  const medCountMap = new Map<string, number>()
  for (const r of recs) {
    for (const med of parseMedicamentos(r.medicamentos ?? '')) {
      medCountMap.set(med, (medCountMap.get(med) ?? 0) + 1)
    }
  }
  const topMedicamentos = [...medCountMap.entries()]
    .map(([nome, receitas]) => ({ nome, receitas }))
    .sort((a, b) => b.receitas - a.receitas)
    .slice(0, 15)

  // Top pacientes
  const pacAtMap = new Map<string, { nome: string; empresa: string; receitas: number; medicamentos: number; tipoFreq: Map<string, number> }>()
  for (const r of recs) {
    if (!r.paciente_id) continue
    const p = pacMap.get(r.paciente_id) as any
    const empNome = r.empresa_id ? (empresaMap.get(r.empresa_id) as any)?.nome ?? '—' : 'Particular'
    const cur = pacAtMap.get(r.paciente_id) ?? { nome: p?.nome ?? '—', empresa: empNome, receitas: 0, medicamentos: 0, tipoFreq: new Map() }
    cur.receitas++
    cur.medicamentos += parseMedicamentos(r.medicamentos ?? '').length
    cur.tipoFreq.set(r.tipo ?? 'simples', (cur.tipoFreq.get(r.tipo ?? 'simples') ?? 0) + 1)
    pacAtMap.set(r.paciente_id, cur)
  }
  const topPacientes = [...pacAtMap.values()]
    .sort((a, b) => b.receitas - a.receitas)
    .slice(0, 10)
    .map(p => ({
      nome: p.nome,
      empresa: p.empresa,
      receitas: p.receitas,
      medicamentos: p.medicamentos,
      tipoFreq: [...p.tipoFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'simples',
    }))

  // Registros enriquecidos para exportação
  const LABEL_TIPO: Record<string, string> = {
    simples: 'Simples',
    especial: 'Especial',
    antimicrobiano: 'Antimicrobiano',
  }
  const registros = recs.map(r => {
    const p = pacMap.get(r.paciente_id) as any
    const m = medMap.get(r.medico_id) as any
    const empNome = r.empresa_id ? (empresaMap.get(r.empresa_id) as any)?.nome ?? 'Particular' : 'Particular'
    const meds = parseMedicamentos(r.medicamentos ?? '')
    return {
      data: r.data_emissao || r.criado_em?.split('T')[0] || '—',
      paciente: p?.nome ?? '—',
      cpf: p?.cpf ?? '—',
      sexo: p?.sexo ? (p.sexo === 'masculino' ? 'M' : 'F') : '—',
      medico: m?.nome ?? '—',
      especialidade: m?.especialidade ?? '—',
      tipo: LABEL_TIPO[r.tipo ?? 'simples'] ?? r.tipo,
      medicamentos: meds.join(' | '),
      qtdMedicamentos: meds.length,
      empresa: empNome,
      status: r.status ?? 'emitida',
      validade: r.validade ?? '—',
      valorCobrado: Number(r.valor_cobrado) || 0,
    }
  })

  return NextResponse.json({
    kpis: { total, totalMedicamentos, pacientesUnicos, valorTotal },
    porMes, porTipo, porSexo, porMedico, porEmpresa,
    topMedicamentos, topPacientes, registros,
    empresas: empresas ?? [],
  })
}
