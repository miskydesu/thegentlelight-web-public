import { headers } from 'next/headers'
import { isCountry } from '@/lib/tglApi'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay } from '../_sidebar/blocks'

export default async function SidebarDefault({ params }: { params: { country: string } }) {
  const h = headers()
  const pathname =
    h.get('x-tgl-pathname') ||
    h.get('x-invoke-path') ||
    h.get('x-nextjs-rewrite') ||
    h.get('x-matched-path') ||
    h.get('next-url') ||
    h.get('referer') ||
    ''
  const country = isCountry(params.country) ? params.country : null
  if (!country) return null
  const isDailyPage = pathname.includes(`/${country}/daily`)

  return (
    <>
      {isDailyPage ? (
        <>
          <SidebarGentleIntro country={country} />
          <div style={{ height: 14 }} />
          <SidebarDailyCalendar country={country} />
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
    </>
  )
}


