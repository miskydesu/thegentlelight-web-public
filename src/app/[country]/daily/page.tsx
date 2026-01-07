import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type DailyListResponse } from '../../../lib/tglApi'
import { canonicalUrl, getSiteBaseUrl } from '../../../lib/seo'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '../../../lib/i18n'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { generateHreflang, generateBreadcrumbListJSONLD } from '../../../lib/seo-helpers'

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

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  const hreflang = generateHreflang('/daily')
  const isJa = country === 'jp'
  return {
    title: isJa ? '朝刊一覧｜The Gentle Light' : 'Daily Briefings | The Gentle Light',
    description: isJa
      ? '朝刊（デイリー）を日付ごとに一覧で。気になる日だけ落ち着いて振り返れます。'
      : 'Browse daily briefings by date. Catch up calmly, one day at a time.',
    keywords: isJa
      ? ['朝刊', 'デイリーニュース', '穏やかなニュース', '不安のないニュース']
      : ['daily briefing', 'morning news', 'calm news', 'news without anxiety'],
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
  searchParams?: { year?: string; month?: string }
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
  const isPartial = Boolean(data.meta?.is_partial)
  const t = getTranslationsForCountry(country, lang)

  const monthLabel = `${year}-${String(month).padStart(2, '0')}`
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

  const weekdayLabels = country === 'jp'
    ? ['日', '月', '火', '水', '木', '金', '土']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const todayYmd = getLocalYmdForCountry(country)

  const statusLabel = (s: string) => {
    const v = String(s || '')
    if (country === 'jp') {
      if (v === 'ready') return '生成済み'
      if (v === 'pending') return '生成中'
      if (v === 'failed') return '失敗'
      if (v === 'empty') return '空'
      return v
    }
    if (v === 'ready') return 'Ready'
    if (v === 'pending') return 'Pending'
    if (v === 'failed') return 'Failed'
    if (v === 'empty') return 'Empty'
    return v
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJSONLD),
        }}
      />
      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.4rem' }}>{country === 'jp' ? '朝刊一覧' : 'Daily Briefings'}</h1>
          {isPartial && <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>}
        </div>

      <div style={{ height: 12 }} />

      <section style={{ marginBottom: 18 }}>
        <Card>
          <CardTitle>{country === 'jp' ? 'カレンダー' : 'Calendar'}</CardTitle>
          <CardMeta style={{ marginTop: 8 }}>
            <Link href={`/${country}/daily?year=${prev.year}&month=${prev.month}`} className="tglMuted">
              ← {prev.year}-{String(prev.month).padStart(2, '0')}
            </Link>
            <span style={{ fontWeight: 700 }}>{monthLabel}</span>
            <Link href={`/${country}/daily?year=${next.year}&month=${next.month}`} className="tglMuted">
              {next.year}-{String(next.month).padStart(2, '0')} →
            </Link>
          </CardMeta>
          <CardContent style={{ marginTop: 12 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 8,
              }}
            >
              {weekdayLabels.map((w) => (
                <div key={w} style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>
                  {w}
                </div>
              ))}

              {/* leading blanks */}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`b-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const info = dayMap.get(date) || null
                const isFailed = info?.status === 'failed'
                const isPending = info?.status === 'pending'
                const isReady = info?.status === 'ready'
                const badgeBg = isFailed ? '#f6f6f6' : isPending ? '#f6f6f6' : isReady ? '#f6f6f6' : '#f6f6f6'
                const badgeColor = isFailed ? '#6b0000' : 'var(--muted)'

                // 未来日はリンクしない
                if (date > todayYmd) {
                  return (
                    <div
                      key={date}
                      style={{
                        display: 'block',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '10px 10px 8px',
                        color: 'var(--muted)',
                        background: '#fff',
                        opacity: 0.55,
                      }}
                      title={country === 'jp' ? '未来日付' : 'Future date'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <div style={{ fontWeight: 700 }}>{day}</div>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
                      </div>
                      <div style={{ height: 6 }} />
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{country === 'jp' ? '—' : '—'}</div>
                    </div>
                  )
                }

                return (
                  <Link
                    key={date}
                    href={`/${country}/daily/${date}`}
                    style={{
                      display: 'block',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 10px 8px',
                      textDecoration: 'none',
                      color: 'inherit',
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontWeight: 700 }}>{day}</div>
                      {info ? (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: '1px solid var(--border)',
                            background: badgeBg,
                            color: badgeColor,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {statusLabel(info.status)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{country === 'jp' ? '—' : '—'}</span>
                      )}
                    </div>
                    <div style={{ height: 6 }} />
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {info ? `${info.topicCount} topics` : country === 'jp' ? '未生成' : 'Not generated'}
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

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


