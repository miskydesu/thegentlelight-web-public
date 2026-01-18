import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type LatestResponse, type TopicsResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { NewsSearchForm } from '@/components/news/NewsSearchForm'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getGentleFromSearchParams, getAllowImportantFromSearchParams } from '@/lib/view-switch'
import { formatTopicListDate } from '@/lib/topicDate'
import { getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import styles from './news.module.css'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'
// 表示はsoft一本（UX方針）

// Categories are handled by dedicated category pages (/category/[category]).

type RecentUpdateItem = {
  topic_id: string
  title: string
  excerpt: string | null
  last_seen_at: string | null
  last_source_published_at: string | null
  importance_score: number | null
  source_count: number
  category: string
  event_type: string | null
}

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { q?: string; category?: string; gentle?: string; cursor?: string; limit?: string }
}) {
  const country = params.country
  const query = searchParams.q || ''
  const isJa = country === 'jp'
  const canonical = canonicalUrl(`/${country}/news`)

  // フィルタ付き（検索語や絞り込み等）は hreflang を付けない（意図の同一性が担保しにくい）
  const hasFilter = Boolean(searchParams.q || searchParams.category || searchParams.gentle || searchParams.cursor || searchParams.limit)
  const hreflang = hasFilter ? null : generateHreflang('/news')
  if (hasFilter) {
    return {
      title: query ? (isJa ? `検索: ${query}` : `Search: ${query}`) : (isJa ? 'ニュース検索' : 'Search'),
      description: query ? (isJa ? `検索結果: ${query}` : `Search results for: ${query}`) : undefined,
      robots: { index: false, follow: true, googleBot: { index: false, follow: true } }, // クエリ無限のため noindex 推奨
      alternates: { canonical },
    }
  }

  return {
    title: isJa ? 'ニュース一覧' : 'Browse Calm News by Topic',
    description: isJa
      ? 'やさしいニュース一覧。穏やかで、煽られない・不安にならない。心が落ち着く、静かなニュースをカテゴリ別に。'
      : 'Browse gentle news organized by category. World news without anxiety, stress, or doomscrolling.',
    keywords: isJa
      ? [
          'やさしいニュース',
          '優しいニュース',
          '穏やかなニュース',
          '煽られないニュース',
          '不安にならないニュース',
          '心が落ち着くニュース',
          '静かなニュース',
          'ニュース一覧',
          'カテゴリ別ニュース',
          'ニュース疲れ',
        ]
      : ['browse news', 'organized news', 'news by topic', 'gentle news', 'calm news alternatives'],
    alternates: {
      canonical,
      ...(hreflang ? { languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])) } : {}),
    },
  }
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { q?: string; category?: string; gentle?: string; allow_important?: string; cursor?: string; limit?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const query = searchParams.q || ''
  const category = searchParams.category || ''
  const t = getTranslationsForCountry(country, lang)
  const gentle = getGentleFromSearchParams(searchParams)
  const allowImportant = getAllowImportantFromSearchParams(searchParams)
  const locale = lang === 'ja' ? 'ja' : 'en'

  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
  const defaultLimit = 10
  const limit = Number.isFinite(Number(searchParams.limit)) ? Math.min(100, Math.max(1, Math.trunc(Number(searchParams.limit)))) : defaultLimit
  const gentleQs = gentle ? `?gentle=1${allowImportant ? '' : '&allow_important=0'}` : ''
  const isDefaultView = !query && !category && cursor === 0

  const recentUpdates = isDefaultView
    ? await fetchJson<{ topics: RecentUpdateItem[] }>(
        `/v1/${country}/news/recent-updates?limit=3${gentle ? `&gentle=1${allowImportant ? '' : '&allow_important=0'}` : ''}`,
        { next: { revalidate: CACHE_POLICY.frequent } }
      ).catch(() => ({ topics: [] }))
    : { topics: [] as RecentUpdateItem[] }

  const formatUpdatedAgo = (iso: string | null): string | null => {
    if (!iso) return null
    const ts = new Date(iso).getTime()
    if (!Number.isFinite(ts) || ts <= 0) return null
    const diffMs = Date.now() - ts
    if (!Number.isFinite(diffMs) || diffMs < 0) return null
    const mins = Math.floor(diffMs / (60 * 1000))
    const hours = Math.floor(diffMs / (60 * 60 * 1000))
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    if (locale === 'ja') {
      if (days < 1) {
        if (mins < 10) return '最終更新 たった今'
        if (mins < 60) return `最終更新 ${Math.floor(mins / 10) * 10}分前`
        if (hours < 6) return `最終更新 ${hours}時間前`
        return '最終更新 本日'
      }
      if (days === 1) return '最終更新 昨日'
      return `最終更新 ${new Date(ts).toLocaleDateString('ja-JP')}`
    }
    if (days < 1) {
      if (mins < 10) return 'Last updated just now'
      if (mins < 60) return `Last updated ${Math.floor(mins / 10) * 10}m ago`
      if (hours < 6) return `Last updated ${hours}h ago`
      return 'Last updated today'
    }
    if (days === 1) return 'Last updated yesterday'
    return `Last updated ${new Date(ts).toLocaleDateString('en-US')}`
  }
  // デフォルト表示は「最新（時系列）」を優先し、新しい順を担保する
  // - q（検索語）がある場合のみ /topics（棚検索）を使う（/latest は q を受けないため）
  const apiPath = query
    ? `/v1/${country}/topics?limit=${limit}&cursor=${cursor}${gentle ? `&gentle=1` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`
    : `/v1/${country}/latest?limit=${limit}&cursor=${cursor}${gentle ? `&gentle=1` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`

  const data = query
    ? await fetchJson<TopicsResponse>(apiPath, { next: { revalidate: CACHE_POLICY.frequent } })
    : await fetchJson<LatestResponse>(apiPath, { next: { revalidate: CACHE_POLICY.frequent } })

  const topics = data.topics
  const isPartial = Boolean(data.meta?.is_partial)
  const hasNext = topics.length === limit
  const hasPrev = cursor > 0
  const start = topics.length > 0 ? cursor + 1 : 0
  const end = cursor + topics.length

  const buildUrl = (nextCursor: number) => {
    const sp = new URLSearchParams()
    if (query) sp.set('q', query)
    if (category) sp.set('category', category)
    if (gentle) sp.set('gentle', '1')
    if (limit !== 30) sp.set('limit', String(limit))
    if (nextCursor > 0) sp.set('cursor', String(nextCursor))
    const qs = sp.toString()
    return `/${country}/news${qs ? `?${qs}` : ''}`
  }
  const hour = new Date().getHours()
  const emphasizeKey = hour >= 18 ? 'heartwarming' : 'briefing'

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>{country === 'jp' ? 'ニュース一覧' : 'Browse News'}</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        {isPartial && <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>}
        </div>
      </div>

      <div style={{ height: 12 }} />

      {/* /news の「重心」：まず安心できる足場（フィルタ無し初期表示だけ） */}
      {isDefaultView ? (
        <>
          {/* レイヤーA（静的・説明）：テキストだけ。導線/検索と同じ重要度に見せない */}
          <div style={{ marginTop: 2, marginBottom: 14 }}>
            <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.65 }}>
              {locale === 'ja' ? (
                <>
                  世界のニュースを、分野や関心ごとから探せます。
                  <br />
                  気になる話題だけ、静かに追ってください。
                </>
              ) : (
                <>
                  Browse world news by topic and interest.
                  <br />
                  Follow only what matters to you—calmly.
                </>
              )}
            </div>
          </div>
        </>
      ) : null}

      <NewsSearchForm country={country} initialQuery={query} initialCategory={category} />

      <div style={{ height: 18 }} />
      {isDefaultView ? <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} /> : null}
      <div style={{ height: 18 }} />

      {/* /news の唯一の編集枠: 最近、動きがあった話（初期表示のみ / 3〜6件の上限固定） */}
      {isDefaultView && (recentUpdates.topics || []).length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>
              {locale === 'ja' ? '今日の少し気になる動き' : 'Today’s calm updates'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', opacity: 0.75 }}>
              {locale === 'ja' ? '今日' : 'Today'}
            </div>
          </div>
          <div style={{ height: 10 }} />
          <div style={{ display: 'grid', gap: 10 }}>
            {recentUpdates.topics.slice(0, 3).map((x) => {
              const updated = formatUpdatedAgo(x.last_source_published_at ?? x.last_seen_at)
              return (
                <Link
                  key={x.topic_id}
                  href={`/${country}/news/n/${x.topic_id}${gentleQs}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    border: '1px solid var(--border)',
                    background: '#fff',
                    borderRadius: 14,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, lineHeight: 1.35 }}>{x.title}</div>
                  </div>
                  {x.excerpt ? (
                    <div style={{ marginTop: 6 }}>
                      <p
                        className={styles.cardSummary}
                        style={{ color: 'var(--muted)', opacity: 0.85, lineHeight: 1.45 }}
                      >
                        {x.excerpt}
                      </p>
                    </div>
                  ) : null}
                  {updated ? (
                    <div style={{ marginTop: 6, textAlign: 'right', fontSize: '0.82rem', color: 'var(--text)', fontWeight: 700 }}>
                      {updated}
                    </div>
                  ) : null}
                </Link>
              )
            })}
          </div>
          <div style={{ height: 14 }} />
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} />
          <div style={{ height: 18 }} />
        </>
      ) : null}

      {(query || category) && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            {t.pages.news.searchResults}:
            {query ? ` 「${query}」` : ''}
            {category ? ` / ${getCategoryLabel(category, locale)}` : ''}
            {start && end ? `（${start}-${end}）` : ''}
          </p>
        </div>
      )}

      {isDefaultView && !(query || category) ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>{locale === 'ja' ? '最新のニュース' : 'Latest news'}</div>
            {start && end ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {locale === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`}
              </div>
            ) : null}
          </div>
          <div style={{ height: 10 }} />
        </>
      ) : null}

      {topics.length > 0 ? (
        <>
          <div className={styles.listGrid}>
            {topics.map((x) => (
              <Link key={x.topic_id} href={`/${country}/news/n/${x.topic_id}`}>
                {(() => {
                  const theme = getCategoryBadgeTheme(x.category)
                  const isHeartwarming = x.category === 'heartwarming'
                  return (
                    <Card
                      clickable
                      className={`${styles.topCard} ${isHeartwarming ? styles.topCardHeartwarming : ''}`}
                      style={{ ['--cat-color' as any]: theme.color } as any}
                    >
                      <CardTitle className={styles.cardTitleAccent}>{x.title}</CardTitle>
                      {x.summary ? (
                        <CardContent style={{ marginTop: '0.25rem' }}>
                          <p className={styles.cardSummary}>{x.summary}</p>
                        </CardContent>
                      ) : null}
                      <CardMeta style={{ marginTop: '0.5rem', columnGap: 0, rowGap: 0 }}>
                        <span className={`${styles.categoryBadge} ${styles.metaItem}`} style={theme}>
                          {getCategoryLabel(x.category, locale)}
                        </span>
                        {(() => {
                          const distress = Number(x.distress_score ?? 0)
                          return distress >= 60 || (Boolean(x.high_arousal) && distress >= 30)
                        })() ? (
                          <span className={`${styles.categoryBadge} ${styles.metaItem}`} style={{ opacity: 0.75 }}>
                            {locale === 'ja' ? '心の負担に注意' : 'May be upsetting'}
                          </span>
                        ) : null}
                        <span className={`${styles.sourceCountPill} ${styles.metaItem}`}>
                          {locale === 'ja'
                            ? `参照元 : ${x.source_count}記事`
                            : `Sources: ${x.source_count} ${x.source_count === 1 ? 'article' : 'articles'}`}
                        </span>
                      </CardMeta>
                      {formatTopicListDate(x.last_source_published_at, locale) ? (
                        <span className={styles.cardDate}>
                          {formatTopicListDate(x.last_source_published_at, locale)}
                        </span>
                      ) : null}
                    </Card>
                  )
                })()}
              </Link>
            ))}
          </div>

          <div className={styles.pagerRow}>
            <div className={styles.pagerInfo}>
              {start && end ? (locale === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPrev ? (
                <Link className="tglButton" href={buildUrl(Math.max(0, cursor - limit))}>
                  {locale === 'ja' ? '前へ' : 'Prev'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {locale === 'ja' ? '前へ' : 'Prev'}
                </span>
              )}
              {hasNext ? (
                <Link className="tglButton" href={buildUrl(cursor + topics.length)}>
                  {locale === 'ja' ? '次へ' : 'Next'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {locale === 'ja' ? '次へ' : 'Next'}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>
              {locale === 'ja' ? '今の気分に近いものを選んでください' : 'Choose what fits your mood'}
            </div>
            <div className={styles.nextChoicesGrid}>
              <Link href={`/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}`}>
                <div
                  style={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    background: '#fff',
                    ...(emphasizeKey === 'heartwarming'
                      ? { borderColor: 'rgba(0,0,0,0.18)', boxShadow: '0 8px 18px rgba(0,0,0,0.06)' }
                      : {}),
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {locale === 'ja' ? '🤍 心温まる話を続ける' : '🤍 Keep it heartwarming'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {locale === 'ja'
                      ? '重たい話題は避けて、穏やかな出来事だけを'
                      : 'Avoid heavy topics, stay calm'}
                  </div>
                </div>
              </Link>
              <Link href={`/${country}/daily/today${gentle ? '?gentle=1' : ''}`}>
                <div
                  style={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    background: '#fff',
                    ...(emphasizeKey === 'briefing'
                      ? { borderColor: 'rgba(0,0,0,0.18)', boxShadow: '0 8px 18px rgba(0,0,0,0.06)' }
                      : {}),
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {locale === 'ja' ? '📰 今日の朝刊で、全体像をつかむ' : "📰 Read today's briefing"}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {locale === 'ja'
                      ? '今日の朝刊で、世界を整理する'
                      : 'A calm recap of the day'}
                  </div>
                </div>
              </Link>
              <Link href={`/${country}/columns${gentle ? '?gentle=1' : ''}`}>
                <div
                  style={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {locale === 'ja' ? '📖 心を整えるコラム' : '📖 Calming columns'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {locale === 'ja' ? 'ニュースから離れて、視点を整えます' : 'Step away from the news'}
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={query ? t.empty.noSearchResults : t.empty.noTopics}
          description={query ? t.empty.noSearchResultsDescription : t.empty.noTopicsDescription}
          action={
            query
              ? { label: t.common.more, href: `/${country}/news` }
              : { label: t.nav.top, href: `/${country}` }
          }
        />
      )}
    </main>
  )
}
