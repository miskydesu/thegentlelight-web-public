import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { isCountry } from '../../lib/tglApi'
import { Header } from '../../components/layout/Header'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay } from './_sidebar/blocks'
import styles from './layout.module.css'

export const runtime = 'edge'

export default async function CountryLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { country: string }
}) {
  const country = isCountry(params.country) ? params.country : null
  const pathname = headers().get('x-tgl-pathname') || ''
  const isDaily = country ? pathname.startsWith(`/${country}/daily`) : false

  return (
    <>
      <Header country={country} />
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.main}>{children}</div>
          {country ? (
            <aside className={styles.sidebar}>
              {isDaily ? (
                <>
                  <SidebarDailyCalendar country={country} />
                  <div style={{ height: 14 }} />
                  <SidebarGentleIntro country={country} />
                  <div style={{ height: 14 }} />
                  <SidebarLatestColumns country={country} />
                  <div style={{ height: 14 }} />
                  <SidebarQuoteOfDay country={country} />
                </>
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
