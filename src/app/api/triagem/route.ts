import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Você é um assistente de triagem médica do RovarisMed.
Com base nos dados estruturados coletados nas etapas anteriores, classifique o risco do paciente e gere um resumo claro.

CLASSIFICAÇÕES (use exatamente uma dessas strings):
- "verde"   → RISCO BAIXO: Sintomas leves, sem sinais de urgência, pode aguardar atendimento
- "amarelo" → RISCO MODERADO: Sintomas que precisam de avaliação médica, mas sem urgência imediata
- "vermelho"→ RISCO ALTO: Pelo menos um sinal de urgência marcado como SIM, ou sintomas muito graves

REGRAS OBRIGATÓRIAS:
1. Se QUALQUER sinal de urgência estiver marcado como SIM → classifique como "vermelho"
2. Dor intensa (8-10) com múltiplos sintomas → "amarelo" ou "vermelho"
3. Sintomas leves, todos os sinais de urgência como NÃO → "verde"
4. Você NÃO faz diagnóstico — apenas triagem inicial
5. Use linguagem empática, clara e acessível

Responda APENAS com JSON válido, sem texto adicional:
{
  "classificacao": "verde" | "amarelo" | "vermelho",
  "resumo": "Resumo dos sintomas relatados em 2 a 3 frases, de forma empática e humanizada",
  "recomendacao": "Orientação específica e clara sobre o próximo passo para o paciente"
}`

interface DadosSintomas {
  motivosPrincipais: string[]
  outroMotivo: string
  locaisDor: string[]
  outraLocalizacaoDor: string
  intensidadeDor: number | null
  tomouRemedio: boolean | null
  oQueTomou: string
  remedioMelhorou: 'sim' | 'nao' | 'parcial' | null
  remedioContinuo: boolean | null
  remedioContinuoQuais: string
}

interface DadosUrgencia {
  dorNoPeito: boolean | null
  faltaDeAr: boolean | null
  sintomaNeuro: boolean | null
  desmaio: boolean | null
  convulsao: boolean | null
  sangramento: boolean | null
  trauma: boolean | null
  dorExtrema: boolean | null
  gravidez: boolean | null
}

function buildContexto(sintomas: DadosSintomas, urgencia: DadosUrgencia): string {
  const linhas: string[] = ['=== ETAPA 2 — SINTOMAS ===']

  if (sintomas.motivosPrincipais.length > 0) {
    linhas.push(`Motivos principais: ${sintomas.motivosPrincipais.join(', ')}`)
  }
  if (sintomas.outroMotivo) {
    linhas.push(`Outro motivo descrito: ${sintomas.outroMotivo}`)
  }
  if (sintomas.locaisDor.length > 0) {
    linhas.push(`Localização da dor: ${sintomas.locaisDor.join(', ')}`)
  }
  if (sintomas.outraLocalizacaoDor) {
    linhas.push(`Outra localização descrita: ${sintomas.outraLocalizacaoDor}`)
  }
  if (sintomas.intensidadeDor !== null) {
    linhas.push(`Intensidade da dor: ${sintomas.intensidadeDor}/10`)
  }
  if (sintomas.tomouRemedio !== null) {
    linhas.push(`Tomou remédio ou fez algo para melhorar: ${sintomas.tomouRemedio ? 'SIM' : 'NÃO'}`)
  }
  if (sintomas.oQueTomou) {
    linhas.push(`O que tomou / fez: ${sintomas.oQueTomou}`)
  }
  if (sintomas.remedioMelhorou) {
    const label = sintomas.remedioMelhorou === 'sim' ? 'Sim' : sintomas.remedioMelhorou === 'nao' ? 'Não' : 'Parcialmente'
    linhas.push(`Melhorou após o remédio: ${label}`)
  }
  if (sintomas.remedioContinuo !== null) {
    linhas.push(`Usa remédio de uso contínuo: ${sintomas.remedioContinuo ? 'SIM' : 'NÃO'}`)
  }
  if (sintomas.remedioContinuoQuais) {
    linhas.push(`Remédios contínuos: ${sintomas.remedioContinuoQuais}`)
  }

  linhas.push('\n=== ETAPA 3 — SINAIS DE URGÊNCIA ===')

  const sinais: Record<string, string> = {
    dorNoPeito:    'Dor, aperto, pressão ou queimação no peito',
    faltaDeAr:     'Falta de ar intensa ou dificuldade para falar frases completas',
    sintomaNeuro:  'Sintoma neurológico (fraqueza, boca torta, fala enrolada, confusão, perda de visão)',
    desmaio:       'Desmaio ou perda de consciência',
    convulsao:     'Convulsão ou crise semelhante',
    sangramento:   'Sangramento intenso ou que não para',
    trauma:        'Queda, acidente, pancada forte ou suspeita de fratura',
    dorExtrema:    'Dor muito forte, diferente do habitual ou que piorou rapidamente',
    gravidez:      'Gravidez com complicação (dor abdominal, sangramento, pressão alta, etc.)',
  }

  for (const [chave, descricao] of Object.entries(sinais)) {
    const valor = urgencia[chave as keyof DadosUrgencia]
    if (valor !== null) {
      linhas.push(`${descricao}: ${valor ? '⚠️ SIM' : 'não'}`)
    }
  }

  return linhas.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const { sintomas, urgencia } = await req.json()

    if (!sintomas || !urgencia) {
      return NextResponse.json({ error: 'Dados insuficientes para análise' }, { status: 400 })
    }

    const contexto = buildContexto(sintomas, urgencia)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analise os dados de triagem abaixo e retorne o JSON de classificação:\n\n${contexto}` },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0].message.content || '{}'
    let resultado: { classificacao: string; resumo: string; recomendacao: string }

    try {
      resultado = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Erro ao interpretar resposta da IA' }, { status: 500 })
    }

    // Garantir classificação válida
    if (!['verde', 'amarelo', 'vermelho'].includes(resultado.classificacao)) {
      // Fallback: se algum sinal de urgência for true → vermelho, senão amarelo
      const temUrgencia = Object.values(urgencia).some(v => v === true)
      resultado.classificacao = temUrgencia ? 'vermelho' : 'amarelo'
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro na triagem:', error)
    return NextResponse.json(
      { error: 'Erro ao processar triagem. Tente novamente.' },
      { status: 500 }
    )
  }
}
