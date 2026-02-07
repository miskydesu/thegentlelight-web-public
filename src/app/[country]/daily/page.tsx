import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type DailyDetailResponse, type DailyListResponse, type HomeResponse } from '../../../lib/tglApi'
import { canonicalUrl, getCountrySeoMeta, getSiteBaseUrl } from '../../../lib/seo'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '../../../lib/i18n'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { generateHreflang, generateBreadcrumbListJSONLD } from '../../../lib/seo-helpers'
import styles from '../layout.module.css'
import homeStyles from '../home.module.css'
import { DailyCalendarCard } from '@/components/daily/DailyCalendarCard'

function getLocalYmdForCountry(country: 'us' | 'uk' | 'ca' | 'jp', now: Date = new Date()): string {
  const tz: Record<string, string> = {
    us: 'America/New_York',
    ca: 'America/Toronto',
    uk: 'Europe/London',
    jp: 'Asia/Tokyo',
  }
  const timeZone = tz[country] || 'UTC'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function normalizeDailyDate(dateValue: string): string {
  if (!dateValue) return ''
  return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue
}

function shiftDateLocal(dateLocal: string, days: number): string {
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatMonthDayLabel(dateLocal: string, locale: 'ja' | 'en'): string {
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  if (locale === 'ja') {
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
    }).format(d)
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
}

function getBorderAccentForDate(dateLocal: string): string {
  // dateLocal is YYYY-MM-DD; weekday depends on the calendar date.
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  const dow = d.getUTCDay() // 0=Sun ... 6=Sat
  if (dow === 0) return '#e06a8d' // Sun: red-ish pink
  if (dow === 6) return '#55b6e6' // Sat: blue-ish light cyan
  return 'var(--accent)'
}

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  const hreflang = generateHreflang('/daily')
  const isJa = country === 'jp'
  if (isCountry(country)) {
    const { descriptionSuffixEn, descriptionSuffixJa } = getCountrySeoMeta(country)
    const base = isJa
      ? 'ニュースを、煽らない言葉で毎日まとめた「朝刊」。今日の朝刊へすぐ移動でき、過去の朝刊も日付で静かに振り返れます。'
      : "A daily briefing is a calm summary of the news. Jump to today's briefing or browse past days by date."
    const description = isJa ? `${base}${descriptionSuffixJa}` : `${base}${descriptionSuffixEn}`
    return {
      title: isJa ? '今日のニュースが5分でわかる朝刊アーカイブ' : "Daily Briefing Archive — 5-Minute News",
      description,
      keywords: isJa
        ? [
            '朝刊',
            '朝刊アーカイブ',
            '過去の朝刊',
            'ニュースまとめ',
            'デイリーブリーフィング',
            '日付で探す',
            'ニュース疲れ',
          ]
        : ['daily briefing archive', 'daily news summary', 'morning briefing', 'news digest', 'calm news', 'world news summary'],
      alternates: {
        canonical: canonicalUrl(`/${country}/daily`),
        languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
      },
    }
  }
  return {
    title: isJa ? '今日のニュースが5分でわかる朝刊アーカイブ' : "Daily Briefing Archive — 5-Minute News",
    description: isJa
      ? 'ニュースを、煽らない言葉で毎日まとめた「朝刊」。今日の朝刊へすぐ移動でき、過去の朝刊も日付で静かに振り返れます。'
      : "A daily briefing is a calm summary of the news. Jump to today's briefing or browse past days by date.",
    keywords: isJa
      ? ['朝刊', '朝刊アーカイブ', '過去の朝刊', 'ニュースまとめ', 'デイリーブリーフィング', '日付で探す', 'ニュース疲れ']
      : ['daily briefing archive', 'daily news summary', 'morning briefing', 'news digest', 'calm news', 'world news summary'],
    alternates: {
      canonical: canonicalUrl(`/${country}/daily`),
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function DailyIndex({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams?: { year?: string; month?: string; selected?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const base = getSiteBaseUrl()
  const isJa = country === 'jp'
  const breadcrumbJSONLD = generateBreadcrumbListJSONLD({
    items: [
      { name: 'The Gentle Light', url: `${base}/` },
      { name: isJa ? 'トップ' : 'Home', url: `${base}/${country}` },
      { name: isJa ? '朝刊' : 'Morning Briefing', url: `${base}/${country}/daily` },
    ],
  })
  const now = new Date()
  const year = (() => {
    const y = searchParams?.year ? Number(searchParams.year) : now.getUTCFullYear()
    return Number.isFinite(y) ? Math.max(2000, Math.min(2100, Math.trunc(y))) : now.getUTCFullYear()
  })()
  const month = (() => {
    const m = searchParams?.month ? Number(searchParams.month) : now.getUTCMonth() + 1
    return Number.isFinite(m) ? Math.max(1, Math.min(12, Math.trunc(m))) : now.getUTCMonth() + 1
  })()

  // 生成直後の反映を優先（キャッシュ無効）
  const data = await fetchJson<DailyListResponse>(`/v1/${country}/daily?year=${year}&month=${month}`, { cache: 'no-store' })
  const home = await fetchJson<HomeResponse>(`/v1/${country}/home`, { cache: 'no-store' })
  const isPartial = Boolean(data.meta?.is_partial)
  const t = getTranslationsForCountry(country, lang)

  const monthLabel = isJa
    ? `${year}年${month}月`
    : new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' }).format(new Date(Date.UTC(year, month - 1, 1)))
  const prev = (() => {
    const d = new Date(Date.UTC(year, month - 1, 1))
    d.setUTCMonth(d.getUTCMonth() - 1)
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
  })()
  const next = (() => {
    const d = new Date(Date.UTC(year, month - 1, 1))
    d.setUTCMonth(d.getUTCMonth() + 1)
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
  })()

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay() // 0=Sun

  const dayMap = new Map<string, { topicCount: number; updatedAt: string | null; status: string }>()
  for (const d of data.days || []) {
    const key = String(d.dateLocal).slice(0, 10)
    dayMap.set(key, { topicCount: d.topicCount, updatedAt: d.updatedAt ?? null, status: d.status })
  }
  const dayStatusByDate: Record<string, string> = {}
  dayMap.forEach((value, key) => {
    dayStatusByDate[key] = String(value.status || '')
  })

  const weekdayLabels = country === 'jp'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const todayYmd = getLocalYmdForCountry(country)
  const selectedDate = (() => {
    const raw = String(searchParams?.selected || '')
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    return todayYmd
  })()
  const latestDailyDate = normalizeDailyDate(home?.daily_latest?.date_local ?? '')
  const latestDailyMonthDayLabel = latestDailyDate ? formatMonthDayLabel(latestDailyDate, isJa ? 'ja' : 'en') : ''

  // 最近5日分（新しい順）
  const recentDailyItems = await (async () => {
    const baseDate = latestDailyDate || todayYmd
    const items: Array<{ date: string; monthDay: string; message: string }> = []
    const maxTry = 14
    for (let i = 0; i < maxTry && items.length < 5; i++) {
      const date = shiftDateLocal(baseDate, -i)
      try {
        const d = await fetchJson<DailyDetailResponse>(`/v1/${country}/daily/${date}`, { cache: 'no-store' })
        const msg = String(d?.messages?.[0]?.message || d?.daily?.summary || '').trim()
        items.push({
          date,
          monthDay: formatMonthDayLabel(date, isJa ? 'ja' : 'en'),
          message: msg,
        })
      } catch {
        // skip missing days
      }
    }
    return items
  })()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJSONLD),
        }}
      />
      <main>
        <header
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}
        >
          <div style={{ flex: '1 1 520px', minWidth: 0 }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 6 }}>
              {country === 'jp' ? '朝刊一覧' : 'Daily Briefings'}
            </h1>
            <div className={styles.dailyGuideCard}>
              <div className={styles.dailyGuideLine1}>
                {country === 'jp'
                  ? '朝刊のバックナンバーを、日付で読むページです。'
                  : 'Browse past briefings by date.'}
              </div>
              <div className={styles.dailyGuideLine2}>
                {country === 'jp'
                  ? '気になる日付を押すと、その日の「1日の全体像（5分）」が開きます。'
                  : "Tap a date to open that day's 5-minute overview."}
              </div>
              <div className="tglMuted" style={{ marginTop: 4, fontSize: '0.8rem' }}>
                {country === 'jp' ? '使い方：日付を選ぶ → 朝刊を開く' : 'How to: choose a date → open the briefing'}
              </div>
              <div style={{ marginTop: 6, textAlign: 'right' }}>
                <Link
                  href={`/${country}/columns/mkcnb9euo4wrdycp3p00000000`}
                  style={{ fontSize: '0.8rem', color: 'var(--muted)', textDecoration: 'underline' }}
                >
                  {country === 'jp' ? '朝刊ってなに？' : 'What is a briefing?'}
                </Link>
              </div>
            </div>
          </div>
          {isPartial && <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>}
        </header>

        <div style={{ height: 14 }} />

        <nav aria-label={country === 'jp' ? '主要導線' : 'Primary actions'} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href={latestDailyDate ? `/${country}/daily/${latestDailyDate}` : `/${country}/daily`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid var(--accent)',
              background: '#fff',
              textDecoration: 'none',
              color: 'var(--text)',
              fontWeight: 800,
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
            }}
          >
            ✅{' '}
            {country === 'jp'
              ? `最新の朝刊（${latestDailyMonthDayLabel || '—'}）を見る`
              : `Latest briefing (${latestDailyMonthDayLabel || '—'})`}
          </Link>
        </nav>

        <div style={{ height: 16 }} />

        <div className={styles.dailyWideDivider} />
        <div style={{ height: 14 }} />

        <div className={styles.dailyListGrid}>
          <section style={{ minWidth: 0 }}>
            <DailyCalendarCard
              country={country}
              year={year}
              month={month}
              monthLabel={monthLabel}
              prevHref={`/${country}/daily?year=${prev.year}&month=${prev.month}`}
              nextHref={`/${country}/daily?year=${next.year}&month=${next.month}`}
              weekdayLabels={weekdayLabels}
              firstWeekday={firstWeekday}
              daysInMonth={daysInMonth}
              todayYmd={todayYmd}
              selectedDate={selectedDate}
              dayStatusByDate={dayStatusByDate}
              latestDailyDate={latestDailyDate}
            />
          </section>

          {recentDailyItems.length ? (
            <section className={homeStyles.listSection} style={{ marginTop: 0, minWidth: 0 }}>
              <header
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '1rem',
                  marginBottom: 10,
                }}
              >
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{country === 'jp' ? '直近5日分の朝刊' : 'Briefings: last 5 days'}</h2>
                <span />
              </header>

              <ul className={homeStyles.listItems}>
                {recentDailyItems.map((it) => (
                  <li key={it.date} className={homeStyles.listItem}>
                    <Link className={homeStyles.listItemLink} href={`/${country}/daily/${it.date}`}>
                      <h3
                        className={`${homeStyles.listTitle} ${homeStyles.listTitleAccent}`}
                        style={{ ['--cat-color' as any]: getBorderAccentForDate(it.date) }}
                      >
                        {country === 'jp' ? (
                          <>
                            <time dateTime={it.date}>{it.monthDay}</time>の朝刊
                          </>
                        ) : (
                          <>
                            Briefing (<time dateTime={it.date}>{it.monthDay}</time>)
                          </>
                        )}
                      </h3>
                      <div className={styles.dailyRecentMeta}>
                        <span className={styles.dailyRecentMessage} style={{ opacity: 0.9 }}>
                          {it.message || (country === 'jp' ? '（まだ準備中です）' : '(Not ready yet)')}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {data.days?.length ? null : (
          <EmptyState
            title={country === 'jp' ? 'この月の日報がありません' : 'No daily digests for this month'}
            description={country === 'jp' ? '別の月をお試しください。' : 'Please try another month.'}
            action={{ label: t.nav.top, href: `/${country}` }}
          />
        )}

        {isPartial && <PartialNotice country={country} />}
      </main>
    </>
  )
}


