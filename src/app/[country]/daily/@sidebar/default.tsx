import { headers } from 'next/headers'
import { isCountry } from '@/lib/tglApi'
import { SidebarDailyCalendar, SidebarGentleIntro, SidebarLatestColumns, SidebarQuoteOfDay } from '../../_sidebar/blocks'

function normalizePathname(raw: string): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    // raw may be a full URL (referer/next-url), or a path
    return new URL(s, 'http://localhost').pathname || ''
  } catch {
    return s.split('?')[0] || ''
  }
}

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
  const path = normalizePathname(pathname)
  const isDailyListPage = path === `/${country}/daily`

  return (
    <>
      {!isDailyListPage ? (
        <>
          <SidebarDailyCalendar country={country} />
          <div style={{ height: 14 }} />
        </>
      ) : null}
      <SidebarGentleIntro country={country} />
      <div style={{ height: 14 }} />
      <SidebarLatestColumns country={country} />
      <div style={{ height: 14 }} />
      <SidebarQuoteOfDay country={country} />
    </>
  )
}


