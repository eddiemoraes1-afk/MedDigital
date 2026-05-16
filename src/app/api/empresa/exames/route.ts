import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function parseExames(texto: string): string[] {
  return texto
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const admin = createAdminClient()

  const { searchParams } = new URL(req.url)
  const de  = searchParams.get('de')  ?? new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
  const ate = searchParams.get('ate') ?? new Date().toISOString().split('T')[0]

  const deISO  = `${de}T00:00:00.000Z`
  const ateISO = `${ate}T23:59:59.999Z`

  // Buscar vínculos desta empresa
  const { data: vinculos } = await admin
    .from('vinculos_empresa')
    .select('paciente_id, nome_completo, cargo, tipo_cargo, departamento, relacao')
    .eq('empresa_id', empresaId)

  const vinculoByPaciente: Record<string, any> = {}
  for (const v of vinculos ?? []) {
    if (v.paciente_id) vinculoByPaciente[v.paciente_id] = v
  }

  // Buscar exames desta empresa no período
  const { data: rows, error } = await admin
    .from('solicitacoes_exames')
    .select(`
      id, data_solicitacao, exames, indicacao_clinica, observacoes,
      urgencia, status, criado_em,
      paciente_id, medico_id,
      pacientes(nome, cpf, sexo, data_nascimento),
      medicos(nome, especialidade)
    `)
    .eq('empresa_id', empresaId)
    .gte('data_solicitacao', deISO)
    .lte('data_solicitacao', ateISO)
    .order('data_solicitacao', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const registros = (rows ?? []) as any[]

  if (registros.length === 0) {
    return NextResponse.json({
      kpis: { totalSolicitacoes: 0, pacientesUnicos: 0, totalExames: 0, urgentes: 0 },
      porMes: [], porUrgencia: [], porSexo: [], porMedico: [],
      porSecretaria: [], porCargo: [], porRelacao: [], topExames: [], lista: [],
    })
  }

  // KPIs
  const totalSolicitacoes = registros.length
  const pacientesUnicos = new Set(registros.map((r: any) => r.paciente_id)).size
  const totalExames = registros.reduce((s: number, r: any) => s + parseExames(r.exames ?? '').length, 0)
  const urgentes = registros.filter((r: any) => r.urgencia === 'urgente' || r.urgencia === 'emergencia').length

  // Por mês
  const mesMap = new Map<string, number>()
  for (const r of registros) {
    const mes = (r.data_solicitacao ?? r.criado_em ?? '').slice(0, 7)
    mesMap.set(mes, (mesMap.get(mes) ?? 0) + 1)
  }
  const porMes = [...mesMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, total]) => ({ mes, total }))

  // Por urgência
  const urgMap = new Map<string, number>()
  for (const r of registros) {
    const u = r.urgencia ?? 'normal'
    urgMap.set(u, (urgMap.get(u) ?? 0) + 1)
  }
  const porUrgencia = [...urgMap.entries()].map(([urgencia, total]) => ({ urgencia, total }))

  // Por sexo
  const sexoMap = new Map<string, number>()
  for (const r of registros) {
    const s = r.pacientes?.sexo === 'masculino' ? 'Masculino' : r.pacientes?.sexo === 'feminino' ? 'Feminino' : 'Não informado'
    sexoMap.set(s, (sexoMap.get(s) ?? 0) + 1)
  }
  const porSexo = [...sexoMap.entries()].map(([sexo, total]) => ({ sexo, total }))

  // Por médico
  const medicoMap = new Map<string, { nome: string; total: number; totalExames: number }>()
  for (const r of registros) {
    const id = r.medico_id ?? 'desconhecido'
    const nome = r.medicos?.nome ?? 'Desconhecido'
    const cur = medicoMap.get(id) ?? { nome, total: 0, totalExames: 0 }
    cur.total += 1
    cur.totalExames += parseExames(r.exames ?? '').length
    medicoMap.set(id, cur)
  }
  const porMedico = [...medicoMap.values()].sort((a, b) => b.total - a.total).slice(0, 10)

  // Por secretaria (departamento)
  const secMap = new Map<string, number>()
  for (const r of registros) {
    const v = vinculoByPaciente[r.paciente_id]
    const sec = v?.departamento || 'Não informado'
    secMap.set(sec, (secMap.get(sec) ?? 0) + 1)
  }
  const porSecretaria = [...secMap.entries()].sort(([, a], [, b]) => b - a).map(([secretaria, total]) => ({ secretaria, total }))

  // Por cargo
  const cargoMap = new Map<string, number>()
  for (const r of registros) {
    const v = vinculoByPaciente[r.paciente_id]
    const cargo = v?.cargo || 'Não informado'
    cargoMap.set(cargo, (cargoMap.get(cargo) ?? 0) + 1)
  }
  const porCargo = [...cargoMap.entries()].sort(([, a], [, b]) => b - a).map(([cargo, total]) => ({ cargo, total }))

  // Por relação
  const relacaoMap = new Map<string, number>()
  for (const r of registros) {
    const v = vinculoByPaciente[r.paciente_id]
    const rel = v?.relacao || 'Funcionário'
    relacaoMap.set(rel, (relacaoMap.get(rel) ?? 0) + 1)
  }
  const porRelacao = [...relacaoMap.entries()].map(([relacao, total]) => ({ relacao, total }))

  // Top exames solicitados
  const exameCountMap = new Map<string, number>()
  for (const r of registros) {
    for (const nome of parseExames(r.exames ?? '')) {
      const key = nome.trim()
      exameCountMap.set(key, (exameCountMap.get(key) ?? 0) + 1)
    }
  }
  const topExames = [...exameCountMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 20).map(([nome, total]) => ({ nome, total }))

  // Lista detalhada
  const lista = registros.map((r: any) => {
    const v = vinculoByPaciente[r.paciente_id]
    return {
      id: r.id,
      data: r.data_solicitacao ?? r.criado_em,
      funcionario: v?.nome_completo ?? r.pacientes?.nome ?? '—',
      cargo: v?.cargo ?? '—',
      secretaria: v?.departamento ?? '—',
      relacao: v?.relacao ?? 'Funcionário',
      medico: r.medicos?.nome ?? '—',
      especialidade: r.medicos?.especialidade ?? '—',
      urgencia: r.urgencia ?? 'normal',
      exames: r.exames ?? '',
      totalExames: parseExames(r.exames ?? '').length,
      indicacao_clinica: r.indicacao_clinica ?? '',
      observacoes: r.observacoes ?? '',
      status: r.status ?? 'emitida',
    }
  })

  return NextResponse.json({
    kpis: { totalSolicitacoes, pacientesUnicos, totalExames, urgentes },
    porMes, porUrgencia, porSexo, porMedico, porSecretaria, porCargo, porRelacao, topExames, lista,
  })
}
