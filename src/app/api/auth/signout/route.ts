import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(new URL('/login', baseUrl), { status: 302 })
}

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(new URL('/login', baseUrl), { status: 302 })
}
