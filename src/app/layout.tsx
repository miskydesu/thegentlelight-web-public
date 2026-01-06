import type { Metadata } from 'next'
import './globals.css'
import { getSiteBaseUrl, isProdSite } from '../lib/seo'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { headers } from 'next/headers'
import { isCountry, type Country } from '@/lib/tglApi'

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

function countryToHtmlLang(country: Country): string {
  // SEO向け: BCP47 を優先
  if (country === 'jp') return 'ja-JP'
  if (country === 'uk') return 'en-GB'
  if (country === 'ca') return 'en-CA'
  return 'en-US'
}

function detectHtmlLang(): string {
  const h = headers()
  const p = h.get('x-tgl-pathname') || '/'
  const seg = (p.split('/')[1] || '').trim()
  if (seg && isCountry(seg)) return countryToHtmlLang(seg)

  // `/`（国選択ページ）は Accept-Language で最小限判定
  const acceptLanguage = h.get('accept-language') ?? ''
  const isJa = /(^|,)\s*ja([-_][A-Za-z]+)?\s*(;|,|$)/i.test(acceptLanguage)
  return isJa ? 'ja-JP' : 'en-US'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const htmlLang = detectHtmlLang()
  return (
    <html lang={htmlLang}>
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}

