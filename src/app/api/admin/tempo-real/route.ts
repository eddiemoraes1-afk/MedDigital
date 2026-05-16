import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAdmin()
  const admin = createAdminClient()

  const agora = new Date()
  const ONLINE_THRESHOLD_MS = 2 * 60 * 1000 // 2 min

  const [
    { data: filaData },
    { data: consultasAtivasData },
    { data: assumidosData },
    { data: medicosData },
    { data: presencasData },
    { data: vinculosData },
    { data: empresasData },
  ] = await Promise.all([
    // Fila de espera virtual (inclui medico_id para saber se já foi assumido)
    admin
      .from('atendimentos')
      .select('id, criado_em, paciente_id, medico_id, triagem_id, urgente, pacientes(nome), triagens(classificacao_risco, resumo_ia)')
      .eq('status', 'aguardando')
      .eq('tipo', 'virtual')
      .order('criado_em', { ascending: true }),

    // Consultas em andamento agora (médico já entrou na sala)
    admin
      .from('atendimentos')
      .select('id, criado_em, iniciado_em, paciente_id, medico_id, pacientes(nome), medicos(nome, especialidade)')
      .eq('status', 'em_andamento')
      .not('medico_id', 'is', null),

    // Assumidos: aguardando + médico já clicou no nome (medico_id setado, ainda não entrou na sala)
    admin
      .from('atendimentos')
      .select('id, criado_em, paciente_id, medico_id, pacientes(nome), medicos(nome, especialidade)')
      .eq('status', 'aguardando')
      .eq('tipo', 'virtual')
      .not('medico_id', 'is', null),

    // Todos os médicos aprovados
    admin
      .from('medicos')
      .select('id, nome, especialidade, foto_url')
      .eq('status', 'aprovado')
      .order('nome'),

    // Presença
    admin.from('presenca_medicos').select('medico_id, ultimo_ping'),

    // Vínculos paciente → empresa
    admin.from('vinculos_empresa').select('paciente_id, empresa_id'),

    // Empresas
    admin.from('empresas').select('id, nome'),
  ])

  // Lookups
  const presencaMap = new Map(
    (presencasData ?? []).map(p => [p.medico_id, p.ultimo_ping as string])
  )
  const empresaMap = new Map((empresasData ?? []).map(e => [e.id, e.nome as string]))
  const pacienteEmpresa = new Map<string, string>()
  for (const v of vinculosData ?? []) {
    if (!pacienteEmpresa.has((v as any).paciente_id))
      pacienteEmpresa.set((v as any).paciente_id, (v as any).empresa_id)
  }

  // Médicos ocupados = em_andamento OU assumidos (revisando prontuário)
  const emAtendimento = new Set([
    ...(consultasAtivasData ?? []).map(a => a.medico_id as string),
    ...(assumidosData ?? []).map((a: any) => a.medico_id as string),
  ])

  function empresaDoPaciente(pacienteId: string): string {
    const empId = pacienteEmpresa.get(pacienteId)
    return empId ? (empresaMap.get(empId) ?? 'Empresa') : 'Particular'
  }

  // Médicos com status
  const medicos = (medicosData ?? []).map(m => {
    const ultimoPing = presencaMap.get(m.id) ?? null
    const isOnline = ultimoPing
      ? agora.getTime() - new Date(ultimoPing).getTime() < ONLINE_THRESHOLD_MS
      : false
    const status = emAtendimento.has(m.id) ? 'em_atendimento' : isOnline ? 'online' : 'offline'
    return {
      id: m.id,
      nome: m.nome,
      especialidade: m.especialidade ?? '',
      foto_url: (m as any).foto_url ?? null,
      status,
      ultimo_ping: ultimoPing,
    }
  })

  // Protocolo de Manchester — ordenação por risco
  const ORDEM_RISCO: Record<string, number> = {
    vermelho: 0, laranja: 1, amarelo: 2, verde: 3, azul: 4,
  }

  // Fila enriquecida e ordenada por risco → chegada
  const filaOrdenada = (filaData ?? []).sort((a: any, b: any) => {
    const ra = ORDEM_RISCO[a.triagens?.classificacao_risco ?? ''] ?? 4
    const rb = ORDEM_RISCO[b.triagens?.classificacao_risco ?? ''] ?? 4
    if (ra !== rb) return ra - rb
    return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
  })

  const fila = filaOrdenada.map((a: any, i: number) => ({
    id: a.id,
    posicao: i + 1,
    paciente_id: a.paciente_id,
    paciente_nome: a.pacientes?.nome ?? '—',
    classificacao_risco: a.triagens?.classificacao_risco ?? null,
    resumo_ia: a.triagens?.resumo_ia ?? null,
    empresa_nome: empresaDoPaciente(a.paciente_id),
    criado_em: a.criado_em,
    urgente: a.urgente ?? false,
    medico_id: a.medico_id ?? null, // não nulo = médico revisando prontuário
  }))

  const filaUrgente = fila.filter((a: any) => a.urgente)
  const filaNormal  = fila.filter((a: any) => !a.urgente)

  // Consultas ativas: em_andamento (médico na sala) + assumidos (revisando prontuário)
  const consultasAtivas = [
    ...(consultasAtivasData ?? []).map((a: any) => ({
      id: a.id,
      medico_id: a.medico_id,
      medico_nome: a.medicos?.nome ?? '—',
      medico_especialidade: a.medicos?.especialidade ?? '',
      paciente_nome: a.pacientes?.nome ?? '—',
      empresa_nome: empresaDoPaciente(a.paciente_id),
      criado_em: a.criado_em,
      iniciado_em: a.iniciado_em,
      assumido: false, // médico já entrou na sala
    })),
    ...(assumidosData ?? []).map((a: any) => ({
      id: a.id,
      medico_id: a.medico_id,
      medico_nome: a.medicos?.nome ?? '—',
      medico_especialidade: a.medicos?.especialidade ?? '',
      paciente_nome: a.pacientes?.nome ?? '—',
      empresa_nome: empresaDoPaciente(a.paciente_id),
      criado_em: a.criado_em,
      iniciado_em: null,
      assumido: true, // médico clicou no nome, revisando prontuário, ainda não entrou na sala
    })),
  ]

  return NextResponse.json({ fila, filaUrgente, filaNormal, medicos, consultasAtivas })
}
