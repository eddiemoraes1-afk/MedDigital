import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Prompt do Protocolo de Manchester ───────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente de triagem médica do RovarisMed que aplica o Protocolo de Manchester de Classificação de Risco (MTS — Manchester Triage System).

Com base nos dados estruturados das etapas de triagem, classifique o paciente em um dos 5 níveis do Protocolo de Manchester e gere um resumo claro e empático.

═══ NÍVEIS DO PROTOCOLO DE MANCHESTER ═══

🔴 VERMELHO — Emergência (atendimento imediato, 0 min)
Risco IMEDIATO à vida. NÃO pode ser atendido por telemedicina.
Critérios: convulsão ativa; parada cardíaca suspeita; obstrução grave de via aérea; dor no peito + falta de ar intensa SIMULTANEAMENTE; dor no peito + sintoma neurológico (AVC suspeito); falta de ar intensa + sintoma neurológico; sangramento incontrolável maciço; múltiplos sinais críticos de urgência simultâneos.

🟠 LARANJA — Muito Urgente (atende em até 10 min)
Risco muito elevado, precisa de avaliação médica muito rápida.
Critérios: dor no peito isolada; falta de ar intensa isolada; sintoma neurológico isolado (fraqueza unilateral, fala enrolada, boca torta, confusão súbita); desmaio recente; sangramento intenso controlado ou parcialmente controlado; trauma significativo; gravidez com complicação (dor abdominal, sangramento, pressão alta, redução dos movimentos); dor extrema (8-10/10) com ao menos 1 sinal de urgência presente; febre muito alta com prostração grave.

🟡 AMARELO — Urgente (atende em até 60 min)
Avaliação médica necessária, mas sem risco imediato.
Critérios: dor moderada a intensa (5-7/10) sem sinais de urgência críticos; febre moderada com sintomas; vômitos repetidos ou diarreia com desidratação; sintomas respiratórios moderados (tosse intensa, dificuldade leve para respirar); sangramento leve que já cessou; trauma leve (entorse, contusão sem deformidade); dor de cabeça moderada sem sintomas neurológicos; dor abdominal moderada.

🟢 VERDE — Pouco Urgente (atende em até 120 min)
Condição não urgente, pode aguardar.
Critérios: dor leve (1-4/10) sem sinais de urgência; febre baixa sem prostração; resfriado, tosse leve, congestão nasal; sintomas gastrointestinais leves; queixas dermatológicas menores; melhora após medicação; problema crônico estável com queixa leve nova.

🔵 AZUL — Não Urgente (atende em até 240 min)
Sem urgência. Condição pode aguardar consulta agendada.
Critérios: sintomas crônicos estáveis de longa data sem piora; queixas muito leves sem impacto funcional; acompanhamento de condições crônicas (renovação de receita, check-up); sintomas leves que já melhoraram espontaneamente; condições administrativas (atestado, encaminhamento).

═══ REGRAS DE CLASSIFICAÇÃO ═══

1. Se QUALQUER combinação crítica estiver presente (dor no peito + falta de ar; dor no peito + neurológico; convulsão) → VERMELHO
2. Se UM sinal de urgência isolado estiver presente → mínimo LARANJA (ajuste para VERMELHO se combinação crítica)
3. Dor intensa (8-10/10) com ao menos 1 urgência → LARANJA
4. Dor intensa (8-10/10) SEM urgências → AMARELO
5. Se NENHUM sinal de urgência e dor leve ou ausente → VERDE ou AZUL
6. Sintomas crônicos estáveis sem piora aguda → AZUL
7. Você NÃO faz diagnóstico — apenas triagem e direcionamento
8. Use linguagem empática, clara e acessível ao paciente
9. Para VERMELHO: o resumo deve transmitir urgência real e instruir a buscar emergência presencial IMEDIATAMENTE
10. Para AZUL: o resumo deve ser tranquilizador e orientar agendamento de consulta de rotina

═══ FORMATO DA RESPOSTA ═══

