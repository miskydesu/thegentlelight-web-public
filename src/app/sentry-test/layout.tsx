import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'Sentryテスト',
  description: '内部テストページ',
  noindex: true,
})

export default function SentryTestLayout({ children }: { children: React.ReactNode }) {
  return children
}


