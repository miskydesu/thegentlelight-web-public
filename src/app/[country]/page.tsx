import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, isCountry, type HomeResponse } from '../../lib/tglApi'
import { canonicalUrl, getSiteBaseUrl } from '../../lib/seo'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '../../lib/i18n'
import { generateSEOMetadata, generateHreflang, generateBreadcrumbListJSONLD } from '../../lib/seo-helpers'
import { getGentleFromSearchParams } from '../../lib/view-switch'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import styles from './home.module.css'
import type { TopicsResponse } from '../../lib/tglApi'
import { getCategoryBadgeTheme, getCategoryLabel } from '../../lib/categories'
import { formatTopicListDate } from '@/lib/topicDate'
import { CACHE_POLICY } from '@/lib/cache-policy'

function uniqByTopicId<T extends { topic_id: string }>(xs: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const x of xs) {
    if (seen.has(x.topic_id)) continue
    seen.add(x.topic_id)
    out.push(x)
  }
  return out
}

export async function generateMetadata({
  params,
}: {
  params: { country: string }
}) {
  const country = params.country
  if (!isCountry(country)) return {}

  const base = getSiteBaseUrl()
  const canonicalPath = `/${country}`

  // hreflang（4カ国エディションの代替リンク）
  const hreflang = generateHreflang('')

  const isJa = country === 'jp'
  // IMPORTANT:
  // 国別トップ（/[country]）だけは title の順序を固定したい。
  // layout.tsx の title.template（`%s | ${suffix}`）を適用させず、absolute を使う。
  const title = isJa
    ? 'やさしいニュース The Gentle Light | やさしく、静かに世界を知るためのニュースサイト'
    : 'Calm News The Gentle Light | Calm News Without Anxiety'
  const description = isJa
    ? 'やさしいニュース。煽りがない穏やかな言葉に編集したニュースをお届けする、やさしいニュースサイト。'
    : "Gentle news for your mental health. World news without doomscrolling, anxiety, or sensationalism. Calm daily briefings that keep you informed."
  const keywords = isJa
    ? [
        'やさしいニュース',
        '優しいニュース',
        '穏やかなニュース',
        '煽られないニュース',
        '不安にならないニュース',
        '心が落ち着くニュース',
        '静かなニュース',
        'ニュース疲れ',
        '情報過多',
        'メンタルヘルス',
      ]
    : ['gentle news', 'calm news', 'news without anxiety', 'mental health news', 'news fatigue solution']

  const baseMeta = generateSEOMetadata({
    title,
    description,
    keywords,
    type: 'website',
    canonical: `${base}${canonicalPath}`,
    hreflang,
  })

  // 国別 layout で title.template を出し分けるため、ここでは文字列 title をそのまま返す
  return {
    ...baseMeta,
    title: { absolute: title },
  }
}

