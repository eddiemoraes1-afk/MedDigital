import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Você é um assistente de triagem médica digital do RovarisMed.
Seu papel é coletar informações sobre os sintomas do paciente de forma empática e organizada,
e ao final classificar o risco e recomendar o tipo de atendimento.

REGRAS IMPORTANTES:
1. Você NÃO faz diagnósticos médicos — apenas triagem e orientação inicial
2. Seja empático, claro e use linguagem acessível (não médica)
3. Faça uma pergunta por vez para não sobrecarregar o paciente
4. Colete: sintoma principal, há quanto tempo, intensidade (1-10), outros sintomas, histórico relevante
5. Após coletar informações suficientes (3-5 trocas), forneça a classificação

CLASSIFICAÇÃO DE RISCO:
- 🟢 VERDE (risco baixo): Sintomas leves, sem urgência — orientação básica ou agendamento
- 🟡 AMARELO (risco moderado): Sintomas que precisam de avaliação médica — atendimento virtual
- 🟠 LARANJA (risco alto): Sintomas que precisam de atenção em horas — atendimento virtual urgente
- 🔴 VERMELHO (urgência): Sintomas graves — atendimento presencial imediato ou SAMU

Quando finalizar a triagem, responda SEMPRE com este JSON no final da sua mensagem:
[TRIAGEM_RESULTADO]
{
  "classificacao": "verde|amarelo|laranja|vermelho",
  "direcionamento": "orientacao|virtual|presencial",
  "resumo": "resumo curto dos sintomas em uma frase"
}
[/TRIAGEM_RESULTADO]`

export async function POST(req: NextRequest) {
  try {
    const { mensagens, finalizar } = await req.json()

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...mensagens,
    ]

    if (finalizar) {
      messages.push({
        role: 'user' as const,
        content: 'Com base no que foi relatado, por favor finalize minha triagem com a classificação de risco e o direcionamento.'
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.3,
      max_tokens: 600,
    })

    const resposta = completion.choices[0].message.content || ''

    // Extrair resultado da triagem se presente
    let resultado = null
    const match = resposta.match(/\[TRIAGEM_RESULTADO\]([\s\S]*?)\[\/TRIAGEM_RESULTADO\]/)
    if (match) {
      try {
        resultado = JSON.parse(match[1].trim())
      } catch {}
    }

    // Limpar o JSON da mensagem para o usuário
    const mensagemLimpa = resposta.replace(/\[TRIAGEM_RESULTADO\][\s\S]*?\[\/TRIAGEM_RESULTADO\]/g, '').trim()

    return NextResponse.json({ resposta: mensagemLimpa, resultado })
  } catch (error: any) {
    console.error('Erro na triagem:', error)
    return NextResponse.json(
      { error: 'Erro ao processar triagem. Tente novamente.' },
      { status: 500 }
    )
  }
}
