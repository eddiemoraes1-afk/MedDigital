import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const file    = formData.get('file') as File | null
  const planoId = formData.get('plano_id') as string | null

  if (!file || !planoId) {
    return NextResponse.json({ error: 'Arquivo e plano_id são obrigatórios.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo não permitido. Use PDF, JPG ou PNG.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 400 })
  }

  // Confirmar que o plano pertence à empresa
  const { data: plano } = await db
    .from('plano_acao_nr1')
    .select('id')
    .eq('id', planoId)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (!plano) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 })
  }

  const ext = file.type === 'application/pdf' ? 'pdf'
    : file.type === 'image/png' ? 'png' : 'jpg'

  // Caminho: empresaId/planoId/evidencia.ext  (sobrescreve se reenviado)
  const storagePath = `${empresaId}/${planoId}/evidencia.${ext}`

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await db.storage
    .from('nr1-evidencias')
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[nr1/evidencia/upload]', uploadError)
    return NextResponse.json({ error: 'Erro ao enviar arquivo.' }, { status: 500 })
  }

  // Salvar o path no banco (não a URL — a URL é gerada sob demanda)
  const { error: dbError } = await db
    .from('plano_acao_nr1')
    .update({ evidencia_arquivo_url: storagePath })
    .eq('id', planoId)
    .eq('empresa_id', empresaId)

  if (dbError) {
    console.error('[nr1/evidencia/upload db]', dbError)
    return NextResponse.json({ error: 'Arquivo salvo mas erro ao registrar no banco.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
