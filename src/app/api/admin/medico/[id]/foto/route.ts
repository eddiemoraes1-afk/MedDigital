import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params
  const admin = createAdminClient()

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

  const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!tiposPermitidos.includes(arquivo.type))
    return NextResponse.json({ error: 'Use PNG, JPG ou WEBP.' }, { status: 400 })

  if (arquivo.size > 3 * 1024 * 1024)
    return NextResponse.json({ error: 'Máximo 3 MB.' }, { status: 400 })

  const ext = arquivo.name.split('.').pop() || 'jpg'
  const path = `medicos/${id}/${Date.now()}.${ext}`

  const buffer = await arquivo.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('logos')
    .upload(path, buffer, { contentType: arquivo.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('logos').getPublicUrl(path)

  const { error: dbError } = await admin
    .from('medicos')
    .update({ foto_url: publicUrl })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true, foto_url: publicUrl })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin()
  const { id } = await params
  const admin = createAdminClient()
  await admin.from('medicos').update({ foto_url: null }).eq('id', id)
  return NextResponse.json({ ok: true })
}
