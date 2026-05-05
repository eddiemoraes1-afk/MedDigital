import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Você é um assistente de triagem médica do RovarisMed.
Com base nos dados estruturados coletados nas etapas anteriores, classifique o risco do paciente e gere um resumo claro.

CLASSIFICAÇÕES (use exatamente uma dessas strings):
- "verde"    → RISCO BAIXO: Sintomas leves, sem sinais de urgência, pode aguardar atendimento
- "amarelo"  → RISCO MODERADO: Sintomas que precisam de avaliação médica, mas sem urgência imediata
- "vermelho" → RISCO ALTO: Pelo menos um sinal de urgência marcado como SIM, ou sintomas muito graves

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

  if (sintomas.motivosPrincipais.length > 0)
    linhas.push(`Motivos principais: ${sintomas.motivosPrincipais.join(', ')}`)
  if (sintomas.outroMotivo)
    linhas.push(`Outro motivo: ${sintomas.outroMotivo}`)
  if (sintomas.locaisDor.length > 0)
    linhas.push(`Localização da dor: ${sintomas.locaisDor.join(', ')}`)
  if (sintomas.outraLocalizacaoDor)
    linhas.push(`Outra localização: ${sintomas.outraLocalizacaoDor}`)
  if (sintomas.intensidadeDor !== null)
    linhas.push(`Intensidade da dor: ${sintomas.intensidadeDor}/10`)
  if (sintomas.tomouRemedio !== null)
    linhas.push(`Tomou remédio: ${sintomas.tomouRemedio ? 'SIM' : 'NÃO'}`)
  if (sintomas.oQueTomou)
    linhas.push(`O que tomou: ${sintomas.oQueTomou}`)
  if (sintomas.remedioMelhorou)
    linhas.push(`Melhorou: ${sintomas.remedioMelhorou}`)
  if (sintomas.remedioContinuo !== null)
    linhas.push(`Remédio contínuo: ${sintomas.remedioContinuo ? 'SIM' : 'NÃO'}`)
  if (sintomas.remedioContinuoQuais)
    linhas.push(`Remédios contínuos: ${sintomas.remedioContinuoQuais}`)

  linhas.push('\n=== ETAPA 3 — SINAIS DE URGÊNCIA ===')

  const sinais: Record<string, string> = {
    dorNoPeito:    'Dor no peito',
    faltaDeAr:     'Falta de ar intensa',
    sintomaNeuro:  'Sintoma neurológico',
    desmaio:       'Desmaio',
    convulsao:     'Convulsão',
    sangramento:   'Sangramento intenso',
    trauma:        'Trauma / acidente',
    dorExtrema:    'Dor extrema',
    gravidez:      'Gravidez com complicação',
  }

  for (const [chave, descricao] of Object.entries(sinais)) {
    const valor = urgencia[chave as keyof DadosUrgencia]
    if (valor !== null) linhas.push(`${descricao}: ${valor ? '⚠️ SIM' : 'não'}`)
  }

  return linhas.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sintomas, urgencia, triagemId: triagemIdEntrada, dadosValidacao } = body as {
      sintomas: DadosSintomas
      urgencia: DadosUrgencia
      triagemId?: string | null
      dadosValidacao?: { cpf?: string; telefone?: string; consentimentoEm?: string } | null
    }

    if (!sintomas || !urgencia) {
      return NextResponse.json({ error: 'Dados insuficientes para análise' }, { status: 400 })
    }

    // ── Chamar IA ──────────────────────────────────────────────────────────────
    const contexto = buildContexto(sintomas, urgencia)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analise os dados de triagem abaixo:\n\n${contexto}` },
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
      const temUrgencia = Object.values(urgencia).some(v => v === true)
      resultado.classificacao = temUrgencia ? 'vermelho' : 'amarelo'
    }

    // ── Salvar no banco via adminClient (ignora RLS) ───────────────────────────
    try {
      const adminSupabase = createAdminClient()

      // direcionamento: campo obrigatório no schema original
      const direcionamento = 'virtual'

      const dadosConcluidos: Record<string, unknown> = {
        classificacao_risco: resultado.classificacao,
        direcionamento,
        resumo_ia: resultado.resumo,
        recomendacao_ia: resultado.recomendacao,
        status: 'concluida',
        dados_sintomas: sintomas,
        dados_urgencia: urgencia,
        ...(dadosValidacao && {
          consentimento_lgpd: true,
          consentimento_em: dadosValidacao.consentimentoEm ?? new Date().toISOString(),
          cpf_confirmado: dadosValidacao.cpf ?? null,
          telefone_contato: dadosValidacao.telefone ?? null,
        }),
      }

      const dadosBasicos: Record<string, unknown> = {
        classificacao_risco: resultado.classificacao,
        direcionamento,
        resumo_ia: resultado.resumo,
        status: 'concluida',
      }

      if (triagemIdEntrada) {
        // ── Caminho 1: já temos o ID — apenas atualizar ──────────────────────
        const { error: errUpdate } = await adminSupabase
          .from('triagens')
          .update(dadosConcluidos)
          .eq('id', triagemIdEntrada)

        if (errUpdate) {
          // Fallback: colunas extras não existem ainda — atualizar só as básicas
          console.warn('Update completo falhou, tentando básico:', errUpdate.message)
          await adminSupabase
            .from('triagens')
            .update(dadosBasicos)
            .eq('id', triagemIdEntrada)
        }
      } else {
        // ── Caminho 2: sem ID — inserir novo registro ─────────────────────────
        // Precisamos do paciente_id via autenticação
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: paciente } = await adminSupabase
            .from('pacientes')
            .select('id')
            .eq('usuario_id', user.id)
            .single()

          if (paciente) {
            const { error: errInsert } = await adminSupabase
              .from('triagens')
              .insert({ paciente_id: paciente.id, ...dadosConcluidos })

            if (errInsert) {
              console.warn('Insert completo falhou, tentando básico:', errInsert.message)
              await adminSupabase
                .from('triagens')
                .insert({ paciente_id: paciente.id, ...dadosBasicos })
            }
          }
        }
      }
    } catch (dbErr) {
      // Erro no banco não deve bloquear a resposta ao paciente
      console.error('Erro ao salvar triagem no banco:', dbErr)
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro na triagem:', error)
    return NextResponse.json({ error: 'Erro ao processar triagem.' }, { status: 500 })
  }
}
