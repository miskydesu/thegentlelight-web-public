import { isCountry } from '@/lib/tglApi'
import { SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay } from '../../_sidebar/blocks'

// Daily list page (`/{country}/daily`) should NOT show the sidebar daily calendar
// because the main content already contains the calendar UI.
export default async function DailyListSidebar({ params }: { params: { country: string } }) {
  const country = isCountry(params.country) ? params.country : null
  if (!country) return null

  return (
    <>
      <SidebarGentleIntro country={country} />
      <div style={{ height: 14 }} />
      <SidebarLatestColumns country={country} />
      <div style={{ height: 14 }} />
      <SidebarQuoteOfDay country={country} />
    </>
  )
}

