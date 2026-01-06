import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'テスト',
  description: '内部テストページ',
  noindex: true,
})

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return children
}


