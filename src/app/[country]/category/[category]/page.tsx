import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type TopicsResponse, type HeartwarmingTodayThreeResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getGentleFromSearchParams, getAllowImportantFromSearchParams } from '@/lib/view-switch'
import { CATEGORIES, getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import styles from './category.module.css'
import { formatTopicListDate } from '@/lib/topicDate'
import { canonicalUrl, getCountrySeoMeta, getSiteBaseUrl } from '@/lib/seo'
import { generateHreflang, generateBreadcrumbListJSONLD } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { CategorySearchForm } from '@/components/category/CategorySearchForm'
// 表示はsoft一本（UX方針）

const TONE_LABELS_JA = ['静かな良い話', '支援とつながり', '回復につながる動き'] as const
const TONE_LABELS_EN = ['Calm story', 'Support & kindness', 'Hopeful progress'] as const

const toneLabel = (topicId: string, locale: 'ja' | 'en'): string => {
  const list = locale === 'ja' ? TONE_LABELS_JA : TONE_LABELS_EN
  const idx = Math.abs(String(topicId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % list.length
  return list[idx]
}

const toneKindFromLabel = (label: string, locale: 'ja' | 'en'): 'warm' | 'calm' | 'hope' => {
  const s = String(label || '')
  if (locale === 'ja') {
    if (s.includes('心温まる') || s.includes('支援') || s.includes('つながり')) return 'warm'
    if (s.includes('静かな') || s.includes('静か')) return 'calm'
    if (s.includes('希望')) return 'hope'
    return 'warm'
  }
  const lower = s.toLowerCase()
  if (lower.includes('calm')) return 'calm'
  if (lower.includes('hope')) return 'hope'
  return 'warm'
}

const formatDateTimeShort = (iso: string | null | undefined, locale: 'ja' | 'en'): string | null => {
  if (!iso) return null
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null
  const m = dt.getMonth() + 1
  const d = dt.getDate()
  const h = dt.getHours()
  const min = String(dt.getMinutes()).padStart(2, '0')
  if (locale === 'ja') return `${m}/${d} ${h}:${min}`
  return `${m}/${d} ${h}:${min}`
}

type TopicItem = TopicsResponse['topics'][number]

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { country: string; category: string }
  searchParams?: { q?: string; gentle?: string; allow_important?: string; cursor?: string; limit?: string }
}) {
  const category = CATEGORIES.find((c) => c.code === params.category)
  const canonical = canonicalUrl(`/${params.country}/category/${encodeURIComponent(params.category)}`)
  // フィルタ付きは hreflang を付けない（意図の同一性が担保しにくい）
  const hasFilter = Boolean(searchParams?.q || searchParams?.gentle || searchParams?.allow_important || searchParams?.cursor || searchParams?.limit)
  const hreflang = hasFilter ? [] : generateHreflang(`/category/${params.category}`)
  const isJa = params.country === 'jp'
  const isHeartwarming = params.category === 'heartwarming'
  const countryMeta = isCountry(params.country) ? getCountrySeoMeta(params.country) : null
  const catLabel = isJa ? (category?.labelJa || category?.label || params.category) : (category?.label || category?.labelJa || params.category)
  // JPの heartwarming は「心温まる話ニュース」だと意味が崩れるため、語尾の「ニュース」を外して独自性を強調する
  const baseDescription = (() => {
    if (isJa && isHeartwarming) {
      return '心温まる話。人のやさしさ・支援・つながりが伝わる出来事を、独自の指標で確かめて選びました。忙しい日でも、心がほどける情報だけを。'
    }
    return isJa
      ? `${catLabel}ニュース。穏やかで、煽られない言葉で今日の動きを短く整理します。気になる分野だけ、必要なぶんだけ、静かに追えます。`
      : `Calm ${catLabel} news without anxiety. A gentle, non-sensational digest that helps you stay informed without doomscrolling. Follow only what matters, and step away anytime.`
  })()
  // indexableな棚（=カテゴリページ）は国別のdescription差分も付けて重複を避ける（JPはnoindex運用が多いので控えめ）
  const descriptionWithCountry = countryMeta
    ? (isJa ? `${baseDescription}${countryMeta.descriptionSuffixJa}` : `${baseDescription}${countryMeta.descriptionSuffixEn}`)
    : baseDescription
  const meta: any = {
    title: (() => {
      if (isJa && isHeartwarming) return '心温まる話（癒やしと希望）'
      return isJa ? `${catLabel}ニュース` : `${catLabel} News`
    })(),
    // カテゴリ棚は正URLとして運用するため、descriptionは国別差分込みで統一
    description: descriptionWithCountry,
    keywords: (() => {
      if (isJa && isHeartwarming) {
        return [
          '心温まる話',
          '癒やし',
          '希望',
          'やさしさ',
          '支援',
          'つながり',
          'やさしいニュース',
          'ニュース疲れ',
        ]
      }
      return isJa
        ? [`${catLabel}ニュース`, `穏やかな${catLabel}`, 'やさしいニュース', '不安のないニュース', '煽られないニュース']
        : [`${catLabel} news`, `calm ${catLabel}`, 'gentle news', 'news without anxiety']
    })(),
    alternates: {
      canonical,
      ...(hreflang.length ? { languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])) } : {}),
    },
  }
  // クエリ/表示モード/ページング付きは noindex,follow（重複・無限URLを避ける）
  if (hasFilter) {
    meta.robots = { index: false, follow: true, googleBot: { index: false, follow: true } }
  }
  // JPは試験運用：Heartwarming以外のカテゴリトップは noindex,follow
  if (params.country === 'jp' && params.category !== 'heartwarming') {
    meta.robots = { index: false, follow: true, googleBot: { index: false, follow: true } }
  }
  return meta
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { country: string; category: string }
  searchParams: { q?: string; gentle?: string; allow_important?: string; cursor?: string; limit?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const category = CATEGORIES.find((c) => c.code === params.category)
  if (!category) return notFound()
  const t = getTranslationsForCountry(country, lang)
  const gentle = getGentleFromSearchParams(searchParams)
  const allowImportant = getAllowImportantFromSearchParams(searchParams)
  const locale = lang === 'ja' ? 'ja' : 'en'
  const base = getSiteBaseUrl()
  const isJa = country === 'jp'
  const query = String(searchParams.q || '').trim()
  const breadcrumbJSONLD = generateBreadcrumbListJSONLD({
    items: [
      { name: 'The Gentle Light', url: `${base}/` },
      { name: isJa ? 'トップ' : 'Home', url: `${base}/${country}` },
      { name: getCategoryLabel(category.code, locale), url: `${base}/${country}/category/${category.code}` },
    ],
  })

  const isHeartwarmingPage = category.code === 'heartwarming'
  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
  const defaultLimit = isHeartwarmingPage ? 10 : 30
  const parsedLimit = Number.isFinite(Number(searchParams.limit)) ? Math.min(100, Math.max(1, Math.trunc(Number(searchParams.limit)))) : defaultLimit
  const limit = isHeartwarmingPage ? 10 : parsedLimit

  const data = await fetchJson<TopicsResponse>(
    `/v1/${country}/topics?category=${encodeURIComponent(category.code)}&limit=${limit}&cursor=${cursor}${gentle ? `&gentle=1${allowImportant ? '' : '&allow_important=0'}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`,
    { next: { revalidate: CACHE_POLICY.frequent } }
  )
  const isPartial = Boolean(data.meta?.is_partial)
  const hasNext = data.topics.length === limit
  const hasPrev = cursor > 0
  const start = data.topics.length > 0 ? cursor + 1 : 0
  const end = cursor + data.topics.length

  const buildUrl = (nextCursor: number) => {
    const sp = new URLSearchParams()
    if (query) sp.set('q', query)
    if (gentle) sp.set('gentle', '1')
    if (gentle && !allowImportant) sp.set('allow_important', '0')
    if (!isHeartwarmingPage && limit !== 30) sp.set('limit', String(limit))
    if (nextCursor > 0) sp.set('cursor', String(nextCursor))
    const qs = sp.toString()
    return `/${country}/category/${encodeURIComponent(category.code)}${qs ? `?${qs}` : ''}`
  }
  let todayPicks: Array<{ item: TopicItem; label: string }> = []
  if (isHeartwarmingPage && !query) {
    try {
      const pickData = await fetchJson<HeartwarmingTodayThreeResponse>(
        `/v1/${country}/heartwarming/today-three?limit=3${gentle ? `&gentle=1${allowImportant ? '' : '&allow_important=0'}` : ''}`,
        { next: { revalidate: CACHE_POLICY.frequent } }
      )
      todayPicks = (pickData.picks || []).map((p) => ({
        item: p,
        label: p.pick_label || (locale === 'ja' ? '今日のおすすめ' : 'Today’s pick'),
      }))
    } catch (e) {
      todayPicks = []
    }
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '1rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(0, 0, 0, 0.22)',
          paddingBottom: 8,
          marginBottom: 2,
        }}
      >
        <h1 style={{ fontSize: '1.4rem' }}>{getCategoryLabel(category.code, locale)}</h1>
        <Link
          href={`/${country}/news${gentle ? '?gentle=1' : ''}`}
          style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          {t.pages.category.seeMore}
        </Link>
      </div>

      <div style={{ height: 12 }} />

      {/* カテゴリ内検索：heartwarming は「最近の心温まるお話」直下に置く（導線の重心を下げる） */}
      {!isHeartwarmingPage ? (
        <>
          <CategorySearchForm country={country} category={category.code} initialQuery={query} />
          {query ? (
            <>
              <div style={{ height: 10 }} />
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                {locale === 'ja' ? `検索結果: 「${query}」` : `Search results: "${query}"`}
              </div>
            </>
          ) : null}
          <div style={{ height: 14 }} />
        </>
      ) : (
        <div style={{ height: 2 }} />
      )}

      {isHeartwarmingPage ? (
        <>
          <div
            style={{
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 12,
              padding: '10px 12px',
              color: 'var(--text)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              background: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {locale === 'ja' ? (
              <>
                今日、世界のどこかで起きた
                <br />
                小さなやさしさを集めました。
              </>
            ) : (
              <>
                Today, we gathered small kindnesses
                <br />
                that happened somewhere in the world.
              </>
            )}
          </div>
          <div style={{ height: 12 }} />
        </>
      ) : null}

      {isHeartwarmingPage && !query && todayPicks.length > 0 ? (
        <section className={styles.featuredSection}>
          <div className={styles.featuredTitleRow}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{locale === 'ja' ? '今日の3つ' : "Today’s three"}</h2>
          </div>
          <div className={styles.featuredGrid}>
            {todayPicks.map((pick) => (
              <Link key={pick.item.topic_id} href={`/${country}/news/n/${pick.item.topic_id}`}>
                <Card
                  clickable
                  className={`${styles.topCard} ${styles.featuredCard}`}
                  style={{ ['--cat-color' as any]: getCategoryBadgeTheme(pick.item.category).color } as any}
                >
                  <div className={styles.cardTopRow}>
                    <span className={styles.toneBadge} data-tone={toneKindFromLabel(pick.label, locale)}>
                      {pick.label}
                    </span>
                    {formatDateTimeShort(pick.item.last_source_published_at ?? null, locale) ? (
                      <span className={styles.readTime} style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
                        {formatDateTimeShort(pick.item.last_source_published_at ?? null, locale)}
                      </span>
                    ) : null}
                  </div>
                  <CardTitle className={styles.cardTitleAccent}>{pick.item.title}</CardTitle>
                  {pick.item.summary ? (
                    <CardContent style={{ marginTop: '0.25rem' }}>
                      <p className={styles.cardSummary}>{pick.item.summary}</p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
          <div style={{ height: 14 }} />
        </section>
      ) : null}

      {data.topics.length > 0 ? (
        <>
          {isHeartwarmingPage ? (
            <>
              <div style={{ height: 6 }} />
              <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }} />
              <div style={{ height: 10 }} />
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <h2 style={{ fontSize: '1.05rem', margin: 0 }}>
                  {locale === 'ja' ? '最近の心温まるお話' : 'Recent heartwarming stories'}
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {start && end ? (locale === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`) : null}
                </span>
              </div>
              <CategorySearchForm country={country} category={category.code} initialQuery={query} />
              {query ? (
                <>
                  <div style={{ height: 10 }} />
                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                    {locale === 'ja' ? `検索結果: 「${query}」` : `Search results: "${query}"`}
                  </div>
                </>
              ) : null}
              <div style={{ height: 10 }} />
            </>
          ) : null}
          <div style={{ height: 8 }} />

          <div className={styles.listGrid}>
            {data.topics.map((x) => (
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
                      {isHeartwarming ? (
                        <div className={styles.cardTopRow}>
                          {(() => {
                            const label = toneLabel(x.topic_id, locale)
                            return (
                              <span className={styles.toneBadge} data-tone={toneKindFromLabel(label, locale)}>
                                {label}
                              </span>
                            )
                          })()}
                          {formatDateTimeShort(x.last_source_published_at ?? null, locale) ? (
                            <span className={styles.readTime} style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
                              {formatDateTimeShort(x.last_source_published_at ?? null, locale)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <CardTitle className={styles.cardTitleAccent}>{x.title}</CardTitle>
                      {x.summary ? (
                        <CardContent style={{ marginTop: '0.25rem' }}>
                          <p className={styles.cardSummary}>{x.summary}</p>
                        </CardContent>
                      ) : null}
                      <CardMeta style={{ marginTop: '0.5rem', columnGap: 0, rowGap: 0 }}>
                        {(() => {
                          const distress = Number(x.distress_score ?? 0)
                          return distress >= 60 || (Boolean(x.high_arousal) && distress >= 30)
                        })() ? (
                          <span className={`${styles.categoryBadge} ${styles.metaItem}`} style={{ opacity: 0.75 }}>
                            {locale === 'ja' ? '心の負担に注意' : 'May be upsetting'}
                          </span>
                        ) : null}
                      </CardMeta>
                    </Card>
                  )
                })()}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {start && end ? (locale === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPrev ? (
                <Link className="tglButton" href={buildUrl(Math.max(0, cursor - limit))}>
                  {isHeartwarmingPage ? (locale === 'ja' ? '戻る' : 'Back') : locale === 'ja' ? '前へ' : 'Prev'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {isHeartwarmingPage ? (locale === 'ja' ? '戻る' : 'Back') : locale === 'ja' ? '前へ' : 'Prev'}
                </span>
              )}
              {hasNext ? (
                <Link className="tglButton" href={buildUrl(cursor + data.topics.length)}>
                  {isHeartwarmingPage ? (locale === 'ja' ? 'もう少し読む' : 'Read a little more') : locale === 'ja' ? '次へ' : 'Next'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {isHeartwarmingPage ? (locale === 'ja' ? 'もう少し読む' : 'Read a little more') : locale === 'ja' ? '次へ' : 'Next'}
                </span>
              )}
            </div>
          </div>

          {isHeartwarmingPage ? (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>
                {locale === 'ja' ? 'このあと、どうしますか' : 'What next?'}
              </div>
              <div className={styles.nextChoicesGrid}>
                {hasNext ? (
                  <Link href={buildUrl(cursor + data.topics.length)}>
                    <div
                      style={{
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{locale === 'ja' ? '🤍 もう少し、やさしい話を読む' : '🤍 Read a little more kindness'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {locale === 'ja' ? 'この数日で届いた、心温まる出来事を続けて' : 'Continue gentle stories from recent days'}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div
                    style={{
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: '#fff',
                      opacity: 0.6,
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{locale === 'ja' ? '🤍 もう少し、やさしい話を読む' : '🤍 Read a little more kindness'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {locale === 'ja' ? 'この数日で届いた、心温まる出来事を続けて' : 'Continue gentle stories from recent days'}
                    </div>
                  </div>
                )}
                <Link href={`/${country}/daily`}>
                  <div
                    style={{
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {locale === 'ja' ? '📰 今日の朝刊で、全体像をつかむ' : "📰 Read today's briefing"}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {locale === 'ja' ? '煽られず、今日の流れをさっと把握します' : 'A calm recap of today’s key points'}
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
                      {locale === 'ja' ? '📖 心を整えるコラムを読む' : '📖 Read a calming column'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {locale === 'ja' ? 'ニュースから少し離れて、整える時間を' : 'Step away and reflect'}
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          ) : null}

          {isHeartwarmingPage && !hasNext ? (
            <div style={{ marginTop: 18, padding: '12px 12px', borderRadius: 10, background: 'rgba(0, 0, 0, 0.03)', color: 'var(--text)', lineHeight: 1.6 }}>
              {locale === 'ja' ? (
                <>
                  今日は、これくらいでも十分です。
                  <br />
                  また、心が疲れたときに。
                </>
              ) : (
                <>
                  This is enough for today.
                  <br />
                  Come back when you need a gentle moment.
                </>
              )}
              <div style={{ height: 8 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="tglButton" href={`/${country}/daily`}>
                  {locale === 'ja' ? 'Daily に戻る' : "Back to Daily"}
                </Link>
                <span className="tglButton" style={{ opacity: 0.7, pointerEvents: 'none' }}>
                  {locale === 'ja' ? 'ブックマークする' : 'Bookmark'}
                </span>
              </div>
            </div>
          ) : null}

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={t.empty.noCategoryResults}
          description={t.empty.noCategoryResultsDescription}
          action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
        />
      )}
      </main>
    </>
  )
}

