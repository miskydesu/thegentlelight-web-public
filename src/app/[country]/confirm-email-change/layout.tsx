import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'メールアドレス変更（確認）',
  description: 'メールアドレス変更の確認ページ',
  noindex: true,
})

export default function ConfirmEmailChangeLayout({ children }: { children: React.ReactNode }) {
  return children
}


