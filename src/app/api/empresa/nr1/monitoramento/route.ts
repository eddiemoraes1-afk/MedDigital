import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()
  const body = await req.json()

  const { tipo, data_registro, observacoes } = body

  if (!tipo) {
    return NextResponse.json({ error: 'Tipo é obrigatório.' }, { status: 400 })
  }

  const validos = ['revisao_periodica', 'incidente', 'reavaliacao']
  if (!validos.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
  }

  const { error } = await db.from('monitoramento_nr1').insert({
    empresa_id: empresaId,
    tipo,
    data_registro: data_registro || new Date().toISOString().slice(0, 10),
    observacoes: observacoes || null,
    criado_por: perfil.usuarioId,
  })

  if (error) {
    console.error('[nr1/monitoramento] erro:', error)
    return NextResponse.json({ error: 'Erro ao registrar monitoramento.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