export default async function CountryHome({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { gentle?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const gentle = getGentleFromSearchParams(searchParams)
  const base = getSiteBaseUrl()
  const isJa = country === 'jp'
  const breadcrumbJSONLD = generateBreadcrumbListJSONLD({
    items: [
      { name: 'The Gentle Light', url: `${base}/` },
      { name: isJa ? 'トップ' : 'Home', url: `${base}/${country}` },
    ],
  })

  const sp = new URLSearchParams()
  if (gentle) sp.set('gentle', '1')
  // important: heartwarming を除外しても「重要トピック」は最低8件を満たしたいので、/home は多めに取る
  sp.set('limit', '30')
  const qs = sp.toString()
  const data = await fetchJson<HomeResponse>(`/v1/${country}/home${qs ? `?${qs}` : ''}`, {
    next: { revalidate: CACHE_POLICY.frequent },
  })
  // PickupHeartwarming は常に4件（GentleModeに依存しない）。選定は専用APIで行う。
  const heartwarming = await fetchJson<TopicsResponse>(`/v1/${country}/pickup/heartwarming?limit=4`, {
    next: { revalidate: CACHE_POLICY.frequent },
  })
  const heroNonHW = (data.hero_topics || []).filter((x) => x.category !== 'heartwarming')
  const heroTopicLimit = gentle ? 6 : 8
  const need = Math.max(0, heroTopicLimit - heroNonHW.length)
  const extraCandidates = need
    ? await fetchJson<TopicsResponse>(
        `/v1/${country}/topics?limit=${Math.min(30, need + 12)}${gentle ? `&gentle=1` : ''}`,
        { next: { revalidate: CACHE_POLICY.frequent } }
      )
    : null

  const excludeIds = new Set<string>([
    ...(heartwarming.topics || []).map((x) => x.topic_id),
    ...heroNonHW.map((x) => x.topic_id),
  ])
  const extraNonHW = (extraCandidates?.topics || []).filter(
    (x) => x.category !== 'heartwarming' && !excludeIds.has(x.topic_id)
  )
  const heroTopics = uniqByTopicId([...heroNonHW, ...extraNonHW]).slice(0, heroTopicLimit)
  // 選出はそのまま（重要度ベース）で、表示順だけ新しい順にする
  const heroTopicsSorted = [...heroTopics].sort((a, b) => {
    const aTs = a.last_source_published_at ? new Date(a.last_source_published_at).getTime() : 0
    const bTs = b.last_source_published_at ? new Date(b.last_source_published_at).getTime() : 0
    if (bTs !== aTs) return bTs - aTs
    const aSeen = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0
    const bSeen = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0
    if (bSeen !== aSeen) return bSeen - aSeen
    return String(b.topic_id).localeCompare(String(a.topic_id))
  })
  const isPartial = Boolean(data.meta?.is_partial)
  const t = getTranslationsForCountry(country, lang)
  const locale = lang === 'ja' ? 'ja' : 'en'

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
          <h1 style={{ fontSize: '1.5rem' }}>{country === 'jp' ? '穏やかに世界を知る' : 'Gentle World News'}</h1>
          {isPartial ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>
          ) : (
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              updated: {new Date(data.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

      <div style={{ height: 12 }} />

      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '1rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.22)',
            paddingBottom: 8,
            marginBottom: 2,
          }}
        >
          <h2 style={{ fontSize: '1.1rem' }}>
            {lang === 'ja' ? 'PickUp 心温まる話' : 'Curated Heartwarming'}
          </h2>
          <Link
            href={`/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}`}
            style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
          >
            {t.pages.home.seeMore}
          </Link>
        </div>

        <div style={{ height: 8 }} />

        {heartwarming.topics?.length ? (
          <div className={styles.heroGrid}>
            {heartwarming.topics.map((x) => (
              <Link key={x.topic_id} href={`/${country}/news/n/${x.topic_id}`}>
                {(() => {
                  const theme = getCategoryBadgeTheme('heartwarming')
                  return (
                    <Card
                      clickable
                      className={`${styles.topCard} ${styles.topCardHeartwarming}`}
                      style={{ ['--cat-color' as any]: theme.color } as any}
                    >
                  <CardTitle className={styles.cardTitleAccent}>{x.title}</CardTitle>
                  {x.summary ? (
                    <CardContent style={{ marginTop: '0.25rem' }}>
                      <p className={styles.cardSummary}>{x.summary}</p>
                    </CardContent>
                  ) : null}
                  <CardMeta style={{ marginTop: '0.5rem' }}>
                    <span className={styles.categoryBadge} style={theme}>
                      {getCategoryLabel('heartwarming', locale)}
                    </span>
                    {Boolean(x.high_arousal) || (x.distress_score ?? 0) >= 50 ? (
                      <span className={styles.categoryBadge} style={{ opacity: 0.75 }}>
                        {locale === 'ja' ? '心の負担に注意' : 'May be upsetting'}
                      </span>
                    ) : null}
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
        ) : (
          <EmptyState
            title={country === 'jp' ? 'まだ心温まる話がありません' : 'No heartwarming topics yet'}
            description={country === 'jp' ? 'しばらくしてからもう一度お試しください。' : 'Please try again later.'}
            action={{ label: t.pages.home.seeMore, href: `/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}` }}
          />
        )}
      </section>

      <div style={{ height: 18 }} />

      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '1rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.22)',
            paddingBottom: 8, 
            marginBottom: 2,
          }}
        >
          <h2 style={{ fontSize: '1.1rem' }}>{t.pages.home.heroTopics}</h2>
          <Link
            href={`/${country}/news`}
            style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
          >
            {t.pages.home.seeMore}
          </Link>
        </div>

        <div style={{ height: 8 }} />

        {heroTopicsSorted.length ? (
          <div className={styles.heroGrid}>
            {heroTopicsSorted.map((t) => (
              <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`}>
                {(() => {
                  const theme = getCategoryBadgeTheme(t.category)
                  return (
                    <Card
                      clickable
                      className={styles.topCard}
                      style={{ ['--cat-color' as any]: theme.color } as any}
                    >
                  <CardTitle className={styles.cardTitleAccent}>{t.title}</CardTitle>
                  {t.summary ? (
                    <CardContent style={{ marginTop: '0.25rem' }}>
                      <p className={styles.cardSummary}>{t.summary}</p>
                    </CardContent>
                  ) : null}
                  <CardMeta style={{ marginTop: '0.5rem' }}>
                    <span className={styles.categoryBadge} style={theme}>
                      {getCategoryLabel(t.category, locale)}
                    </span>
                    {Boolean(t.high_arousal) || (t.distress_score ?? 0) >= 50 ? (
                      <span className={styles.categoryBadge} style={{ opacity: 0.75 }}>
                        {locale === 'ja' ? '心の負担に注意' : 'May be upsetting'}
                      </span>
                    ) : null}
                  </CardMeta>
                  {formatTopicListDate(t.last_source_published_at, locale) ? (
                    <span className={styles.cardDate}>
                      {formatTopicListDate(t.last_source_published_at, locale)}
                    </span>
                  ) : null}
                    </Card>
                  )
                })()}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.empty.noTopics}
            description={t.empty.noTopicsDescription}
            action={{ label: t.common.more, href: `/${country}/news` }}
          />
        )}
      </section>

      {isPartial && <PartialNotice country={country} />}
      </main>
    </>
  )
}


