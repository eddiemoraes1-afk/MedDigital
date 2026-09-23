import type { Metadata, Viewport } from 'next'
import './globals.css'
import HeartbeatProvider from './HeartbeatProvider'
import ThemeScript from './ThemeScript'

export const metadata: Metadata = {
  title: 'Aduno — Cuidar de quem faz a sua empresa acontecer',
  description: 'Atendimento médico para o seu time, por vídeo, direto do celular. Sem fila, sem burocracia e sem pagar por consulta.',
  applicationName: 'Aduno',
  // favicon.ico, icon.png e apple-icon.png ficam em src/app/ (convenção do Next).
  // Aqui só os extras, que não colidem com nenhuma rota.
  icons: {
    other: [
      { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', url: '/icon-192.png', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Aduno — Cuidar de quem faz a sua empresa acontecer',
    description: 'Atendimento médico para o seu time, por vídeo, direto do celular. Sem fila, sem burocracia e sem pagar por consulta.',
    siteName: 'Aduno',
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#19382E' },
    { media: '(prefers-color-scheme: dark)',  color: '#111F18' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full antialiased" style={{ background: 'var(--bg)', color: 'var(--txt-1)' }}>
        <HeartbeatProvider />
        {children}
      </body>
    </html>
  )
}