Responda APENAS com JSON válido, sem texto adicional:
{
  "classificacao": "vermelho" | "laranja" | "amarelo" | "verde" | "azul",
  "resumo": "Resumo empático dos sintomas em 2 a 3 frases, adequado ao nível de urgência",
  "recomendacao": "Orientação específica e clara sobre o próximo passo — para vermelho: instrução de emergência; para os demais: caminho de atendimento"
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

  linhas.push('\n=== ETAPA 3 — SINAIS DE URGÊNCIA (Protocolo de Manchester) ===')

  const sinais: Record<string, string> = {
    dorNoPeito:   'Dor no peito / aperto / pressão',
    faltaDeAr:    'Falta de ar intensa',
    sintomaNeuro: 'Sintoma neurológico (fraqueza, fala enrolada, boca torta, confusão)',
    desmaio:      'Desmaio / perda de consciência',
    convulsao:    'Convulsão',
    sangramento:  'Sangramento intenso',
    trauma:       'Trauma / acidente / queda',
    dorExtrema:   'Dor extrema diferente do habitual',
    gravidez:     'Gravidez com complicação',
  }

  for (const [chave, descricao] of Object.entries(sinais)) {
    const valor = urgencia[chave as keyof DadosUrgencia]
    if (valor !== null) linhas.push(`${descricao}: ${valor ? '⚠️ SIM' : 'não'}`)
  }

  // Resumo de combinações críticas para facilitar classificação
  const urgentes = Object.entries(urgencia).filter(([, v]) => v === true).length
  if (urgentes > 0) linhas.push(`\nTotal de sinais de urgência: ${urgentes}`)

  const combinacoesCriticas: string[] = []
  if (urgencia.dorNoPeito && urgencia.faltaDeAr)    combinacoesCriticas.push('Dor no peito + Falta de ar (IAM/TEP suspeito)')
  if (urgencia.dorNoPeito && urgencia.sintomaNeuro)  combinacoesCriticas.push('Dor no peito + Sintoma neurológico')
  if (urgencia.faltaDeAr  && urgencia.sintomaNeuro)  combinacoesCriticas.push('Falta de ar + Sintoma neurológico')
  if (urgencia.convulsao)                            combinacoesCriticas.push('Convulsão presente')
  if (combinacoesCriticas.length > 0)
    linhas.push(`🚨 COMBINAÇÕES CRÍTICAS IDENTIFICADAS: ${combinacoesCriticas.join('; ')}`)

  return linhas.join('\n')
}

const CLASSIFICACOES_VALIDAS = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'] as const
type ClassificacaoManchester = typeof CLASSIFICACOES_VALIDAS[number]

function fallbackManchester(urgencia: DadosUrgencia, sintomas: DadosSintomas): ClassificacaoManchester {
  const critico = (urgencia.dorNoPeito && urgencia.faltaDeAr) ||
                  (urgencia.dorNoPeito && urgencia.sintomaNeuro) ||
                  (urgencia.faltaDeAr  && urgencia.sintomaNeuro) ||
                  urgencia.convulsao
  if (critico) return 'vermelho'

  const sinalIsolado = Object.values(urgencia).some(v => v === true)
  if (sinalIsolado) return 'laranja'

  if ((sintomas.intensidadeDor ?? 0) >= 5) return 'amarelo'
  if ((sintomas.intensidadeDor ?? 0) >= 1) return 'verde'
  return 'azul'
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

    // ── Chamar IA com Protocolo de Manchester ──────────────────────────────────
    const contexto = buildContexto(sintomas, urgencia)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Aplique o Protocolo de Manchester aos dados de triagem abaixo:\n\n${contexto}` },
      ],
      temperature: 0.1,   // baixo para maior consistência clínica
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0].message.content || '{}'
    let resultado: { classificacao: string; resumo: string; recomendacao: string }

    try {
      resultado = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Erro ao interpretar resposta da IA' }, { status: 500 })
    }

    // Garantir classificação válida — fallback determinístico se IA retornar valor inválido
    if (!CLASSIFICACOES_VALIDAS.includes(resultado.classificacao as ClassificacaoManchester)) {
      resultado.classificacao = fallbackManchester(urgencia, sintomas)
    }

    // ── Salvar no banco via adminClient (ignora RLS) ───────────────────────────
    try {
      const adminSupabase = createAdminClient()

      const dadosConcluidos: Record<string, unknown> = {
        classificacao_risco: resultado.classificacao,
        direcionamento: 'virtual',
        resumo_ia: resultado.resumo,
        recomendacao_ia: resultado.recomendacao,
        status: 'concluida',
        dados_sintomas: sintomas,
        dados_urgencia: urgencia,
        ...(dadosValidacao && {
          consentimento_lgpd:  true,
          consentimento_em:    dadosValidacao.consentimentoEm ?? new Date().toISOString(),
          cpf_confirmado:      dadosValidacao.cpf ?? null,
          telefone_contato:    dadosValidacao.telefone ?? null,
        }),
      }

      const dadosBasicos: Record<string, unknown> = {
        classificacao_risco: resultado.classificacao,
        direcionamento:      'virtual',
        resumo_ia:           resultado.resumo,
        recomendacao_ia:     resultado.recomendacao,
        status:              'concluida',
      }

      if (triagemIdEntrada) {
        const { error: errUpdate } = await adminSupabase
          .from('triagens')
          .update(dadosConcluidos)
          .eq('id', triagemIdEntrada)

        if (errUpdate) {
          console.warn('Update completo falhou, tentando básico:', errUpdate.message)
          await adminSupabase
            .from('triagens')
            .update(dadosBasicos)
            .eq('id', triagemIdEntrada)
        }
      } else {
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
      console.error('Erro ao salvar triagem no banco:', dbErr)
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro na triagem:', error)
    return NextResponse.json({ error: 'Erro ao processar triagem.' }, { status: 500 })
  }
}
