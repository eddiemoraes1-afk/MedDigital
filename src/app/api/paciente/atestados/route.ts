import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome, cpf, data_nascimento, sexo')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { data: atestados } = await admin
    .from('atestados')
    .select('id, data_emissao, data_inicio, data_fim, dias, cid, texto_complementar, observacoes, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', paciente.id)
    .order('data_emissao', { ascending: false })

  const hoje = new Date().toISOString().slice(0, 10)

  return NextResponse.json({
    paciente,
    atestados: (atestados ?? []).map((a: any) => ({
      ...a,
      valido: a.data_inicio <= hoje && hoje <= a.data_fim,
    })),
  })
}
