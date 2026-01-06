import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: '新規登録',
  description: '新規登録ページ',
  noindex: true,
})

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}


