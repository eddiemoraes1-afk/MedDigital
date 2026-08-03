import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAdmin()
  const db = createAdminClient()
  const { data, error } = await db
    .from('categorias_financeiras')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categorias: data ?? [] })
}
