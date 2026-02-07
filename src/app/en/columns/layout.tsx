import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const runtime = 'edge'

export function generateMetadata(): Metadata {
  // Columns はタイトルが長くなりがちなので、/en 配下でも columns だけ suffix を短縮する
  // - /en layout の "%s | Calm News — The Gentle Light" を上書き
  return {
    title: {
      default: 'TGL',
      template: `%s | TGL`,
    },
  }
}

export default function EnColumnsLayout({ children }: { children: ReactNode }) {
  return children
}

