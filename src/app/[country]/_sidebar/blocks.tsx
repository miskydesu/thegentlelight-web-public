import Link from 'next/link'
import { fetchJson, type DailyListResponse, type ApiMeta } from '@/lib/tglApi'
import { ViewSwitch } from '@/components/layout/ViewSwitch'
import viewSwitchStyles from '@/components/layout/ViewSwitch.module.css'
import styles from '../layout.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'

type ColumnsResponse = {
  columns: Array<{
    column_id: string
    title: string | null
    excerpt: string | null
    cover_image_key: string | null
    published_at: string | null
    updated_at?: string | null
    column_name?: {
      column_name_id: string
      name?: string
    } | null
  }>
  meta: ApiMeta
}

type QuotesResponse = {
  quotes: Array<{
    quote_id: string
    author_name: string | null
    source_text: string | null
    quote_text: string | null
    note: string | null
    tags: string[]
    created_at: string | null
    updated_at: string | null
  }>
  meta: ApiMeta
}

function joinUrl(base: string, key: string): string {
  const b = base.replace(/\/+$/, '')
  const k = key.replace(/^\/+/, '')
  return `${b}/${k}`
}

function hashStringToInt(s: string): number {
  // シンプルな文字列ハッシュ（安定・軽量）
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return h
}

function ymdFromDateLocal(dateLocal: string): string {
  // APIから Date のISO文字列が来る想定（YYYY-MM-DD...）
  return String(dateLocal || '').slice(0, 10)
}

function buildMonthCalendar(year: number, month: number) {
  // UTCで扱う（dateLocalはYYYY-MM-DDで日付がズレにくい）
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay() // 0..6
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { firstDow, daysInMonth }
}

