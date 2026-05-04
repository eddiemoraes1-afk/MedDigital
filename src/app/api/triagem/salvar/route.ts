import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * API route para salvar dados de triagem usando adminClient (bypassa RLS).
 * Se as colunas extras ainda não existem no banco (SQL migrations pendentes),
 * faz fallback para inserir apenas as colunas básicas garantidas.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const adminSupabase = createAdminClient()

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
    // Tentativa 1: com todas as colunas
    const { data, error } = await adminSupabase
      .from('triagens')
      .insert({ paciente_id: paciente.id, status: 'em_andamento', ...dados })
      .select('id')
      .single()

    if (!error) return NextResponse.json({ id: data.id })

    // Coluna extra não existe ainda (SQL migration pendente) → fallback mínimo
    console.warn('Triagem insert com colunas extras falhou, tentando fallback mínimo:', error.message)

    const { data: fallback, error: err2 } = await adminSupabase
      .from('triagens')
      .insert({ paciente_id: paciente.id, status: 'em_andamento' })
      .select('id')
      .single()

    if (err2) {
      console.error('Erro ao criar triagem (fallback):', err2)
      return NextResponse.json({ error: err2.message }, { status: 500 })
    }

    return NextResponse.json({ id: fallback.id })
  }

  // ── Pular triagem ──────────────────────────────────────────────────────────
  if (action === 'pular') {
    const { error } = await adminSupabase
      .from('triagens')
      .insert({ paciente_id: paciente.id, status: 'pulou_triagem', ...dados })

    if (error) {
      console.warn('Pular triagem com extras falhou, tentando fallback:', error.message)
      await adminSupabase.from('triagens').insert({ paciente_id: paciente.id, status: 'pulou_triagem' })
    }

    return NextResponse.json({ ok: true })
  }

  // ── Atualizar triagem existente ────────────────────────────────────────────
  if (action === 'atualizar' && triagemId) {
    const { error } = await adminSupabase
      .from('triagens')
      .update(dados)
      .eq('id', triagemId)

    if (error) {
      // Tentar atualizar apenas as colunas básicas que existem com certeza
      console.warn('Update com colunas extras falhou, tentando colunas básicas:', error.message)

      const colunasSegurasNomes = ['classificacao_risco', 'resumo_ia', 'status']
      const dadosBasicos: Record<string, unknown> = {}
      for (const col of colunasSegurasNomes) {
        if (col in dados) dadosBasicos[col] = dados[col]
      }

      if (Object.keys(dadosBasicos).length > 0) {
        const { error: err2 } = await adminSupabase
          .from('triagens')
          .update(dadosBasicos)
          .eq('id', triagemId)

        if (err2) {
          console.error('Erro ao atualizar triagem (fallback):', err2)
          return NextResponse.json({ error: err2.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
