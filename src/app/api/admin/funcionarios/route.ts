import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis_sistema')
    .select('role')
    .eq('usuario_id', user.id)
    .single()
  if (perfil?.role !== 'admin') return null
  return user
}

// PATCH — inativar/reativar um ou mais funcionários
// Body: { ids: string[], ativo: boolean }
export async function PATCH(request: NextRequest) {
  const user = await verificarAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const ids: string[] = body.ids ?? []
  const ativo: boolean = body.ativo ?? false

  if (!ids.length) {
    return NextResponse.json({ error: 'Nenhum ID informado' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('vinculos_empresa')
    .update({ ativo })
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, atualizados: ids.length })
}

// DELETE — excluir um ou mais funcionários
// Body: { ids: string[] }
export async function DELETE(request: NextRequest) {
  const user = await verificarAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const ids: string[] = body.ids ?? []

  if (!ids.length) {
    return NextResponse.json({ error: 'Nenhum ID informado' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('vinculos_empresa')
    .delete()
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, excluidos: ids.length })
}
