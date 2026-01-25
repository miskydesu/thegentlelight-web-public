import { redirect, notFound } from 'next/navigation'
import { fetchJson, isCountry, type TodayResponse, type HomeResponse } from '@/lib/tglApi'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function normalizeDailyDate(dateValue: string): string {
  if (!dateValue) return ''
  return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue
}

export default async function DailyTodayPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  // NOTE:
  // - 本番では middleware.ts が 308 を返し、/daily/today を恒久リダイレクト専用にする
  // - ここは「保険」（middleware無効時でもクエリ無しの日付URLへ寄せる）
  let data: TodayResponse
  try {
    data = await fetchJson<TodayResponse>(`/v1/${country}/today`, { cache: 'no-store' })
  } catch {
    return notFound()
  }

  const today = data.date
  if (!today) return notFound()

  if (data.daily && data.daily.daily_id) {
    redirect(`/${country}/daily/${today}`)
  }
  try {
    const home = await fetchJson<HomeResponse>(`/v1/${country}/home?limit=1`, { cache: 'no-store' })
    const latestDailyDate = normalizeDailyDate(home?.daily_latest?.date_local ?? '')
    redirect(`/${country}/daily/${latestDailyDate || today}`)
  } catch {
    redirect(`/${country}/daily/${today}`)
  }
}

