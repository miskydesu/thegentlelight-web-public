import type { ReactNode } from 'react'
import { isCountry } from '../../lib/tglApi'
import type { Metadata } from 'next'
import { getCountrySeoMeta } from '../../lib/seo'
import { Header } from '../../components/layout/Header'
import { EnsureCountryPreference } from '../../components/layout/EnsureCountryPreference'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay, SidebarQuickShortcuts } from './_sidebar/blocks'
import styles from './layout.module.css'

export const runtime = 'edge'

export function generateMetadata({
  params,
}: {
  // Next.js の LayoutProps（parallel route 含む）に合わせて slot を受け取れる形にしておく
  params: { country: string }
  children?: ReactNode
  sidebar: ReactNode
}): Metadata {
  const isJa = params.country === 'jp'
  // JP/EN で suffix を出し分け（ルートの template に依存しない）
  const suffix = isJa ? 'やさしいニュース The Gentle Light' : 'Calm News — The Gentle Light'
  const country = isCountry(params.country) ? params.country : null
  const countrySuffix = country ? getCountrySeoMeta(country).titleSuffix : ''
  return {
    title: {
      default: 'The Gentle Light',
      template: `%s | ${suffix}${countrySuffix}`,
    },
  }
}

export default async function CountryLayout({
  children,
  sidebar,
  params,
}: {
  children: ReactNode
  sidebar: ReactNode
  params: { country: string }
}) {
  const country = isCountry(params.country) ? params.country : null

  return (
    <>
      <Header country={country} />
      {/* 国別ページに直接着地した場合、国選択を“静かに”保存（SPA遷移でも確実に動く） */}
      {country ? <EnsureCountryPreference country={country} /> : null}
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.main}>{children}</div>
          {country ? (
            <aside className={styles.sidebar}>
              {sidebar ? (
                sidebar
              ) : (
                <>
                  <SidebarGentleIntro country={country} />
                  <div style={{ height: 14 }} />
                  <SidebarQuickShortcuts country={country} />
                  <div style={{ height: 14 }} />
                  <SidebarLatestColumns country={country} />
                  <div style={{ height: 14 }} />
                  <SidebarQuoteOfDay country={country} />
                  <div style={{ height: 14 }} />
                  <SidebarDailyCalendar country={country} />
                </>
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </>
  )
}
