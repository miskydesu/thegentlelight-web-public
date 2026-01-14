import { isCountry } from '@/lib/tglApi'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarQuoteOfDay } from '../../_sidebar/blocks'

// Sidebar override for /[country]/columns/**:
// - Remove "Latest columns" block (requested)
// - Keep other blocks the same as default
export default async function ColumnsSidebarDefault({ params }: { params: { country: string } }) {
  const country = isCountry(params.country) ? params.country : null
  if (!country) return null

  return (
    <>
      <SidebarGentleIntro country={country} />
      <div style={{ height: 14 }} />
      <SidebarQuoteOfDay country={country} />
      <div style={{ height: 14 }} />
      <SidebarDailyCalendar country={country} />
    </>
  )
}

