import { isCountry } from '@/lib/tglApi'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay } from '../../../_sidebar/blocks'

// `/daily/today` is a detail-like route, so keep the calendar.
export default async function DailyTodaySidebar({ params }: { params: { country: string } }) {
  const country = isCountry(params.country) ? params.country : null
  if (!country) return null

  return (
    <>
      <SidebarGentleIntro country={country} />
      <div style={{ height: 14 }} />
      <SidebarDailyCalendar country={country} />
      <div style={{ height: 14 }} />
      <SidebarLatestColumns country={country} />
      <div style={{ height: 14 }} />
      <SidebarQuoteOfDay country={country} />
    </>
  )
}

