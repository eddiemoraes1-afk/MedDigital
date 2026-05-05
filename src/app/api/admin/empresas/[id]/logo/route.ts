import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar autenticação
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const adminSupabase = createAdminClient()

    // Verificar se é admin
    const { data: perfil } = await adminSupabase
      .from('perfis_sistema')
      .select('role')
      .eq('usuario_id', user.id)
      .single()

    if (perfil?.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Ler FormData
    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File | null
    const corPrimaria = formData.get('cor_primaria') as string | null

    if (!arquivo) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    }

    // Validar tipo
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!tiposPermitidos.includes(arquivo.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use PNG, JPG, SVG ou WEBP.' }, { status: 400 })
    }

    // Validar tamanho (máx 2MB)
    if (arquivo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 })
    }

    // Nome único para o arquivo
    const ext = arquivo.name.split('.').pop() || 'png'
    const nomeArquivo = `empresas/${id}/${Date.now()}.${ext}`

    // Upload para Supabase Storage
    const buffer = await arquivo.arrayBuffer()
    const { error: uploadError } = await adminSupabase.storage
      .from('logos')
      .upload(nomeArquivo, buffer, {
        contentType: arquivo.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return NextResponse.json({ error: 'Falha no upload da imagem' }, { status: 500 })
    }

    // Gerar URL pública
    const { data: { publicUrl } } = adminSupabase.storage
      .from('logos')
      .getPublicUrl(nomeArquivo)

    // Salvar URL e cor na tabela empresas
    const update: Record<string, string> = { logo_url: publicUrl }
    if (corPrimaria && /^#[0-9A-Fa-f]{6}$/.test(corPrimaria)) {
      update.cor_primaria = corPrimaria
    }

    const { error: dbError } = await adminSupabase
      .from('empresas')
      .update(update)
      .eq('id', id)

    if (dbError) {
      console.error('Erro ao salvar no banco:', dbError)
      return NextResponse.json({ error: 'Upload feito mas falha ao salvar no banco' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, logo_url: publicUrl, cor_primaria: corPrimaria })
  } catch (err) {
    console.error('Erro no upload de logo:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** Remove a logo da empresa */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const adminSupabase = createAdminClient()

    await adminSupabase
      .from('empresas')
      .update({ logo_url: null, cor_primaria: null })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
