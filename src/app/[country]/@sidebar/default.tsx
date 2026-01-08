import { isCountry } from '@/lib/tglApi'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay } from '../_sidebar/blocks'

export default async function SidebarDefault({ params }: { params: { country: string } }) {
  const country = isCountry(params.country) ? params.country : null
  if (!country) return null

  return (
    <>
      <SidebarGentleIntro country={country} />
      <div style={{ height: 14 }} />
      <SidebarLatestColumns country={country} />
      <div style={{ height: 14 }} />
      <SidebarQuoteOfDay country={country} />
      <div style={{ height: 14 }} />
      <SidebarDailyCalendar country={country} />
    </>
  )
}


