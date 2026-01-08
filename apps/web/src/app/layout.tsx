import type { Metadata } from 'next'
import { Inter, Fredoka } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Taco',
  description: 'Plataforma de monitoramento e observabilidade',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${fredoka.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
