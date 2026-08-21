import { headers } from 'next/headers'

/**
 * Descobre o endereço do site a partir da requisição que chegou.
 *
 * Por que isso importa: se o endereço ficar fixo numa variável de ambiente,
 * o sistema sempre joga o usuário de volta para aquele endereço — mesmo que
 * ele tenha entrado por outro domínio. Lendo o host da requisição, o login
 * funciona em qualquer endereço: aduno.com.br, med-digital.vercel.app,
 * previews da Vercel e localhost.
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host  = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
    if (host) return `${proto}://${host}`
  } catch {
    // headers() não está disponível fora do contexto de requisição (ex.: cron)
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Endereço público do sistema para uso fora de uma requisição
 * (e-mails, notificações, jobs agendados).
 * Configure NEXT_PUBLIC_APP_URL na Vercel.
 */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://aduno.com.br'
).replace(/\/$/, '')

/** Mesmo endereço sem o "https://" — para exibir em textos e e-mails. */
export const APP_HOST = APP_URL.replace(/^https?:\/\//, '')
