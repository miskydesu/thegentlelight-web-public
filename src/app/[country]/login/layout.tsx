import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'ログイン',
  description: 'ログインページ',
  noindex: true,
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}