function getLocalYmdForCountry(country: 'us' | 'uk' | 'ca' | 'jp', now: Date = new Date()): string {
  const tz: Record<string, string> = {
    us: 'America/New_York',
    ca: 'America/Toronto',
    uk: 'Europe/London',
    jp: 'Asia/Tokyo',
  }
  const timeZone = tz[country] || 'UTC'
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export async function SidebarGentleIntro({ country }: { country: 'us' | 'uk' | 'ca' | 'jp' }) {
  const WELCOME_COLUMN_NAME_ID = 'mkcfunk9k7yk9nymsug0000000'
  const title = country === 'jp' ? 'The Gentle Lightへようこそ' : 'Welcome to The Gentle Light'
  const desc =
    country === 'jp'
      ? '当サイトでは、心の負担が少ないニュースを優先して表示しております。更にGentleModeをONにする事で負担が大きいニュースを自動的に非表示にすることが出来ます。'
      : 'This site prioritizes stories that may feel less emotionally intense.\nTurn Gentle Mode ON to automatically hide stories that may feel more upsetting.'

  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''
  const isWelcomeColumn = (c: ColumnsResponse['columns'][number]) => {
    const nameId = c.column_name?.column_name_id ? String(c.column_name.column_name_id) : ''
    return nameId === WELCOME_COLUMN_NAME_ID
  }

  // NOTE: show all "welcome" columns under the switch, oldest-first.
  const welcomeColumns = await (async () => {
    try {
      const d = await fetchJson<ColumnsResponse>(`/v1/${country}/columns?limit=100`, { next: { revalidate: CACHE_POLICY.stable } })
      const cols = (d.columns || []).filter(isWelcomeColumn)
      cols.sort((a, b) => {
        const ax = a.published_at || a.updated_at || ''
        const ay = b.published_at || b.updated_at || ''
        if (!ax && !ay) return String(a.column_id).localeCompare(String(b.column_id))
        if (!ax) return -1
        if (!ay) return 1
        return ax.localeCompare(ay) // oldest first
      })
      return cols
    } catch {
      return []
    }
  })()
  const welcomeColumnName = (() => {
    const first = welcomeColumns[0]
    const name = first?.column_name?.name ? String(first.column_name.name) : ''
    return name.trim()
  })()

  return (
    <div className={styles.sidebarCard}>
      <div className={styles.sidebarTitle} style={{ marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.55 }}>
        {desc.split('\n').map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <ViewSwitch className={viewSwitchStyles.sidebarOffset} />
      </div>

      {/* Welcome columns (oldest first) */}
      <div style={{ marginTop: 12 }}>
        {welcomeColumnName ? (
          <div style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>{welcomeColumnName}</div>
        ) : null}
        {welcomeColumns.length ? (
          <div className={styles.sidebarList}>
            {welcomeColumns.map((c) => (
              <Link key={c.column_id} className={styles.sidebarItemLink} href={`/${country}/columns/${c.column_id}`}>
                <div className={styles.sidebarItemRow}>
                  {imageBase && c.cover_image_key ? (
                    <img
                      className={styles.sidebarThumb}
                      src={joinUrl(imageBase, c.cover_image_key) + (c.published_at ? `?v=${encodeURIComponent(c.published_at)}` : '')}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.sidebarThumb} />
                  )}
                  <div className={styles.sidebarItemText}>
                    <div className={styles.sidebarItemTitle}>{c.title || '(no title)'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export async function SidebarLatestColumns({ country }: { country: 'us' | 'uk' | 'ca' | 'jp' }) {
  const WELCOME_COLUMN_NAME_ID = 'mkcfunk9k7yk9nymsug0000000'
  const data = await fetchJson<ColumnsResponse>(`/v1/${country}/columns?limit=12`, { next: { revalidate: CACHE_POLICY.stable } })
  const heading = country === 'jp' ? '最新コラム' : 'Latest columns'
  const more = country === 'jp' ? '一覧へ' : 'See all'
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  const isExcluded = (c: ColumnsResponse['columns'][number]) => {
    const nameId = c.column_name?.column_name_id ? String(c.column_name.column_name_id) : ''
    return nameId === WELCOME_COLUMN_NAME_ID
  }
  const latest = (data.columns || []).filter((c) => !isExcluded(c)).slice(0, 3)

  return (
    <div className={styles.sidebarCard}>
      <div className={styles.sidebarTitleRow}>
        <div className={styles.sidebarTitle}>{heading}</div>
        <Link className={styles.sidebarTitleSmallLink} href={`/${country}/columns`}>
          {more} →
        </Link>
      </div>

      {latest.length ? (
        <div className={styles.sidebarList}>
          {latest.map((c) => (
            <Link key={c.column_id} className={styles.sidebarItemLink} href={`/${country}/columns/${c.column_id}`}>
              <div className={styles.sidebarItemRow}>
                {imageBase && c.cover_image_key ? (
                  <img
                    className={styles.sidebarThumb}
                    src={joinUrl(imageBase, c.cover_image_key) + (c.published_at ? `?v=${encodeURIComponent(c.published_at)}` : '')}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.sidebarThumb} />
                )}
                <div className={styles.sidebarItemText}>
                  <div className={styles.sidebarItemTitle}>{c.title || '(no title)'}</div>
                  <div className={styles.sidebarItemMeta}>
                    {c.published_at ? new Date(c.published_at).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.sidebarMuted}>{country === 'jp' ? 'まだコラムがありません。' : 'No columns yet.'}</div>
      )}
    </div>
  )
}

export async function SidebarQuoteOfDay({ country }: { country: 'us' | 'uk' | 'ca' | 'jp' }) {
  // ある程度の件数を取得して、その中から日替わりで1つ選ぶ（APIにランダム取得が無い想定）
  const data = await fetchJson<QuotesResponse>(`/v1/${country}/quotes?limit=50`, { next: { revalidate: CACHE_POLICY.stable } })
  const heading = country === 'jp' ? '今日の名言' : 'Quote of the day'
  const more = country === 'jp' ? '検索へ' : 'Search'

  const quotes = data.quotes || []
  const dateKey = new Date().toISOString().slice(0, 10) // 日替わり（UTC基準）
  const idx = quotes.length ? Math.abs(hashStringToInt(`${country}:${dateKey}`)) % quotes.length : 0
  const q = quotes[idx]

  return (
    <div className={styles.sidebarCard}>
      <div className={styles.sidebarTitleRow}>
        <div className={styles.sidebarTitle}>{heading}</div>
        <Link className={styles.sidebarTitleSmallLink} href={`/${country}/quotes`}>
          {more} →
        </Link>
      </div>

      {q?.quote_id ? (
        <Link className={styles.quoteLink} href={`/${country}/quotes/${q.quote_id}`}>
          <p className={styles.quoteText}>{q.quote_text || '—'}</p>
          <div className={styles.quoteAuthor}>
            {q.author_name ? q.author_name : '—'}
            {q.source_text ? ` / ${q.source_text}` : ''}
          </div>
        </Link>
      ) : (
        <div className={styles.sidebarMuted}>{country === 'jp' ? 'まだ名言がありません。' : 'No quotes yet.'}</div>
      )}
    </div>
  )
}

export async function SidebarDailyCalendar({ country }: { country: 'us' | 'uk' | 'ca' | 'jp' }) {
  // 日報生成直後の反映を優先（サイドバーもキャッシュ無効）
  const data = await fetchJson<DailyListResponse>(`/v1/${country}/daily`, { cache: 'no-store' })
  const heading = country === 'jp' ? '朝刊カレンダー' : 'Morning briefing calendar'
  const more = country === 'jp' ? '朝刊一覧へ' : 'All briefings'

  // この月のデータが返ってくる想定。先頭から年/月を推定する（なければ現在月）。
  const first = data.days?.[0]?.dateLocal ? ymdFromDateLocal(data.days[0].dateLocal) : null
  const year = first ? Number(first.slice(0, 4)) : new Date().getUTCFullYear()
  const month = first ? Number(first.slice(5, 7)) : new Date().getUTCMonth() + 1
  const { firstDow, daysInMonth } = buildMonthCalendar(year, month)

  const ymdToInfo = new Map<string, { status: string; topicCount: number; updatedAt: string | null }>()
  for (const d of data.days || []) {
    const ymd = ymdFromDateLocal(d.dateLocal)
    ymdToInfo.set(ymd, { status: String(d.status || ''), topicCount: Number(d.topicCount || 0), updatedAt: d.updatedAt ?? null })
  }

  const dow = country === 'jp' ? ['日', '月', '火', '水', '木', '金', '土'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const todayYmd = getLocalYmdForCountry(country)

  const blanks = Array.from({ length: firstDow }, () => null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const cells = [...blanks, ...days]

  return (
    <div className={styles.sidebarCard}>
      <div className={styles.sidebarTitleRow}>
        <div className={styles.sidebarTitle}>
          {heading} <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{year}-{String(month).padStart(2, '0')}</span>
        </div>
        <Link className={styles.sidebarTitleSmallLink} href={`/${country}/daily`}>
          {more} →
        </Link>
      </div>

      <div className={styles.calendarDow}>
        {dow.map((x, i) => (
          <div key={`${i}-${x}`} style={{ textAlign: 'center' }}>
            {x}
          </div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`b-${idx}`} className={styles.calendarCell} />
          const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const info = ymdToInfo.get(ymd)
          const isToday = ymd === todayYmd
          const className = `${styles.calendarCellLink}${isToday ? ` ${styles.calendarCellToday}` : ''}`

          // 未来日はリンクしない
          if (ymd > todayYmd) {
            return (
              <div
                key={ymd}
                className={styles.calendarCell}
                style={{ color: 'var(--muted)', background: 'transparent', cursor: 'default' }}
                title={country === 'jp' ? '未来日付' : 'Future date'}
              >
                <div>{day}</div>
                <div className={styles.calendarDotRow}>
                  <span className={styles.calendarDot} style={{ opacity: 0.2 }} />
                </div>
              </div>
            )
          }

          // 日報が無い日でも詳細ページは表示できる（missingを返す設計）ので、同じURLにリンクする
          if (!info) {
            return (
              <Link
                key={ymd}
                href={`/${country}/daily/${ymd}`}
                className={className}
                style={{ color: 'var(--muted)', background: 'transparent' }}
                title={country === 'jp' ? `${ymd}（未生成）` : `${ymd} (not generated)`}
              >
                <div>{day}</div>
                <div className={styles.calendarDotRow}>
                  <span className={styles.calendarDot} />
                </div>
              </Link>
            )
          }

          const isReady = info.status === 'ready' || info.topicCount > 0
          return (
            <Link key={ymd} href={`/${country}/daily/${ymd}`} className={className} title={`${ymd} (${info.topicCount})`}>
              <div>{day}</div>
              <div className={styles.calendarDotRow}>
                <span className={`${styles.calendarDot}${isReady ? ` ${styles.calendarDotReady}` : ''}`} />
              </div>
            </Link>
          )
        })}
      </div>

      <div className={styles.sidebarMuted}>
        {country === 'jp' ? '日付を押すと、その日の「日報」にジャンプします。' : 'Tap a date to open that day’s digest.'}
      </div>
    </div>
  )
}


