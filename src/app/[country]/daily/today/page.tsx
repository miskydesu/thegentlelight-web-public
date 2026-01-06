import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { fetchJson, isCountry, type TodayResponse, type DailyListResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent, CardMeta, CardTitle } from '@/components/ui/Card'

function ymdMinusDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`)
  const ms = d.getTime() - Math.trunc(days) * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString().slice(0, 10)
}

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

export default async function DailyTodayPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  let data: TodayResponse
  try {
    data = await fetchJson<TodayResponse>(`/v1/${country}/today`, { cache: 'no-store' })
  } catch (e: any) {
    return (
      <main>
        <div className="tglMuted" style={{ marginBottom: 10 }}>
          <Link href={`/${country}`}>← {country === 'jp' ? 'トップ' : 'Home'}</Link>
        </div>
        <EmptyState
          title={country === 'jp' ? 'APIに接続できません' : 'Cannot reach API'}
          description={String(e?.message || e || '')}
          action={{ label: country === 'jp' ? 'トップへ' : 'Back to home', href: `/${country}` }}
        />
      </main>
    )
  }

  const today = data.date
  if (!today) return notFound()

  // If exists, open today's briefing page (daily/[date])
  if (data.daily && data.daily.daily_id) {
    redirect(`/${country}/daily/${today}`)
  }

  const yesterday = ymdMinusDays(today, 1)
  // 未生成ページに来た時のみ、カレンダーを表示する
  const todayYmd = getLocalYmdForCountry(country)
  const year = Number(todayYmd.slice(0, 4))
  const month = Number(todayYmd.slice(5, 7))
  const list = await fetchJson<DailyListResponse>(`/v1/${country}/daily?year=${year}&month=${month}`, { cache: 'no-store' })
  const dayMap = new Map<string, { topicCount: number; status: string }>()
  for (const d of list.days || []) {
    const key = String(d.dateLocal).slice(0, 10)
    dayMap.set(key, { topicCount: d.topicCount, status: String(d.status || '') })
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay() // 0=Sun
  const weekdayLabels = country === 'jp' ? ['日', '月', '火', '水', '木', '金', '土'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <main>
      <div className="tglMuted" style={{ marginBottom: 10 }}>
        <Link href={`/${country}`}>← {country === 'jp' ? 'トップ' : 'Home'}</Link>
      </div>

      <h1 style={{ fontSize: '1.45rem' }}>{country === 'jp' ? '本日の朝刊' : "Today's briefing"}</h1>
      <div style={{ height: 10 }} />

      <EmptyState
        title={country === 'jp' ? '本日の朝刊はまだ作成されていません。' : "Today's briefing is not ready yet."}
        description={country === 'jp' ? '朝刊は7時に生成されます。' : 'The briefing is generated at 7:00.'}
        action={{ label: country === 'jp' ? '昨日の朝刊を見る' : "View yesterday's briefing", href: `/${country}/daily/${yesterday}` }}
      />

      <div style={{ height: 16 }} />

      <section>
        <Card>
          <CardTitle>{country === 'jp' ? 'カレンダー' : 'Calendar'}</CardTitle>
          <CardMeta style={{ marginTop: 8 }}>
            <span style={{ fontWeight: 700 }}>
              {year}-{String(month).padStart(2, '0')}
            </span>
          </CardMeta>
          <CardContent style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {weekdayLabels.map((w) => (
                <div key={w} style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>
                  {w}
                </div>
              ))}

              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`b-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const info = dayMap.get(date) || null

                // future: no link
                if (date > todayYmd) {
                  return (
                    <div
                      key={date}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '10px 10px 8px',
                        color: 'var(--muted)',
                        background: '#fff',
                        opacity: 0.55,
                      }}
                      title={country === 'jp' ? '未来日付' : 'Future date'}
                    >
                      <div style={{ fontWeight: 700, textAlign: 'center' }}>{day}</div>
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
                    title={country === 'jp' ? `${date}` : date}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontWeight: 700 }}>{day}</div>
                      {info ? (
                        <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{info.status}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
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
    </main>
  )
}


