import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_LABEL: Record<string, string> = {
  apto: 'Apto',
  apto_ressalvas: 'Apto c/ Ressalvas',
  nao_apto: 'Não Apto',
  emergencia: 'Emergência',
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

  // Pacientes desta empresa
  const { data: vinculos } = await admin
    .from('vinculos_empresa')
    .select('paciente_id, nome_completo, cargo, tipo_cargo, departamento, relacao')
    .eq('empresa_id', empresaId)

  const vinculoByPaciente: Record<string, any> = {}
  const pacienteIds: string[] = []
  for (const v of vinculos ?? []) {
    if (v.paciente_id) {
      vinculoByPaciente[v.paciente_id] = v
      pacienteIds.push(v.paciente_id)
    }
  }

  if (pacienteIds.length === 0) {
    return NextResponse.json({
      kpis: { total: 0, aptos: 0, naoAptos: 0, emergencias: 0, funcionariosComProtocolo: 0 },
      porMes: [], porStatus: [], porMotivo: [], porMedico: [], porSecretaria: [], porCargo: [], lista: [],
    })
  }

  // Exclusões no período
  const { data: rows, error } = await admin
    .from('exclusoes_telemedicina')
    .select(`
      id, criado_em, atendimento_id, paciente_id, medico_id,
      status, motivos, motivo_outro, conduta, ciente_paciente, observacoes,
      medicos(nome, especialidade)
    `)
    .in('paciente_id', pacienteIds)
    .gte('criado_em', deISO)
    .lte('criado_em', ateISO)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const registros = (rows ?? []) as any[]

  if (registros.length === 0) {
    return NextResponse.json({
      kpis: { total: 0, aptos: 0, naoAptos: 0, emergencias: 0, funcionariosComProtocolo: 0 },
      porMes: [], porStatus: [], porMotivo: [], porMedico: [], porSecretaria: [], porCargo: [], lista: [],
    })
  }

  // KPIs
  const total = registros.length
  const aptos = registros.filter((r: any) => r.status === 'apto' || r.status === 'apto_ressalvas').length
  const naoAptos = registros.filter((r: any) => r.status === 'nao_apto').length
  const emergencias = registros.filter((r: any) => r.status === 'emergencia').length
  const funcionariosComProtocolo = new Set(registros.map((r: any) => r.paciente_id)).size

  // Por mês
  const mesMap = new Map<string, number>()
  for (const r of registros) {
    const mes = r.criado_em.slice(0, 7)
    mesMap.set(mes, (mesMap.get(mes) ?? 0) + 1)
  }
  const porMes = [...mesMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, total]) => ({ mes, total }))

  // Por status
  const statusMap = new Map<string, number>()
  for (const r of registros) {
    const s = r.status ?? 'apto'
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1)
  }
  const porStatus = [...statusMap.entries()].map(([status, total]) => ({ status, label: STATUS_LABEL[status] ?? status, total }))

  // Por motivo
  const motivoMap = new Map<string, number>()
  for (const r of registros) {
    const motivos: string[] = r.motivos ?? []
    for (const m of motivos) {
      motivoMap.set(m, (motivoMap.get(m) ?? 0) + 1)
    }
    if (r.motivo_outro) {
      motivoMap.set(r.motivo_outro, (motivoMap.get(r.motivo_outro) ?? 0) + 1)
    }
  }
  const porMotivo = [...motivoMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 15).map(([motivo, total]) => ({ motivo, total }))

  // Por médico
  const medicoMap = new Map<string, { nome: string; total: number; naoAptos: number }>()
  for (const r of registros) {
    const id = r.medico_id ?? 'desconhecido'
    const nome = r.medicos?.nome ?? 'Desconhecido'
    const cur = medicoMap.get(id) ?? { nome, total: 0, naoAptos: 0 }
    cur.total += 1
    if (r.status === 'nao_apto') cur.naoAptos += 1
    medicoMap.set(id, cur)
  }
  const porMedico = [...medicoMap.values()].sort((a, b) => b.total - a.total).slice(0, 10)

  // Por secretaria
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

  // Lista detalhada
  const lista = registros.map((r: any) => {
    const v = vinculoByPaciente[r.paciente_id]
    return {
      id: r.id,
      data: r.criado_em,
      funcionario: v?.nome_completo ?? '—',
      cargo: v?.cargo ?? '—',
      secretaria: v?.departamento ?? '—',
      relacao: v?.relacao ?? 'Funcionário',
      medico: r.medicos?.nome ?? '—',
      status: r.status ?? 'apto',
      statusLabel: STATUS_LABEL[r.status] ?? r.status,
      motivos: r.motivos ?? [],
      motivo_outro: r.motivo_outro ?? null,
      conduta: r.conduta ?? '',
      ciente_paciente: r.ciente_paciente ?? false,
      observacoes: r.observacoes ?? '',
    }
  })

  return NextResponse.json({
    kpis: { total, aptos, naoAptos, emergencias, funcionariosComProtocolo },
    porMes, porStatus, porMotivo, porMedico, porSecretaria, porCargo, lista,
  })
}
