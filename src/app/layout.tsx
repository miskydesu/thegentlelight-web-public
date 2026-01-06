import type { Metadata } from 'next'
import './globals.css'

export const runtime = 'edge'

const isNoindex = process.env.ROBOTS_NOINDEX === 'true'

export const metadata: Metadata = {
  title: 'The Gentle Light',
  description: 'The Gentle Light',
  robots: isNoindex ? { index: false, follow: false, googleBot: { index: false, follow: false } } : undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

