import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Protocolo de Manchester — vermelho primeiro, azul por último
const ORDEM_RISCO: Record<string, number> = {
  vermelho: 0,
  laranja:  1,
  amarelo:  2,
  verde:    3,
  azul:     4,
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminClient()

  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!medico) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: fila, error } = await adminSupabase
    .from('atendimentos')
    .select('id, criado_em, medico_id, paciente_id, notas_medico, urgente, pacientes(id, nome, cpf), triagens(id, classificacao_risco, resumo_ia)')
    .eq('status', 'aguardando')
    .eq('tipo', 'virtual')
    // Só mostra: sem médico OU atribuídos a este médico (encaminhado / assumido)
    .or(`medico_id.is.null,medico_id.eq.${medico.id}`)
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ordenar: risco (urgência primeiro) → hora de chegada (mais antigo primeiro)
  function ordenarFila<T extends { criado_em: string; triagens: unknown }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => {
      const ra = ORDEM_RISCO[(a.triagens as any)?.classificacao_risco ?? ''] ?? 4
      const rb = ORDEM_RISCO[(b.triagens as any)?.classificacao_risco ?? ''] ?? 4
      if (ra !== rb) return ra - rb
      return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    })
  }

  const todos = fila ?? []

  // Separar fila preferencial (urgente=true) da fila normal
  const filaUrgente = ordenarFila(todos.filter((a: any) => a.urgente))
  const filaNormal  = ordenarFila(todos.filter((a: any) => !a.urgente))

  // Retrocompatibilidade: campo fila = tudo junto (para componentes que ainda usam a lista unificada)
  const filaOrdenada = [...filaUrgente, ...filaNormal]

  // Consulta em andamento deste médico (saiu da tela sem finalizar?)
  const { data: consultaAtivaRow } = await adminSupabase
    .from('atendimentos')
    .select('id, pacientes(nome)')
    .eq('medico_id', medico.id)
    .eq('status', 'em_andamento')
    .maybeSingle()

  const consultaAtiva = consultaAtivaRow
    ? { id: consultaAtivaRow.id, pacienteNome: (consultaAtivaRow.pacientes as any)?.nome ?? 'Paciente' }
    : null

  return NextResponse.json({ fila: filaOrdenada, filaUrgente, filaNormal, medicoId: medico.id, consultaAtiva })
}
