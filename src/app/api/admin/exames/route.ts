import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function isAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis_sistema')
    .select('role')
    .eq('usuario_id', user.id)
    .single()
  return perfil?.role === 'admin'
}

// Extrai nomes de exames individuais a partir de texto livre (um por linha)
function parseExames(texto: string): string[] {
  return texto
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dataInicio  = searchParams.get('dataInicio')  || ''
  const dataFim     = searchParams.get('dataFim')     || ''
  const empresa_id  = searchParams.get('empresa_id')  || ''
  const urgencia    = searchParams.get('urgencia')    || ''
  const nomePac     = searchParams.get('nome')        || ''
  const nomeExame   = searchParams.get('exame')       || ''

  const admin = createAdminClient()

  // ── Query principal ────────────────────────────────────────────────────────
  let q = admin
    .from('solicitacoes_exames')
    .select(`
      id, data_solicitacao, exames, indicacao_clinica, observacoes,
      urgencia, status, criado_em,
      paciente_id, medico_id, empresa_id,
      pacientes(nome, cpf, sexo, data_nascimento),
      medicos(nome, crm, especialidade),
      empresas(nome)
    `)
    .order('data_solicitacao', { ascending: false })

  if (dataInicio) q = q.gte('data_solicitacao', dataInicio)
  if (dataFim)    q = q.lte('data_solicitacao', dataFim)
  if (empresa_id) {
    if (empresa_id === '__particular__') q = q.is('empresa_id', null)
    else q = q.eq('empresa_id', empresa_id)
  }
  if (urgencia)   q = q.eq('urgencia', urgencia)
  if (nomeExame)  q = q.ilike('exames', `%${nomeExame}%`)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtro pós-query por nome do paciente (não indexável facilmente no Supabase)
  let registros = (rows ?? []) as any[]
  if (nomePac) {
    const lower = nomePac.toLowerCase()
    registros = registros.filter((r: any) =>
      r.pacientes?.nome?.toLowerCase().includes(lower)
    )
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalSolicitacoes = registros.length
  const pacientesUnicos = new Set(registros.map((r: any) => r.paciente_id)).size
  const totalExames = registros.reduce((s: number, r: any) => s + parseExames(r.exames).length, 0)
  const urgentes = registros.filter((r: any) => r.urgencia === 'urgente' || r.urgencia === 'emergencia').length

  // ── Por Mês ───────────────────────────────────────────────────────────────
  const mesCounts: Record<string, number> = {}
  registros.forEach((r: any) => {
    const mes = r.data_solicitacao?.slice(0, 7) ?? 'N/A'
    mesCounts[mes] = (mesCounts[mes] ?? 0) + 1
  })
  const porMes = Object.entries(mesCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({ mes, total }))

  // ── Por Urgência ──────────────────────────────────────────────────────────
  const urgCounts: Record<string, number> = {}
  registros.forEach((r: any) => {
    const u = r.urgencia ?? 'normal'
    urgCounts[u] = (urgCounts[u] ?? 0) + 1
  })
  const porUrgencia = Object.entries(urgCounts).map(([urgencia, total]) => ({ urgencia, total }))

  // ── Por Sexo ──────────────────────────────────────────────────────────────
  const sexoCounts: Record<string, number> = {}
  registros.forEach((r: any) => {
    const s = r.pacientes?.sexo ?? 'não informado'
    sexoCounts[s] = (sexoCounts[s] ?? 0) + 1
  })
  const porSexo = Object.entries(sexoCounts).map(([sexo, total]) => ({ sexo, total }))

  // ── Por Médico ────────────────────────────────────────────────────────────
  const medicoCounts: Record<string, { nome: string; total: number; exames: number }> = {}
  registros.forEach((r: any) => {
    const id = r.medico_id ?? 'desconhecido'
    const nome = r.medicos?.nome ?? 'Desconhecido'
    if (!medicoCounts[id]) medicoCounts[id] = { nome, total: 0, exames: 0 }
    medicoCounts[id].total += 1
    medicoCounts[id].exames += parseExames(r.exames).length
  })
  const porMedico = Object.values(medicoCounts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)

  // ── Por Empresa ───────────────────────────────────────────────────────────
  const empresaCounts: Record<string, { nome: string; total: number }> = {}
  registros.forEach((r: any) => {
    const nome = r.empresas?.nome ?? 'Particular'
    empresaCounts[nome] = (empresaCounts[nome] ?? 0) as any
    empresaCounts[nome] = { nome, total: ((empresaCounts[nome] as any).total ?? 0) + 1 }
  })
  const porEmpresaFinal: Record<string, number> = {}
  registros.forEach((r: any) => {
    const nome = r.empresas?.nome ?? 'Particular'
    porEmpresaFinal[nome] = (porEmpresaFinal[nome] ?? 0) + 1
  })
  const porEmpresa = Object.entries(porEmpresaFinal)
    .sort(([, a], [, b]) => b - a)
    .map(([nome, total]) => ({ nome, total }))

  // ── Top Exames ────────────────────────────────────────────────────────────
  const exameCounts: Record<string, number> = {}
  registros.forEach((r: any) => {
    parseExames(r.exames).forEach(nome => {
      const key = nome.toLowerCase()
      exameCounts[key] = (exameCounts[key] ?? 0) + 1
    })
  })
  const topExames = Object.entries(exameCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([nome, total]) => ({ nome, total }))

  // ── Top Pacientes ─────────────────────────────────────────────────────────
  const pacCounts: Record<string, { nome: string; total: number; urgentes: number }> = {}
  registros.forEach((r: any) => {
    const id = r.paciente_id
    const nome = r.pacientes?.nome ?? 'Desconhecido'
    if (!pacCounts[id]) pacCounts[id] = { nome, total: 0, urgentes: 0 }
    pacCounts[id].total += 1
    if (r.urgencia === 'urgente' || r.urgencia === 'emergencia') pacCounts[id].urgentes += 1
  })
  const topPacientes = Object.values(pacCounts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // ── Empresas (para filtro) ────────────────────────────────────────────────
  const { data: empresasList } = await admin
    .from('empresas')
    .select('id, nome')
    .order('nome')

  // ── Registros enriquecidos (para exportação) ──────────────────────────────
  const registrosExport = registros.map((r: any) => ({
    id: r.id,
    data: r.data_solicitacao,
    paciente: r.pacientes?.nome ?? '',
    cpf: r.pacientes?.cpf ?? '',
    sexo: r.pacientes?.sexo ?? '',
    medico: r.medicos?.nome ?? '',
    especialidade: r.medicos?.especialidade ?? '',
    empresa: r.empresas?.nome ?? 'Particular',
    urgencia: r.urgencia ?? 'normal',
    exames: r.exames ?? '',
    indicacao_clinica: r.indicacao_clinica ?? '',
    observacoes: r.observacoes ?? '',
    status: r.status ?? 'emitida',
    total_exames: parseExames(r.exames).length,
  }))

  return NextResponse.json({
    kpis: { totalSolicitacoes, pacientesUnicos, totalExames, urgentes },
    porMes,
    porUrgencia,
    porSexo,
    porMedico,
    porEmpresa,
    topExames,
    topPacientes,
    registros: registrosExport,
    empresas: empresasList ?? [],
  })
}
