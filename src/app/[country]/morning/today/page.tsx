import { permanentRedirect, notFound } from 'next/navigation'
import { fetchJson, isCountry, type TodayResponse, type HomeResponse } from '@/lib/tglApi'

function normalizeDailyDate(dateValue: string): string {
  if (!dateValue) return ''
  return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue
}

export default function MorningTodayPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  // legacy: /morning/today は /daily/{date} へ恒久リダイレクト（チェーン短縮）
  return (async () => {
    let today: string | null = null
    try {
      const t = await fetchJson<TodayResponse>(`/v1/${country}/today`, { cache: 'no-store' })
      today = t?.date || null
    } catch {}
    if (!today) {
      // fallback: list page is stable and indexable
      permanentRedirect(`/${country}/daily`)
    }
    // Prefer the latest generated daily date if present
    let latestDailyDate = ''
    try {
      const home = await fetchJson<HomeResponse>(`/v1/${country}/home`, { cache: 'no-store' })
      latestDailyDate = normalizeDailyDate(home?.daily_latest?.date_local ?? '')
    } catch {}
    permanentRedirect(`/${country}/daily/${latestDailyDate || today}`)
  })() as any
}
