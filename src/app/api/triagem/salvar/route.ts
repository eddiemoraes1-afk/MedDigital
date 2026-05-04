import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * API route para salvar dados de triagem usando adminClient (bypassa RLS).
 *
 * SCHEMA triagens (campos obrigatórios):
 *  - paciente_id UUID NOT NULL
 *  - classificacao_risco TEXT NOT NULL CHECK ('verde','amarelo','laranja','vermelho')
 *  - direcionamento TEXT NOT NULL CHECK ('virtual','presencial','orientacao')
 *  - status TEXT NOT NULL CHECK ('em_andamento','concluida','pulou_triagem')
 *
 * Para triagem "em_andamento" usamos valores-padrão até a IA classificar.
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
    // classificacao_risco e direcionamento são NOT NULL no schema original.
    // Usamos 'amarelo' e 'virtual' como placeholder até a IA classificar.
    const base = {
      paciente_id: paciente.id,
      status: 'em_andamento',
      classificacao_risco: 'amarelo',   // placeholder — atualizado pela IA
      direcionamento: 'virtual',         // padrão telemedicina
    }

    const { data, error } = await adminSupabase
      .from('triagens')
      .insert({ ...base, ...dados })
      .select('id')
      .single()

    if (!error) return NextResponse.json({ id: data.id })

    // Falhou com colunas extras → tenta só as colunas básicas garantidas
    console.warn('Insert com extras falhou:', error.message)
    const { data: fallback, error: err2 } = await adminSupabase
      .from('triagens')
      .insert(base)
      .select('id')
      .single()

    if (err2) {
      console.error('Erro ao criar triagem (fallback):', err2.message)
      return NextResponse.json({ error: err2.message }, { status: 500 })
    }

    return NextResponse.json({ id: fallback.id })
  }

  // ── Pular triagem ──────────────────────────────────────────────────────────
  if (action === 'pular') {
    // 'pulou_triagem' não existe no CHECK original → usamos 'concluida'
    // (o schema precisa ser atualizado para incluir 'pulou_triagem')
    const base = {
      paciente_id: paciente.id,
      status: 'concluida',
      classificacao_risco: 'amarelo',
      direcionamento: 'virtual',
    }

    const { error } = await adminSupabase
      .from('triagens')
      .insert({ ...base, ...dados })

    if (error) {
      console.warn('Pular triagem com extras falhou:', error.message)
      await adminSupabase.from('triagens').insert(base)
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
      console.warn('Update completo falhou, tentando colunas básicas:', error.message)

      // Tenta atualizar apenas colunas que definitivamente existem
      const seguros = ['classificacao_risco', 'direcionamento', 'resumo_ia', 'status']
      const dadosBasicos: Record<string, unknown> = {}
      for (const col of seguros) {
        if (col in dados) dadosBasicos[col] = dados[col]
      }

      if (Object.keys(dadosBasicos).length > 0) {
        const { error: err2 } = await adminSupabase
          .from('triagens')
          .update(dadosBasicos)
          .eq('id', triagemId)

        if (err2) {
          console.error('Erro ao atualizar triagem (fallback):', err2.message)
          return NextResponse.json({ error: err2.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
