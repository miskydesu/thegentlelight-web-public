import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'マイページ',
  description: 'アカウント設定',
  noindex: true,
})

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return children
}


