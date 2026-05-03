import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Apenas POST para evitar que o Next.js pré-carregue o link e derrube a sessão
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(new URL('/login', baseUrl), { status: 302 })
}
