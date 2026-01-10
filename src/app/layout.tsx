import type { Metadata } from 'next'
import './globals.css'
import { headers } from 'next/headers'
import { getSiteBaseUrl, isProdSite } from '../lib/seo'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { HtmlLangSetter } from '@/components/seo/HtmlLangSetter'
import { Footer } from '@/components/layout/Footer'

export const runtime = 'edge'

// stg/dev/local はデフォルトで noindex（誤インデックス防止）
const isNoindex = process.env.ROBOTS_NOINDEX === 'true' || !isProdSite()
const base = getSiteBaseUrl()
function isLocalhostBaseUrl(siteBaseUrl: string): boolean {
  try {
    const u = siteBaseUrl.includes('://') ? new URL(siteBaseUrl) : new URL(`https://${siteBaseUrl}`)
    const host = u.hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return false
  }
}

const appEnv = (process.env.APP_ENV || '').toLowerCase()
const faviconIconUrl =
  // ローカル開発
  process.env.NODE_ENV === 'development' || isLocalhostBaseUrl(base)
    ? '/icon_dev.svg'
    : // Cloudflare等で明示される環境
      appEnv === 'stg'
      ? '/icon_stg.svg'
      : appEnv === 'prod'
        ? '/icon.svg'
        : // フォールバック（host判定）
          !isProdSite()
          ? '/icon_stg.svg'
          : '/icon.svg'

export const metadata: Metadata = {
  metadataBase: new URL(base),
  // NOTE: 国別（/[country]）で title.template を出し分けるため、Root では template を持たせない
  title: 'The Gentle Light',
  description: '優しく、静かに、世界のニュースを届けます',
  alternates: {
    canonical: base,
  },
  icons: {
    // NOTE: favicon は環境別に出し分け（dev: icon_dev.svg / stg: icon_stg.svg / prod: icon.svg）
    icon: [{ url: faviconIconUrl, type: 'image/svg+xml' }],
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
  const h = headers()
  const pathname = h.get('x-tgl-pathname') || ''
  const seg = (pathname.split('/')[1] || '').trim().toLowerCase()
  const acceptLanguage = h.get('accept-language') ?? ''
  const isJaByHeader = /(^|,)\s*ja([-_][A-Za-z]+)?\s*(;|,|$)/i.test(acceptLanguage)
  const lang =
    seg === 'jp'
      ? 'ja-JP'
      : seg === 'uk'
        ? 'en-GB'
        : seg === 'ca'
          ? 'en-CA'
          : seg === 'us'
            ? 'en-US'
            : isJaByHeader
              ? 'ja-JP'
              : 'en-US'

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <HtmlLangSetter />
        <GoogleAnalytics />
        {children}
        <Footer />
      </body>
    </html>
  )
}

