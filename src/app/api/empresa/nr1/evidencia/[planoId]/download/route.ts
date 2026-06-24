import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — gera uma URL assinada (válida 1h) e redireciona para o arquivo
export async function GET(
  _req: Request,
  { params }: { params: { planoId: string } }
) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()

  const { data: plano } = await db
    .from('plano_acao_nr1')
    .select('evidencia_arquivo_url')
    .eq('id', params.planoId)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (!plano?.evidencia_arquivo_url) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 })
  }

  const { data, error } = await db.storage
    .from('nr1-evidencias')
    .createSignedUrl(plano.evidencia_arquivo_url, 3600) // 1 hora

  if (error || !data?.signedUrl) {
    console.error('[nr1/evidencia/download]', error)
    return NextResponse.json({ error: 'Erro ao gerar link de download.' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
