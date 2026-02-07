import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type DailyDetailResponse, type HomeResponse } from '../../../../lib/tglApi'
import { canonicalUrl, getSiteBaseUrl } from '../../../../lib/seo'
import { getLocaleForCountry, getTranslationsForCountry, type Locale } from '../../../../lib/i18n'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { DailyGenerateButton } from '@/components/daily/DailyGenerateButton'
import { MorningMessagesRotator } from '@/components/daily/MorningMessagesRotator'
import styles from '../../home.module.css'
import { getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import { formatTopicListDate } from '@/lib/topicDate'
import { CACHE_POLICY } from '@/lib/cache-policy'

function countryNameEn(country: 'us' | 'ca' | 'uk' | 'jp'): string {
  if (country === 'us') return 'United States'
  if (country === 'ca') return 'Canada'
  if (country === 'uk') return 'United Kingdom'
  return 'Japan'
}

export async function generateMetadata({ params }: { params: { country: string; date: string } }) {
  const { country, date } = params
  const canonical = canonicalUrl(`/${country}/daily/${date}`)
  const isJa = country === 'jp'

  // country不正・日付不正は最小限（notFoundはpage側で処理）
  if (!isCountry(country) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { title: { absolute: 'The Gentle Light' }, alternates: { canonical } }
  }

  const baseTitle = isJa
    ? `${date}の朝刊｜やさしいニュース The Gentle Light`
    : `Daily Briefing (${countryNameEn(country)}) — ${date} | Calm News — The Gentle Light`
  const baseDesc = isJa
    ? `${date}の主要ニュースを静かな言葉でまとめた朝刊。不安を感じずに世界を知る。`
    : `Daily news briefing for ${date}. Calm, fact-based summary of world events without sensationalism or anxiety.`

  const truncate = (s: string, max: number) => {
    const v = String(s || '').replace(/\s+/g, ' ').trim()
    if (!v) return ''
    if (v.length <= max) return v
    return `${v.slice(0, Math.max(0, max - 1)).trim()}…`
  }

  // daily_digests.messages（3件）を description の末尾へ付与（SEO/クリック時の期待値を上げる）
  const desc = await (async () => {
    try {
      const data = await fetchJson<DailyDetailResponse>(`/v1/${country}/daily/${encodeURIComponent(date)}`, {
        next: { revalidate: CACHE_POLICY.stable },
      })
      const messages = (data.messages || [])
        .slice(0, 3)
        .map((m: any) => String(m?.message || '').trim())
        .filter(Boolean)
      if (!messages.length) return baseDesc
      // 区切り記号は入れず、文同士を自然に繋ぐ（各message側に句読点が入る想定）
      const suffix = messages.join(' ')
      return truncate(`${baseDesc} ${suffix}`, isJa ? 220 : 220)
    } catch {
      return baseDesc
    }
  })()

  return {
    // NOTE:
    // 国別layout側の title template（"... | やさしいニュース The Gentle Light" 等）と二重化しないよう、
    // このページは absolute で固定する。
    title: { absolute: baseTitle },
    description: desc,
    keywords: isJa ? ['朝刊', 'デイリーニュース', '穏やかなニュース', '不安のないニュース'] : ['daily briefing', 'morning news', 'calm news', 'news without anxiety'],
    alternates: { canonical },
  }
}

function formatDailyTitleDateJa(dateLocal: string): string {
  // dateLocal is YYYY-MM-DD. Use timezone-safe formatting.
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  const s = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(d)
  // Use full-width parentheses: （火）
  return s.replace(/\(/g, '（').replace(/\)/g, '）')
}

function shiftDateLocal(dateLocal: string, days: number): string {
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

function formatDailyLabelJaAt6(dateLocal: string): string {
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  const s = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long',
    day: 'numeric',
  }).format(d)
  return `${s} 朝6時時点の作成`
}

function formatDailyMetaLabel(
  dateLocal: string,
  locale: 'ja' | 'en',
  isTodayLocal: boolean
): { meta: string; note: string } {
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  if (locale === 'ja') {
    const md = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
    }).format(d)
    return {
      meta: `作成：${md} 6:00｜${isTodayLocal ? '前日〜今朝のまとめ' : '当日のまとめ'}`,
      note: 'ここを押さえて置けば安心：5分で「1日の全体像」をつかむ朝刊です。',
    }
  }
  const mdEn = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(d)
  return {
    meta: `Created: ${mdEn} 6:00 | ${isTodayLocal ? 'Yesterday to this morning' : 'Summary of this date'}`,
    note: 'We calmly review the key points without sensationalism.',
  }
}

