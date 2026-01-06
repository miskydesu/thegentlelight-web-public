import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo-helpers'

export const runtime = 'edge'

export const metadata: Metadata = generateSEOMetadata({
  title: '保存したトピック',
  description: 'ブラウザに保存したトピック一覧',
  noindex: true,
})

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return children
}


