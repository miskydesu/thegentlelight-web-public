import { redirect, notFound } from 'next/navigation'
import { fetchJson, isCountry, type TodayResponse, type HomeResponse } from '@/lib/tglApi'
import { canonicalUrl, getCountrySeoMeta } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'

function normalizeDailyDate(dateValue: string): string {
  if (!dateValue) return ''
  return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue
}

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const isJa = country === 'jp'
  const { descriptionPrefixEn, descriptionPrefixJa } = getCountrySeoMeta(country)
  const hreflang = generateHreflang('/daily/today')
  const baseDescription = isJa
    ? '今日の穏やかな朝刊。不安やニュース疲れに疲れず、必要なことを静かに把握する。'
    : "Today's calm news briefing. Stay informed without anxiety, doomscrolling, or news fatigue."
  return {
    title: isJa ? '今日の朝刊' : "Today's Daily Briefing",
    description: isJa ? `${descriptionPrefixJa}${baseDescription}` : `${descriptionPrefixEn}${baseDescription}`,
    keywords: isJa
      ? ['今日のニュース', '朝刊', 'デイリーブリーフィング', '穏やかなニュース', '不安のないニュース']
      : ["today's news", 'daily briefing', 'morning briefing', 'calm news today', 'news without anxiety'],
    alternates: {
      canonical: canonicalUrl(`/${country}/daily/today`),
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function DailyTodayPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  let data: TodayResponse
  try {
    data = await fetchJson<TodayResponse>(`/v1/${country}/today`, { cache: 'no-store' })
  } catch {
    return notFound()
  }

  const today = data.date
  if (!today) return notFound()

  // If exists, open today's briefing page (daily/[date])
  if (data.daily && data.daily.daily_id) {
    redirect(`/${country}/daily/${today}`)
  }
  const home = await fetchJson<HomeResponse>(`/v1/${country}/home`, { next: { revalidate: CACHE_POLICY.frequent } })
  const latestDailyDate = normalizeDailyDate(home?.daily_latest?.date_local ?? '')
  redirect(`/${country}/daily/${latestDailyDate || today}?from=today`)
}


