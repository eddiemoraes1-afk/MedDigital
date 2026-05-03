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

// Normaliza cabeçalhos: remove acentos, lowercase, underscores
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .trim()
}

// Parse CSV simples (sem biblioteca)
function parseCSV(texto: string): Record<string, string>[] {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim())
  if (linhas.length < 2) return []
  const headers = linhas[0].split(',').map(h => normalizar(h.replace(/"/g, '')))
  return linhas.slice(1).map(linha => {
    const valores = linha.split(',').map(v => v.replace(/^"|"$/g, '').trim())
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = valores[i] ?? '' })
    return obj
  })
}

export async function POST(request: NextRequest) {
  const user = await verificarAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  const empresaId = formData.get('empresa_id') as string

  if (!arquivo || !empresaId) {
    return NextResponse.json({ error: 'Arquivo e empresa_id são obrigatórios' }, { status: 400 })
  }

  const nome = arquivo.name.toLowerCase()
  let registros: Record<string, string>[] = []

  if (nome.endsWith('.csv')) {
    const texto = await arquivo.text()
    registros = parseCSV(texto)
  } else if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) {
    // XLSX parsing — requer "npm install xlsx"
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — instale: npm install xlsx
      const xlsx = await import('xlsx')
      const buffer = await arquivo.arrayBuffer()
      const wb = xlsx.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 })
      if (raw.length < 2) return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 })
      const headers = (raw[0] as string[]).map(h => normalizar(String(h ?? '')))
      registros = raw.slice(1)
        .filter((row: any[]) => row.some(c => c !== '' && c != null))
        .map((row: any[]) => {
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim() })
          return obj
        })
    } catch {
      return NextResponse.json({
        error: 'Para importar .xlsx, instale o pacote: npm install xlsx'
      }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'Formato não suportado. Use .csv ou .xlsx' }, { status: 400 })
  }

  if (registros.length === 0) {
    return NextResponse.json({ error: 'Nenhum registro encontrado no arquivo' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  let importados = 0
  let atualizados = 0
  const erros: string[] = []

  for (const reg of registros) {
    const nome_completo = reg['nome_completo'] || reg['nome'] || ''
    const cpf = reg['cpf']?.replace(/\D/g, '') || ''

    if (!nome_completo.trim()) {
      erros.push(`Linha ignorada: nome_completo vazio`)
      continue
    }

    // Verificar se já existe vínculo com este CPF nesta empresa
    const { data: existente } = await adminSupabase
      .from('vinculos_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('cpf', cpf || '__sem_cpf__')
      .single()

    // Verificar se há paciente com este CPF (para vincular automaticamente)
    let pacienteId: string | null = null
    if (cpf) {
      const { data: paciente } = await adminSupabase
        .from('pacientes')
        .select('id')
        .eq('cpf', cpf)
        .single()
      pacienteId = paciente?.id ?? null
    }

    const dadosVinculo = {
      empresa_id: empresaId,
      cpf: cpf || null,
      nome_completo: nome_completo.trim(),
      email: reg['email']?.trim() || null,
      registro_funcional: reg['registro_funcional']?.trim() || null,
      cargo: reg['cargo']?.trim() || null,
      departamento: reg['departamento']?.trim() || null,
      data_admissao: reg['data_admissao']?.trim() || null,
      ativo: true,
      paciente_id: pacienteId,
    }

    if (existente) {
      await adminSupabase.from('vinculos_empresa').update(dadosVinculo).eq('id', existente.id)
      atualizados++
    } else {
      const { error } = await adminSupabase.from('vinculos_empresa').insert(dadosVinculo)
      if (error) {
        erros.push(`${nome_completo}: ${error.message}`)
      } else {
        importados++
      }
    }
  }

  return NextResponse.json({ importados, atualizados, erros })
}
