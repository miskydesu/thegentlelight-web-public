import type { Metadata } from 'next'
import './globals.css'
import { getSiteBaseUrl, isProdSite } from '../lib/seo'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { HtmlLangSetter } from '@/components/seo/HtmlLangSetter'

export const runtime = 'edge'

// stg/dev/local はデフォルトで noindex（誤インデックス防止）
const isNoindex = process.env.ROBOTS_NOINDEX === 'true' || !isProdSite()
const base = getSiteBaseUrl()

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: 'The Gentle Light',
    template: '%s | The Gentle Light',
  },
  description: '優しく、静かに、世界のニュースを届けます',
  alternates: {
    canonical: base,
  },
  openGraph: {
    title: 'The Gentle Light',
    description: '優しく、静かに、世界のニュースを届けます',
    type: 'website',
    url: base,
  },
  twitter: {
    card: 'summary',
    title: 'The Gentle Light',
    description: '優しく、静かに、世界のニュースを届けます',
  },
  robots: isNoindex ? { index: false, follow: false, googleBot: { index: false, follow: false } } : undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-US">
      <body>
        <HtmlLangSetter />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}

