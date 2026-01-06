import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'パスワード再設定',
  description: 'パスワード再設定ページ',
  noindex: true,
})

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}


