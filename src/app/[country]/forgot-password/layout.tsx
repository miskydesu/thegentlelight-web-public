import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: 'パスワード再設定（申請）',
  description: 'パスワード再設定リンクの送信ページ',
  noindex: true,
})

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}


