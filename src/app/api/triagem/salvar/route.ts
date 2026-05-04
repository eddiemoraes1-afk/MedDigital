import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * API route para salvar dados de triagem usando adminClient (bypassa RLS).
 * O client-side não consegue inserir/atualizar triagens diretamente por restrições de RLS.
 *
 * Ações:
 *  - "criar"     → insere novo registro de triagem, retorna { id }
 *  - "atualizar" → faz update em triagem existente pelo triagemId
 *  - "pular"     → cria registro com status "pulou_triagem"
 */
export async function POST(req: NextRequest) {
  // Verificar autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const adminSupabase = createAdminClient()

  // Buscar paciente_id pelo usuario_id (admin bypassa RLS)
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
  }

  const body = await req.json()
  const { action, triagemId, dados } = body as {
    action: 'criar' | 'atualizar' | 'pular'
    triagemId?: string
    dados: Record<string, unknown>
  }

  // ── Criar triagem inicial ──────────────────────────────────────────────────
  if (action === 'criar') {
    const { data, error } = await adminSupabase
      .from('triagens')
      .insert({
        paciente_id: paciente.id,
        status: 'em_andamento',
        ...dados,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao criar triagem:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  }

  // ── Pular triagem ──────────────────────────────────────────────────────────
  if (action === 'pular') {
    const { error } = await adminSupabase
      .from('triagens')
      .insert({
        paciente_id: paciente.id,
        status: 'pulou_triagem',
        ...dados,
      })

    if (error) console.error('Erro ao registrar pular triagem:', error)
    return NextResponse.json({ ok: true })
  }

  // ── Atualizar triagem existente ────────────────────────────────────────────
  if (action === 'atualizar' && triagemId) {
    const { error } = await adminSupabase
      .from('triagens')
      .update(dados)
      .eq('id', triagemId)

    if (error) {
      console.error('Erro ao atualizar triagem:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida ou parâmetros faltando' }, { status: 400 })
}