function formatPlannedMetaLabel(dateLocal: string, locale: 'ja' | 'en'): string {
  const d = new Date(`${dateLocal}T00:00:00.000Z`)
  if (locale === 'ja') {
    const md = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
    }).format(d)
    return `作成予定：${md} 7:00`
  }
  const mdEn = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(d)
  return `Planned: ${mdEn} 7:00`
}

function formatDateLabel(dateValue: string, locale: 'ja' | 'en'): string {
  if (!dateValue) return ''
  const date = dateValue.includes('T') ? new Date(dateValue) : new Date(`${dateValue}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return String(dateValue)
  if (locale === 'ja') {
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function normalizeDailyDate(dateValue: string): string {
  if (!dateValue) return ''
  return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue
}

export default async function DailyDetailPage({
  params,
  searchParams,
}: {
  params: { country: string; date: string }
  searchParams?: { from?: string }
}) {
  const { country, date } = params
  if (!isCountry(country)) return notFound()

  // YYYY-MM-DD 以外は404（URL共有が多いので、無理に受けない）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return notFound()

  // 未来日付は閲覧不可（リンクも出さない想定）。直打ちの場合は当日へ誘導。
  const todayYmd = getLocalYmdForCountry(country)
  if (date > todayYmd) {
    return (
      <main>
        <div className="tglMuted" style={{ marginBottom: 10 }}>
          <Link href={`/${country}/daily/${todayYmd}`}>← {country === 'jp' ? '本日の朝刊へ' : "Go to today's briefing"}</Link>
        </div>
        <EmptyState
          title={country === 'jp' ? '未来日付の朝刊は閲覧できません。' : 'Future briefings are not available.'}
          description={country === 'jp' ? '当日の朝刊へ移動します。' : "Redirect to today's briefing."}
          action={{ label: country === 'jp' ? '本日の朝刊へ' : "Go to today's briefing", href: `/${country}/daily/${todayYmd}` }}
        />
      </main>
    )
  }

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)
  // 生成ボタン押下直後に即時反映したいので no-store（キャッシュ無効）
  let data: DailyDetailResponse
  try {
    data = await fetchJson<DailyDetailResponse>(`/v1/${country}/daily/${encodeURIComponent(date)}`, { cache: 'no-store' })
  } catch (e: any) {
    return (
      <main>
        <div className="tglMuted" style={{ marginBottom: 10 }}>
          <Link href={`/${country}/daily`}>← {country === 'jp' ? '朝刊一覧' : 'Morning Briefing'}</Link>
        </div>
        <h1 style={{ fontSize: '1.45rem' }}>
          {country === 'jp'
            ? `${formatDailyTitleDateJa(date)}の朝刊`
            : `Daily Briefing (${countryNameEn(country)}) — ${date}`}
        </h1>
        <div style={{ height: 10 }} />
        <EmptyState
          title={country === 'jp' ? 'APIに接続できません' : 'Cannot reach API'}
          description={String(e?.message || e || '')}
          action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
        />
      </main>
    )
  }
  const isPartial = Boolean(data.meta?.is_partial)
  const locale = lang === 'ja' ? 'ja' : 'en'
  const fromToday = searchParams?.from === 'today'
  const needsFallback = data.daily.status === 'pending' || data.daily.status === 'missing'
  const home = needsFallback
    ? await fetchJson<HomeResponse>(`/v1/${country}/home`, { next: { revalidate: CACHE_POLICY.frequent } })
    : null
  const latestDailyDate = home?.daily_latest?.date_local ?? null
  const plannedMeta = needsFallback ? formatPlannedMetaLabel(date, locale) : null
  const showMeta = !fromToday

  // Section mapping must match API generation logic (thegentlelight-api/src/jobs/daily.ts):
  // - A: main
  // - B: politics/economy (politics|business)
  // - C: bright
  // - D: near-life
  const mainTopic = data.topics.find((x: any) => x.section === 'A') || data.topics.find((x: any) => (x.rank ?? 0) === 1) || null
  const polEconTopic = data.topics.find((x: any) => x.section === 'B') || data.topics.find((x: any) => (x.rank ?? 0) === 2) || null
  const brightTopic = data.topics.find((x: any) => x.section === 'C') || data.topics.find((x: any) => (x.rank ?? 0) === 3) || null
  const nearTopic = data.topics.find((x: any) => x.section === 'D') || data.topics.find((x: any) => (x.rank ?? 0) === 4) || null

  const renderTopicCards = (
    items: Array<any>,
    options: {
      showCategory?: boolean
      datePosition?: 'bottom' | 'topRight'
    } = {}
  ) => {
    if (!items.length) return null
    const showCategory = options.showCategory !== false
    const datePosition = options.datePosition ?? 'bottom'
    return (
      <div className={`${styles.heroGrid} ${styles.dailyHeroGrid}`}>
        {items.map((x: any) => (
          <Link key={x.topic_id} href={`/${country}/news/n/${x.topic_id}`}>
            {(() => {
              const cat = String(x.category || 'unknown')
              const theme = getCategoryBadgeTheme(cat as any)
              const dateLabel = formatTopicListDate(x.last_source_published_at, locale)
              const isHeartwarming = cat === 'heartwarming'
              const distress = Number(x.distress_score ?? 0)
              const showWarning = distress >= 60 || (Boolean(x.high_arousal) && distress >= 30)
              const roleBadgeLabel = x._roleBadgeLabel as string | undefined
              const roleBadgeClassName = x._roleBadgeClassName as string | undefined
              return (
                <Card
                  clickable
                  className={`${styles.topCard}${isHeartwarming ? ` ${styles.topCardHeartwarming}` : ''}`}
                  style={{ ['--cat-color' as any]: theme.color } as any}
                >
                  {dateLabel && datePosition === 'topRight' ? (
                    <span className={`${styles.cardDate} ${styles.cardDateTopRight}`}>{dateLabel}</span>
                  ) : null}
                  {roleBadgeLabel ? (
                    <span className={`${styles.roleBadge} ${roleBadgeClassName || ''}`}>{roleBadgeLabel}</span>
                  ) : null}
                  <CardTitle className={styles.cardTitleAccent}>{x.title}</CardTitle>
                  {x.summary ? (
                    <CardContent style={{ marginTop: '0.25rem' }}>
                      <p className={styles.cardSummary}>{x.summary}</p>
                    </CardContent>
                  ) : null}
                  {showCategory || showWarning ? (
                    <CardMeta style={{ marginTop: '0.5rem' }}>
                      {showCategory ? (
                        <span className={styles.categoryBadge} style={theme}>
                          {getCategoryLabel(cat as any, locale)}
                        </span>
                      ) : null}
                      {showWarning ? (
                        <span className={styles.categoryBadge} style={{ opacity: 0.75 }}>
                          {locale === 'ja' ? '心の負担に注意' : 'May be upsetting'}
                        </span>
                      ) : null}
                    </CardMeta>
                  ) : null}
                  {dateLabel && datePosition === 'bottom' ? <span className={styles.cardDate}>{dateLabel}</span> : null}
                </Card>
              )
            })()}
          </Link>
        ))}
      </div>
    )
  }

  const resolveSourceLabel = (item: any) => {
    const name = String(item?.source_name || '').trim()
    const domain = String(item?.source_domain || '').trim()
    const isBroken = (s: string) => s.includes('�')
    if (name && !isBroken(name)) return name
    if (domain && !isBroken(domain)) return domain
    return ''
  }

  const renderListSection = (options: {
    title: string
    guide: string
    items: Array<any>
    kind: 'heartwarming' | 'important' | 'other'
    rightSlot?: React.ReactNode
  }) => {
    if (!options.items.length) return null
    return (
      <section className={styles.listSection}>
        {sectionHeader(options.title, undefined, { divider: 'top' }, options.rightSlot)}
        <div className={styles.listGuide}>{options.guide}</div>
        <ul className={styles.listItems}>
          {options.items.map((item) => {
            const cat = String(item.category || 'unknown')
            const theme = getCategoryBadgeTheme(cat as any)
            const dateLabel = formatTopicListDate(item.last_source_published_at, locale)
            const sourceLabel = resolveSourceLabel(item)
            return (
              <li key={item.topic_id} className={styles.listItem}>
                <Link className={styles.listItemLink} href={`/${country}/news/n/${item.topic_id}`}>
                  <div className={`${styles.listTitle} ${styles.listTitleAccent}`} style={{ ['--cat-color' as any]: theme.color } as any}>
                    {item.title}
                  </div>
                  {options.kind === 'heartwarming' ? (
                    sourceLabel || dateLabel ? (
                      <div className={styles.listMeta}>
                        {sourceLabel ? <span>{sourceLabel}</span> : null}
                        {dateLabel ? <span>{dateLabel}</span> : null}
                      </div>
                    ) : null
                  ) : options.kind === 'important' ? (
                    <div className={styles.listMeta}>
                      <span className={`${styles.categoryBadge} ${styles.listBadge}`} style={theme}>
                        {getCategoryLabel(cat as any, locale)}
                      </span>
                    </div>
                  ) : options.kind === 'other' ? (
                    sourceLabel || dateLabel ? (
                      <div className={styles.listMeta}>
                        <span className={styles.listCategoryText} style={{ ['--cat-color' as any]: theme.color } as any}>
                          {getCategoryLabel(cat as any, locale)}
                        </span>
                        {sourceLabel ? <span>{sourceLabel}</span> : null}
                        {dateLabel ? <span>{dateLabel}</span> : null}
                      </div>
                    ) : (
                      <div className={styles.listMeta}>
                        <span className={styles.listCategoryText} style={{ ['--cat-color' as any]: theme.color } as any}>
                          {getCategoryLabel(cat as any, locale)}
                        </span>
                      </div>
                    )
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  const sectionHeader = (
    title: string,
    moreHref?: string,
    options: { divider?: 'top' | 'bottom' | 'none' } = {},
    rightSlot?: React.ReactNode
  ) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
        ...(options.divider === 'top'
          ? { borderTop: '1px solid rgba(0, 0, 0, 0.22)', paddingTop: 15, marginTop: 15 }
          : options.divider === 'bottom'
            ? { borderBottom: '1px solid rgba(0, 0, 0, 0.22)', paddingBottom: 8 }
            : {}),
        marginBottom: 10,
      }}
    >
      <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
      {rightSlot ? (
        rightSlot
      ) : moreHref ? (
        <Link href={moreHref} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
          {t.pages.home.seeMore}
        </Link>
      ) : (
        <span />
      )}
    </div>
  )

  const isTodayLocal = date === getLocalYmdForCountry(country)
  const briefHeadline = locale === 'ja'
    ? isTodayLocal
      ? '昨日〜今朝の朝刊（直近24時間）'
      : `この日の朝刊（${formatDailyLabelJaAt6(date)}）`
    : isTodayLocal
      ? 'Daily briefing (last 24 hours)'
      : 'Briefing for this date (last 24 hours)'
  const meta = formatDailyMetaLabel(date, locale, isTodayLocal)

  const dailySummaryTopics = [
    mainTopic
      ? {
          ...mainTopic,
          _roleBadgeLabel:
            locale === 'ja' ? (isTodayLocal ? '今日のトップニュース' : 'この日のトップニュース') : isTodayLocal ? "Today's top news" : 'Top news of the day',
          _roleBadgeClassName: styles.roleBadgeToday,
        }
      : null,
    nearTopic
      ? {
          ...nearTopic,
          _roleBadgeLabel:
            locale === 'ja' ? (isTodayLocal ? '今日の身近な出来事' : 'この日の身近な出来事') : isTodayLocal ? "Today's local news" : 'Local news of the day',
          _roleBadgeClassName: styles.roleBadgeLife,
        }
      : null,
    brightTopic
      ? {
          ...brightTopic,
          _roleBadgeLabel:
            locale === 'ja' ? (isTodayLocal ? '今日の明るい話題' : 'この日の明るい話題') : isTodayLocal ? "Today's bright topic" : 'Bright topic of the day',
          _roleBadgeClassName: styles.roleBadgeProgress,
        }
      : null,
    polEconTopic
      ? {
          ...polEconTopic,
          _roleBadgeLabel:
            locale === 'ja' ? (isTodayLocal ? '今日の政治・経済' : 'この日の政治・経済') : isTodayLocal ? "Today's politics & economy" : 'Politics & economy of the day',
          _roleBadgeClassName: styles.roleBadgeIssues,
        }
      : null,
  ].filter(Boolean)

  const latestDailyLabel = formatDateLabel(date, locale)

  return (
    <main style={{ position: 'relative' }}>
      {showMeta ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            fontSize: '0.85rem',
            color: 'var(--muted)',
          }}
        >
          {plannedMeta ?? meta.meta}
        </div>
      ) : null}
      <div className="tglMuted" style={{ marginBottom: 10 }}>
        <Link href={`/${country}/daily`}>← {country === 'jp' ? '朝刊一覧' : 'Morning Briefing'}</Link>
      </div>

      {fromToday ? (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 14,
              padding: '8px 12px',
              fontSize: '0.88rem',
              color: 'var(--muted)',
              display: 'inline-block',
              lineHeight: 1.55,
            }}
          >
            {country === 'jp' ? (
              <>
                <div style={{ color: 'var(--text)', fontWeight: 600 }}>今日の朝刊は準備中です。</div>
                <div style={{ color: 'var(--mutedText)' }}>
                  いまは直近の朝刊（{latestDailyLabel}）を表示しています（完成後に今日の朝刊へ切り替わります）。
                </div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--text)', fontWeight: 600 }}>Today&apos;s briefing is being prepared.</div>
                <div style={{ color: 'var(--mutedText)' }}>
                  We&apos;re showing the latest briefing ({latestDailyLabel}) now and will switch to today&apos;s briefing once
                  it&apos;s ready.
                </div>
              </>
            )}
          </div>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              color: 'var(--muted)',
              fontSize: '0.88rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true" style={{ fontSize: '0.9rem' }}>
                💡
              </span>
              <Link href={`/${country}/daily`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                {country === 'jp' ? '朝刊一覧へ（日付で選ぶ）' : 'Browse briefings by date'}
              </Link>
            </div>
          </div>
          <div style={{ marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)' }} />
        </div>
      ) : null}

      <h1 style={{ fontSize: '1.45rem' }}>
        {country === 'jp'
          ? `${formatDailyTitleDateJa(date)}の朝刊`
          : `Daily Briefing (${countryNameEn(country)}) — ${date}`}
      </h1>
      <div style={{ height: 6 }} />
      <div style={{ fontSize: '0.98rem', lineHeight: 1.6, color: 'var(--text)', marginBottom: 10 }}>{meta.note}</div>

      {data.daily.status === 'failed' ? (
        <>
          <EmptyState
            title={country === 'jp' ? '朝刊の生成に失敗しました' : 'Morning briefing generation failed'}
            description={country === 'jp' ? 'しばらくしてからもう一度ご覧ください。' : 'Please try again later.'}
            action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
          />
        </>
      ) : data.daily.status === 'pending' || data.daily.status === 'missing' ? (
        <>
          <div style={{ height: 6 }} />
          <Card>
            <CardTitle>{country === 'jp' ? 'この日の朝刊は、まだ準備中です。' : 'This briefing is still being prepared.'}</CardTitle>
            <CardContent style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.6 }}>
              {country === 'jp'
                ? '作成が完了し次第、ここに表示されます。よければ、次のいずれかをご利用ください。'
                : 'It will appear here once ready. In the meantime, choose one of the options below.'}
              <div style={{ marginTop: 8, fontSize: '0.88rem' }}>
                {country === 'jp' ? '朝刊は毎朝7時ごろに更新されます。' : 'Briefings are updated around 7 AM local time.'}
              </div>
            </CardContent>
          </Card>
          <div style={{ height: 12 }} />
          <div className={styles.guideGrid}>
            <Link
              href={latestDailyDate ? `/${country}/daily/${normalizeDailyDate(latestDailyDate)}` : `/${country}/daily`}
              className={styles.guideCardLink}
            >
              <div className={styles.guideCard} style={{ borderColor: 'var(--accent)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {country === 'jp' ? '🗞 直近の朝刊を見る' : '🗞 Latest briefing'}
                </div>
                <div className="tglMuted" style={{ fontSize: '0.92rem' }}>
                  {latestDailyDate
                    ? country === 'jp'
                      ? `${formatDateLabel(latestDailyDate, 'ja')}の朝刊へ`
                      : `Go to the briefing for ${formatDateLabel(latestDailyDate, 'en')}`
                    : country === 'jp'
                      ? '最新の朝刊へ'
                      : 'Go to the most recent briefing.'}
                </div>
              </div>
            </Link>
            <Link href={`/${country}/daily`} className={styles.guideCardLink}>
              <div className={styles.guideCard}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {country === 'jp' ? '📅 朝刊一覧で日付を選ぶ' : '📅 Pick a date'}
                </div>
                <div className="tglMuted" style={{ fontSize: '0.92rem' }}>
                  {country === 'jp' ? 'カレンダーから朝刊を選べます' : 'Choose from the calendar.'}
                </div>
              </div>
            </Link>
            <Link href={`/${country}`} className={styles.guideCardLink}>
              <div className={styles.guideCard}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {country === 'jp' ? '📰 最新のトップニュース4選を見る' : "📰 Latest top news"}
                </div>
                <div className="tglMuted" style={{ fontSize: '0.92rem' }}>
                  {country === 'jp' ? 'やさしいニューストップページへ' : 'Go to the gentle news top page.'}
                </div>
              </div>
            </Link>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 12 }} />

          <section style={{ marginBottom: '1.5rem' }}>
            {data.messages?.length ? (
              <>
                <MorningMessagesRotator
                  country={country}
                  messages={data.messages}
                  intervalMs={5000}
                  title={locale === 'ja' ? (isTodayLocal ? '今日の一言' : 'この日の一言') : isTodayLocal ? "Today's note" : 'Note of the day'}
                />
                <div style={{ height: 10 }} />
              </>
            ) : null}
            {sectionHeader(locale === 'ja' ? '1日まとめニュース' : '5-minute news')}
            {renderTopicCards(dailySummaryTopics as any[], { showCategory: false, datePosition: 'topRight' })}
          </section>

          {renderListSection({
            title: locale === 'ja' ? `🤍 心温まる話（${data.heartwarming_topics?.length ?? 0}）` : `🤍 Heartwarming (${data.heartwarming_topics?.length ?? 0})`,
            guide: locale === 'ja' ? '気持ちがほどける出来事を、2つだけ。' : 'Two gentle moments to soften the day.',
            items: Array.isArray(data.heartwarming_topics) ? data.heartwarming_topics : [],
            kind: 'heartwarming',
            rightSlot: (
              <Link className={styles.listMore} href={`/${country}/category/heartwarming`}>
                {locale === 'ja' ? '心温まる話をもっと見る →' : 'See more heartwarming →'}
              </Link>
            ),
          })}

          {renderListSection({
            title: locale === 'ja'
              ? `その他、この日にあった出来事（${data.important_topics?.length ?? 0}）`
              : `Other events of the day (${data.important_topics?.length ?? 0})`,
            guide: locale === 'ja' ? 'その日の出来事を短くまとめておきます。' : "Other events worth noting, briefly.",
            items: Array.isArray(data.important_topics) ? data.important_topics : [],
            kind: 'other',
            rightSlot: (
              <Link className={styles.listMore} href={`/${country}/news`}>
                {locale === 'ja' ? 'ニュース一覧へ →' : 'See all news →'}
              </Link>
            ),
          })}

          <section style={{ marginTop: '1.5rem' }}>
            {sectionHeader(
              locale === 'ja' ? 'ひと息ついたら、次へ' : 'Take a breath, then continue',
              undefined,
              { divider: 'top' }
            )}
            <div className={styles.listGuide}>
              {locale === 'ja' ? '朝刊を読み終えた方、続けて読むならこちら' : 'After the briefing, pick what you want to read next.'}
            </div>
            <div className={styles.guideGrid}>
              <Link href={`/${country}/category/heartwarming`} className={styles.guideCardLink}>
                <div className={styles.guideCard}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{locale === 'ja' ? '🤍 心温まる話を読む' : '🤍 Read heartwarming'}</div>
                  <div className="tglMuted" style={{ fontSize: '0.92rem' }}>
                    {locale === 'ja' ? '気持ちがほどける話だけを集めました' : 'Only gentle, heartwarming stories.'}
                  </div>
                </div>
              </Link>
              <Link href={`/${country}/columns`} className={styles.guideCardLink}>
                <div className={styles.guideCard}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{locale === 'ja' ? '📝 やさしいコラムへ' : '📝 Go to columns'}</div>
                  <div className="tglMuted" style={{ fontSize: '0.92rem' }}>
                    {locale === 'ja' ? 'やさしい視点で、日々を整える短いコラム' : 'Short columns to steady your day.'}
                  </div>
                </div>
              </Link>
              <Link href={`/${country}/daily`} className={styles.guideCardLink}>
                <div className={styles.guideCard}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{locale === 'ja' ? '📅 他の日の朝刊を見る' : '📅 See other briefings'}</div>
                  <div className="tglMuted" style={{ fontSize: '0.92rem' }}>
                    {locale === 'ja' ? '朝刊一覧から選べます' : 'Pick from the briefing list.'}
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {isPartial && <PartialNotice country={country} />}
        </>
      )}

      {/* 管理者向け：生成/再生成ボタンはページ最下部にまとめる */}
      {data.daily.status !== 'pending' ? (
        <div style={{ marginTop: 16 }}>
          <DailyGenerateButton country={country} dateLocal={date} dailyStatus={String(data.daily.status)} />
        </div>
      ) : null}
    </main>
  )
}


