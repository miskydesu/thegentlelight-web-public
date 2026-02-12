import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { getPreferredCountry } from '@/lib/server/preferred-english-country'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay, SidebarQuickShortcuts } from '@/app/[country]/_sidebar/blocks'
import styles from '../[country]/layout.module.css'

export const runtime = 'edge'

export function generateMetadata(): Metadata {
  // /en は言語ページ（US/CA/UK の差分を持たない）
  // Root layout の openGraph/twitter description が日本語なので、/en で英語に上書きしておく
  const description = 'Calm, non-sensational news at a gentle pace.'
  return {
    title: {
      default: 'The Gentle Light',
      template: `%s | Calm News — The Gentle Light`,
    },
    description,
    openGraph: {
      description,
    },
    twitter: {
      description,
    },
  }
}

export default function EnglishLayout({ children }: { children: ReactNode }) {
  const country = getPreferredCountry()
  return (
    <>
      {/* /en 内でもサイトの通常ヘッダを出し、ニュース/朝刊は推奨国へ誘導できるようにする */}
      <Header country={country} />
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.main}>{children}</div>
          <aside className={styles.sidebar}>
            <SidebarGentleIntro country={country} />
            <div style={{ height: 14 }} />
            <SidebarQuickShortcuts country={country} />
            <div style={{ height: 14 }} />
            <SidebarLatestColumns country={country} />
            <div style={{ height: 14 }} />
            <SidebarQuoteOfDay country={country} />
            <div style={{ height: 14 }} />
            <SidebarDailyCalendar country={country} />
          </aside>
        </div>
      </div>
    </>
  )
}

