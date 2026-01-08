import type { ReactNode } from 'react'
import { isCountry } from '../../lib/tglApi'
import { Header } from '../../components/layout/Header'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay } from './_sidebar/blocks'
import styles from './layout.module.css'

export const runtime = 'edge'

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
