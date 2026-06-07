import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Textos legais exatos de cada tipo de consentimento.
 * Versionados por data — alterar aqui cria nova versão automaticamente.
 */
export const TEXTOS_CONSENTIMENTO = {
  lgpd_geral: {
    versao: '2026-06-07',
    texto: 'Li e aceito a Política de Privacidade da RovarisMed. Autorizo o tratamento dos meus dados pessoais de saúde pela RovarisMed e pelos profissionais de saúde vinculados, exclusivamente para fins de prestação de serviços médicos, conforme a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018) e nos termos do art. 11, II, "a" (proteção da vida ou da incolumidade física do titular).',
  },
  telemedicina: {
    versao: '2026-06-07',
    texto: 'Concordo em realizar o atendimento médico por telemedicina. Estou ciente de que a teleconsulta é regulamentada pela Resolução CFM nº 2.314/2022 e que terei as mesmas garantias de sigilo médico e qualidade assistencial de uma consulta presencial. Sei que posso interromper o atendimento a qualquer momento.',
  },
  video_voz: {
    versao: '2026-06-07',
    texto: 'Autorizo a transmissão e o processamento do meu vídeo e voz durante a teleconsulta para viabilizar o atendimento médico remoto. Declaro estar ciente de que a sessão não é gravada pela plataforma sem meu consentimento expresso adicional.',
  },
} as const

/**
 * POST /api/paciente/consentimentos
 * Salva os consentimentos do paciente ao iniciar a triagem.
 * Body: { triagem_id?: string, tipos: ('lgpd_geral' | 'telemedicina' | 'video_voz')[] }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { triagem_id, tipos } = await req.json() as {
    triagem_id?: string
    tipos: ('lgpd_geral' | 'telemedicina' | 'video_voz')[]
  }

  if (!tipos?.length) {
    return NextResponse.json({ error: 'tipos obrigatório' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: paciente } = await admin
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const registros = tipos.map(tipo => ({
    paciente_id: paciente.id,
    tipo,
    aceito: true,
    versao_termo: TEXTOS_CONSENTIMENTO[tipo].versao,
    texto_termo:  TEXTOS_CONSENTIMENTO[tipo].texto,
    triagem_id:   triagem_id ?? null,
  }))

  const { error } = await admin.from('consentimentos').insert(registros)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, registros: registros.length })
}
