import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'メール認証',
  description: 'メール認証ページ',
  noindex: true,
})

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children
}


