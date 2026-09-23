/**
 * Integração com o Asaas.
 *
 * Princípios de projeto (pensados para a troca de conta em poucas semanas):
 *   1. Nada aqui depende da conta ser a da Rovaris Med. Trocar de conta é
 *      trocar variáveis de ambiente — nenhuma linha de código muda.
 *   2. Nunca tocamos em número de cartão. Cartão vai para a fatura hospedada
 *      no Asaas, o que mantém o sistema fora do escopo de PCI.
 *   3. Travas de segurança antes de qualquer cobrança ser criada.
 */

// ─── Configuração ─────────────────────────────────────────────────────────────

export const ASAAS_BASE = (process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3').replace(/\/$/, '')

/** Rótulo da conta em uso. Vai gravado em cada pagamento para conciliação futura. */
export const ASAAS_CONTA = process.env.ASAAS_CONTA || 'principal'

/**
 * Freio de emergência do ambiente. Com 'false' na Vercel, nenhuma cobrança
 * é criada e o painel admin não consegue religar.
 */
export const PAGAMENTOS_ATIVO = process.env.PAGAMENTOS_ATIVO !== 'false'

const API_KEY = process.env.ASAAS_API_KEY || ''
const USER_AGENT = 'Aduno'

export class AsaasErro extends Error {
  constructor(message: string, public status = 500, public detalhe?: unknown) {
    super(message)
    this.name = 'AsaasErro'
  }
}

// ─── Cliente HTTP ─────────────────────────────────────────────────────────────

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  if (!API_KEY) {
    throw new AsaasErro('ASAAS_API_KEY não configurada no ambiente', 500)
  }

  const res = await fetch(`${ASAAS_BASE}${caminho}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,       // obrigatório em contas criadas após jun/2024
      access_token: API_KEY,
      ...(init?.headers || {}),
    },
  })

  const texto = await res.text()
  let corpo: any = null
  try { corpo = texto ? JSON.parse(texto) : null } catch { corpo = texto }

  if (!res.ok) {
    const msg = corpo?.errors?.[0]?.description
      || corpo?.errors?.[0]?.code
      || `Asaas respondeu ${res.status}`
    throw new AsaasErro(msg, res.status, corpo)
  }
  return corpo as T
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AsaasCliente {
  id: string
  name: string
  cpfCnpj: string
}

export interface AsaasCobranca {
  id: string
  customer: string
  status: string
  value: number
  billingType: string
  dueDate: string
  invoiceUrl?: string
  bankSlipUrl?: string
  externalReference?: string
  paymentDate?: string
  clientPaymentDate?: string
  confirmedDate?: string
}

export interface AsaasPixQrCode {
  encodedImage: string     // PNG em base64
  payload: string          // código copia-e-cola
  expirationDate?: string
}

// ─── Operações ────────────────────────────────────────────────────────────────

/** Cria um cliente no Asaas. O identificador retornado é específico desta conta. */
export async function criarCliente(dados: {
  nome: string
  cpf: string
  email?: string | null
  telefone?: string | null
  referenciaExterna?: string
}): Promise<AsaasCliente> {
  const cpf = dados.cpf.replace(/\D/g, '')
  if (cpf.length !== 11) throw new AsaasErro('CPF inválido para cadastro no Asaas', 400)

  return api<AsaasCliente>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: dados.nome,
      cpfCnpj: cpf,
      email: dados.email || undefined,
      mobilePhone: dados.telefone?.replace(/\D/g, '') || undefined,
      externalReference: dados.referenciaExterna,
      notificationDisabled: true,   // quem avisa o paciente é a Aduno, não o Asaas
    }),
  })
}

/**
 * Cria uma cobrança.
 *
 * `metodo`:
 *   'pix'    → gera QR code que mostramos dentro da plataforma
 *   'cartao' → gera fatura hospedada no Asaas; o paciente digita o cartão lá,
 *              nunca aqui. Mantém o sistema fora do escopo de PCI.
 */
export async function criarCobranca(dados: {
  clienteId: string
  valor: number
  descricao: string
  metodo: 'pix' | 'cartao'
  referenciaExterna: string
  vencimento?: string          // AAAA-MM-DD; padrão: hoje
  /** Teto vindo da configuração do painel. */
  valorMaximo: number
  /** Chave geral vinda da configuração do painel. */
  ativo: boolean
}): Promise<AsaasCobranca> {
  // ── Travas de segurança ──
  if (!PAGAMENTOS_ATIVO || !dados.ativo) {
    throw new AsaasErro('Cobranças estão desativadas na configuração do sistema', 503)
  }
  if (!(dados.valor > 0)) {
    throw new AsaasErro('Valor da cobrança precisa ser maior que zero', 400)
  }
  if (dados.valor > dados.valorMaximo) {
    throw new AsaasErro(
      `Valor R$ ${dados.valor.toFixed(2)} acima do teto de segurança de R$ ${dados.valorMaximo.toFixed(2)}`,
      400,
    )
  }

  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  return api<AsaasCobranca>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: dados.clienteId,
      billingType: dados.metodo === 'pix' ? 'PIX' : 'CREDIT_CARD',
      value: Number(dados.valor.toFixed(2)),
      dueDate: dados.vencimento || hoje,
      description: dados.descricao,
      externalReference: dados.referenciaExterna,
    }),
  })
}

/** Busca o QR code PIX de uma cobrança já criada. */
export function obterQrCodePix(cobrancaId: string): Promise<AsaasPixQrCode> {
  return api<AsaasPixQrCode>(`/payments/${cobrancaId}/pixQrCode`)
}

/** Consulta a cobrança direto na fonte. Usado para confirmar avisos de webhook. */
export function consultarCobranca(cobrancaId: string): Promise<AsaasCobranca> {
  return api<AsaasCobranca>(`/payments/${cobrancaId}`)
}

/** Cancela uma cobrança pendente. */
export function cancelarCobranca(cobrancaId: string): Promise<{ deleted: boolean }> {
  return api(`/payments/${cobrancaId}`, { method: 'DELETE' })
}

// ─── Tradução de status ───────────────────────────────────────────────────────

/** Converte o status do Asaas para o vocabulário interno da Aduno. */
export function traduzirStatus(statusAsaas: string): 'pendente' | 'pago' | 'expirado' | 'cancelado' | 'estornado' | 'falhou' {
  switch (statusAsaas) {
    case 'CONFIRMED':            // pago, saldo ainda não liberado
    case 'RECEIVED':             // pago e disponível
    case 'RECEIVED_IN_CASH':
      return 'pago'
    case 'OVERDUE':
      return 'expirado'
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
      return 'estornado'
    case 'DELETED':
      return 'cancelado'
    default:
      return 'pendente'
  }
}

/** Eventos de webhook que indicam pagamento efetivado. */
export const EVENTOS_PAGO = new Set([
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED_IN_CASH',
])

/** Eventos que invalidam a cobrança. */
export const EVENTOS_NEGATIVOS = new Set([
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
])
