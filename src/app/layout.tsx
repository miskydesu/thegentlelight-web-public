import type { Metadata } from 'next'
import './globals.css'
import { getSiteBaseUrl, isProdSite } from '../lib/seo'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { HtmlLangSetter } from '@/components/seo/HtmlLangSetter'
import { Footer } from '@/components/layout/Footer'

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
  icons: {
    // NOTE: 本番用のシンボルマークに差し替える場合は public/icon.svg を置き換える
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'The Gentle Light',
    description: '優しく、静かに、世界のニュースを届けます',
    type: 'website',
    url: base,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The Gentle Light' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Gentle Light',
    description: '優しく、静かに、世界のニュースを届けます',
    images: ['/og.png'],
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
        <Footer />
      </body>
    </html>
  )
}

