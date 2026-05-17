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

const STATUS_LABEL: Record<string, string> = {
  apto: 'Apto',
  apto_ressalvas: 'Apto c/ Ressalvas',
  nao_apto: 'Não Apto',
  emergencia: 'Emergência',
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const de         = searchParams.get('de')         || ''
  const ate        = searchParams.get('ate')        || ''
  const empresa_id = searchParams.get('empresa_id') || ''
  const status     = searchParams.get('status')     || ''
  const medico_id  = searchParams.get('medico_id')  || ''

  const admin = createAdminClient()

  // ── Busca todos os protocolos com dados de paciente e médico ───────────────
  let q = admin
    .from('exclusoes_telemedicina')
    .select(`
      id, criado_em, status, motivos, motivo_outro, conduta,
      ciente_paciente, observacoes,
      paciente_id, medico_id,
      pacientes(nome, cpf, sexo, data_nascimento),
      medicos(nome, crm, crm_uf, especialidade, sexo)
    `)
    .order('criado_em', { ascending: false })

  if (de)        q = q.gte('criado_em', de)
  if (ate)       q = q.lte('criado_em', ate + 'T23:59:59')
  if (status)    q = q.eq('status', status)
  if (medico_id) q = q.eq('medico_id', medico_id)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let registros = (rows ?? []) as any[]

  // ── Buscar vínculo empresa para cada paciente ─────────────────────────────
  const cpfSet = [...new Set(registros.map((r: any) => r.pacientes?.cpf).filter(Boolean))]
  let vinculos: any[] = []
  if (cpfSet.length > 0) {
    const { data: vData } = await admin
      .from('vinculos_empresa')
      .select('cpf, cargo, departamento, relacao, empresa_id, empresas(id, nome)')
      .in('cpf', cpfSet)
    vinculos = vData ?? []
  }
  const vinculoMap: Record<string, any> = {}
  vinculos.forEach((v: any) => { if (v.cpf) vinculoMap[v.cpf] = v })

  // Filtrar por empresa
  if (empresa_id) {
    if (empresa_id === '__particular__') {
      registros = registros.filter((r: any) => !vinculoMap[r.pacientes?.cpf])
    } else {
      registros = registros.filter((r: any) => {
        const v = vinculoMap[r.pacientes?.cpf]
        return v?.empresa_id === empresa_id
      })
    }
  }

  // ── Enriquecer registros ──────────────────────────────────────────────────
  const enriched = registros.map((r: any) => {
    const cpf = r.pacientes?.cpf
    const v = vinculoMap[cpf] ?? null
    return {
      id: r.id,
      data: r.criado_em,
      paciente: r.pacientes?.nome ?? '—',
      cpf: r.pacientes?.cpf ?? '—',
      sexo: r.pacientes?.sexo ?? '—',
      medico: r.medicos?.nome ?? '—',
      medico_sexo: r.medicos?.sexo ?? null,
      crm: r.medicos?.crm ? `${r.medicos.crm}/${r.medicos.crm_uf}` : '—',
      especialidade: r.medicos?.especialidade ?? '—',
      empresa: (v?.empresas as any)?.nome ?? 'Particular',
      empresa_id_val: v?.empresa_id ?? null,
      cargo: v?.cargo ?? '—',
      departamento: v?.departamento ?? '—',
      relacao: v?.relacao ?? '—',
      status: r.status ?? '—',
      statusLabel: STATUS_LABEL[r.status] ?? r.status,
      motivos: Array.isArray(r.motivos) ? r.motivos : [],
      motivo_outro: r.motivo_outro ?? null,
      conduta: r.conduta ?? '',
      ciente_paciente: r.ciente_paciente ?? false,
      observacoes: r.observacoes ?? '',
    }
  })

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const total = enriched.length
  const aptos = enriched.filter(r => r.status === 'apto' || r.status === 'apto_ressalvas').length
  const naoAptos = enriched.filter(r => r.status === 'nao_apto').length
  const emergencias = enriched.filter(r => r.status === 'emergencia').length
  const pacientesUnicos = new Set(enriched.map(r => r.cpf).filter(c => c !== '—')).size
  const medicosUnicos = new Set(enriched.map(r => r.medico).filter(Boolean)).size

  // ── Por Mês ───────────────────────────────────────────────────────────────
  const mesCounts: Record<string, number> = {}
  enriched.forEach(r => {
    const mes = r.data?.slice(0, 7) ?? 'N/A'
    mesCounts[mes] = (mesCounts[mes] ?? 0) + 1
  })
  const porMes = Object.entries(mesCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({ mes, total }))

  // ── Por Status ────────────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  enriched.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1 })
  const porStatus = Object.entries(statusCounts).map(([status, total]) => ({
    status, label: STATUS_LABEL[status] ?? status, total,
  }))

  // ── Por Motivo ────────────────────────────────────────────────────────────
  const motivoCounts: Record<string, number> = {}
  enriched.forEach(r => {
    const todos = [...r.motivos, r.motivo_outro].filter(Boolean)
    todos.forEach((m: string) => { motivoCounts[m] = (motivoCounts[m] ?? 0) + 1 })
  })
  const porMotivo = Object.entries(motivoCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([motivo, total]) => ({ motivo, total }))

  // ── Por Médico ────────────────────────────────────────────────────────────
  const medicoCounts: Record<string, { nome: string; total: number; naoAptos: number }> = {}
  enriched.forEach(r => {
    if (!medicoCounts[r.medico]) medicoCounts[r.medico] = { nome: r.medico, total: 0, naoAptos: 0 }
    medicoCounts[r.medico].total += 1
    if (r.status === 'nao_apto') medicoCounts[r.medico].naoAptos += 1
  })
  const porMedico = Object.values(medicoCounts).sort((a, b) => b.total - a.total).slice(0, 15)

  // ── Por Empresa ───────────────────────────────────────────────────────────
  const empresaCounts: Record<string, { nome: string; total: number; naoAptos: number }> = {}
  enriched.forEach(r => {
    const e = r.empresa
    if (!empresaCounts[e]) empresaCounts[e] = { nome: e, total: 0, naoAptos: 0 }
    empresaCounts[e].total += 1
    if (r.status === 'nao_apto') empresaCounts[e].naoAptos += 1
  })
  const porEmpresa = Object.values(empresaCounts).sort((a, b) => b.total - a.total)

  // ── Por Departamento ──────────────────────────────────────────────────────
  const deptCounts: Record<string, number> = {}
  enriched.forEach(r => {
    if (r.departamento && r.departamento !== '—') {
      deptCounts[r.departamento] = (deptCounts[r.departamento] ?? 0) + 1
    }
  })
  const porDepartamento = Object.entries(deptCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([departamento, total]) => ({ departamento, total }))

  // ── Por Cargo ─────────────────────────────────────────────────────────────
  const cargoCounts: Record<string, number> = {}
  enriched.forEach(r => {
    if (r.cargo && r.cargo !== '—') {
      cargoCounts[r.cargo] = (cargoCounts[r.cargo] ?? 0) + 1
    }
  })
  const porCargo = Object.entries(cargoCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([cargo, total]) => ({ cargo, total }))

  // ── Lista de empresas (para filtro) ───────────────────────────────────────
  const { data: empresasList } = await admin
    .from('empresas')
    .select('id, nome')
    .order('nome')

  // ── Lista de médicos (para filtro) ────────────────────────────────────────
  const medicosOptions = Object.entries(medicoCounts).map(([nome]) => ({ nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  return NextResponse.json({
    kpis: { total, aptos, naoAptos, emergencias, pacientesUnicos, medicosUnicos },
    porMes,
    porStatus,
    porMotivo,
    porMedico,
    porEmpresa,
    porDepartamento,
    porCargo,
    lista: enriched,
    empresas: empresasList ?? [],
    medicosOptions,
  })
}
