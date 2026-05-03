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

// Normaliza cabeçalhos sem depender de regex Unicode (mais robusto no Node)
function normalizar(s: string): string {
  const mapa: Record<string, string> = {
    à:'a',á:'a',â:'a',ã:'a',ä:'a',å:'a',
    è:'e',é:'e',ê:'e',ë:'e',
    ì:'i',í:'i',î:'i',ï:'i',
    ò:'o',ó:'o',ô:'o',õ:'o',ö:'o',
    ù:'u',ú:'u',û:'u',ü:'u',
    ç:'c',ñ:'n',
  }
  return s
    .replace(/[*]/g, '')
    .toLowerCase()
    .split('').map(c => mapa[c] ?? c).join('')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim()
}

// Colunas conhecidas para identificar a linha de cabeçalho
const COLUNAS_VALIDAS = ['nome_completo', 'nome', 'cpf', 'email', 'cargo']

function encontrarHeaderRow(raw: any[][]): number {
  return raw.findIndex(row => {
    const normed = (row as any[]).map(c => normalizar(String(c ?? '')))
    return COLUNAS_VALIDAS.some(col => normed.includes(col))
  })
}

// Parse CSV simples
function parseCSV(texto: string): Record<string, string>[] {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim())
  if (linhas.length < 2) return []

  const headerIdx = linhas.findIndex(l => {
    const cols = l.split(',').map(h => normalizar(h.replace(/"/g, '')))
    return COLUNAS_VALIDAS.some(c => cols.includes(c))
  })
  if (headerIdx === -1) return []

  const headers = linhas[headerIdx].split(',').map(h => normalizar(h.replace(/"/g, '')))
  return linhas.slice(headerIdx + 1)
    .filter(l => l.trim())
    .map(linha => {
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
  const sheetName = formData.get('sheet_name') as string | null
  const sheetIndexRaw = formData.get('sheet_index') as string | null
  const sheetIndex = sheetIndexRaw !== null ? parseInt(sheetIndexRaw, 10) : null

  if (!arquivo || !empresaId) {
    return NextResponse.json({ error: 'Arquivo e empresa_id são obrigatórios' }, { status: 400 })
  }

  const nome = arquivo.name.toLowerCase()
  let registros: Record<string, string>[] = []

  if (nome.endsWith('.csv')) {
    const texto = await arquivo.text()
    registros = parseCSV(texto)
  } else if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) {
    try {
      // @ts-ignore
      const xlsx = await import('xlsx')
      const buffer = await arquivo.arrayBuffer()
      const wb = xlsx.read(buffer, { type: 'array' })

      // Usar índice enviado pelo cliente (mais confiável que nome com emoji)
      // Fallback: tentar pelo nome, depois pegar a última aba (geralmente a de dados)
      let targetSheet: string
      if (sheetIndex !== null && sheetIndex >= 0 && sheetIndex < wb.SheetNames.length) {
        targetSheet = wb.SheetNames[sheetIndex]
      } else if (sheetName && wb.SheetNames.includes(sheetName)) {
        targetSheet = sheetName
      } else {
        targetSheet = wb.SheetNames[wb.SheetNames.length - 1]
      }

      const ws = wb.Sheets[targetSheet]
      const raw: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 })

      if (raw.length < 1) {
        return NextResponse.json({ error: 'Aba selecionada está vazia' }, { status: 400 })
      }

      // Encontrar a linha de cabeçalho (ignora linhas de título decorativas)
      const headerRowIndex = encontrarHeaderRow(raw)
      if (headerRowIndex === -1) {
        return NextResponse.json({
          error: `Cabeçalho não encontrado na aba "${targetSheet}". Verifique se há colunas como nome_completo, cpf, email.`
        }, { status: 400 })
      }

      const headers = (raw[headerRowIndex] as any[]).map(h => normalizar(String(h ?? '')))
      registros = raw.slice(headerRowIndex + 1)
        .filter((row: any[]) => row.some(c => c !== '' && c != null))
        .map((row: any[]) => {
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim() })
          return obj
        })
    } catch (err) {
      return NextResponse.json({
        error: 'Erro ao ler o arquivo xlsx. Verifique se o pacote está instalado: npm install xlsx'
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

    const { data: existente } = await adminSupabase
      .from('vinculos_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('cpf', cpf || '__sem_cpf__')
      .single()

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
