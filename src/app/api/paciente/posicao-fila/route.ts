import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Protocolo de Manchester — vermelho primeiro, azul por último
const ORDEM_RISCO: Record<string, number> = {
  vermelho: 0, laranja: 1, amarelo: 2, verde: 3, azul: 4,
}

/**
 * GET /api/paciente/posicao-fila?atendimento_id=xxx
 *
 * Retorna a posição do paciente na fila de espera virtual,
 * número de médicos atendendo e tempo estimado de espera.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const atendimento_id = searchParams.get('atendimento_id')
  if (!atendimento_id) {
    return NextResponse.json({ error: 'atendimento_id obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  // Verificar que o atendimento pertence ao paciente logado
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { data: atendimento } = await admin
    .from('atendimentos')
    .select('id, status, medico_id, criado_em, triagens(classificacao_risco)')
    .eq('id', atendimento_id)
    .eq('paciente_id', paciente.id)
    .single()

  if (!atendimento) return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 })

  // Médico assumiu (medico_id definido, ainda aguardando entrar na sala)
  const medicoAssumiu = atendimento.status === 'aguardando' && atendimento.medico_id !== null

  // Buscar toda a fila pública (sem médico)
  const { data: filaGeral } = await admin
    .from('atendimentos')
    .select('id, criado_em, triagens(classificacao_risco)')
    .eq('status', 'aguardando')
    .eq('tipo', 'virtual')
    .is('medico_id', null)

  // Ordenar igual ao painel do médico: risco + chegada
  const filaOrdenada = (filaGeral ?? []).sort((a, b) => {
    const ra = ORDEM_RISCO[(a.triagens as any)?.classificacao_risco ?? ''] ?? 4
    const rb = ORDEM_RISCO[(b.triagens as any)?.classificacao_risco ?? ''] ?? 4
    if (ra !== rb) return ra - rb
    return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
  })

  const idxFila   = filaOrdenada.findIndex(a => a.id === atendimento_id)
  const posicao   = medicoAssumiu ? null : (idxFila >= 0 ? idxFila + 1 : null)
  const total     = filaOrdenada.length

  // Número de médicos em consulta agora
  const { count: medicosAtivos } = await admin
    .from('atendimentos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'em_andamento')

  // Tempo estimado: posição / max(médicos ativos, 1) × 15 min por consulta
  let tempoEstimado: number | null = null
  if (posicao !== null && posicao > 0) {
    const md = Math.max(medicosAtivos ?? 0, 1)
    tempoEstimado = Math.ceil(posicao / md) * 15
  }

  return NextResponse.json({
    posicao,          // 1-based; null se médico já assumiu
    total,            // total na fila sem médico
    medicoAssumiu,    // true = médico está revisando prontuário
    medicosAtivos: medicosAtivos ?? 0,
    tempoEstimado,    // minutos estimados; null se assumido
  })
}
