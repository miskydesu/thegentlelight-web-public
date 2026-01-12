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
import { getCategoryBadgeTheme, getCategoryLabel } from '../../lib/categories'
import { formatTopicListDate } from '@/lib/topicDate'
import { CACHE_POLICY } from '@/lib/cache-policy'

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
  // /home は朝刊と同じ 4/2/6（合計12）を返すのが基本。limit は互換のため残す。
  sp.set('limit', '12')
  const qs = sp.toString()
  const data = await fetchJson<HomeResponse>(`/v1/${country}/home${qs ? `?${qs}` : ''}`, {
    next: { revalidate: CACHE_POLICY.frequent },
  })
  const isPartial = Boolean(data.meta?.is_partial)
  const t = getTranslationsForCountry(country, lang)
  const locale = lang === 'ja' ? 'ja' : 'en'

  const gentleTopics = (data.gentle_topics || []).slice(0, 4)
  const heartwarmingTopics = (data.heartwarming_topics || []).slice(0, 2)
  const importantTopics = (data.important_topics || []).slice(0, 6)

  // Backward compat fallback (older API): derive rough buckets from hero_topics.
  const fallbackFromHero = () => {
    const hero = data.hero_topics || []
    const hw = hero.filter((x) => x.category === 'heartwarming').slice(0, 2)
    const non = hero.filter((x) => x.category !== 'heartwarming')
    return {
      gentle: non.slice(0, 4),
      heartwarming: hw,
      important: non.slice(4, 10),
    }
  }
  const fb = fallbackFromHero()
  const gentleFinal = gentleTopics.length ? gentleTopics : fb.gentle
  const heartwarmingFinal = heartwarmingTopics.length ? heartwarmingTopics : fb.heartwarming
  const importantFinal = importantTopics.length ? importantTopics : fb.important

  const renderTopicCards = (items: Array<any>) => {
    if (!items.length) return null
    return (
      <div className={styles.heroGrid}>
        {items.map((x: any) => (
          <Link key={x.topic_id} href={`/${country}/news/n/${x.topic_id}`}>
            {(() => {
              const cat = String(x.category || 'unknown')
              const theme = getCategoryBadgeTheme(cat as any)
              const dateLabel = formatTopicListDate(x.last_source_published_at, locale)
              const isHeartwarming = cat === 'heartwarming'
              return (
                <Card
                  clickable
                  className={`${styles.topCard}${isHeartwarming ? ` ${styles.topCardHeartwarming}` : ''}`}
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
                      {getCategoryLabel(cat as any, locale)}
                    </span>
                    {Boolean(x.high_arousal) || (x.distress_score ?? 0) >= 50 ? (
                      <span className={styles.categoryBadge} style={{ opacity: 0.75 }}>
                        {locale === 'ja' ? '心の負担に注意' : 'May be upsetting'}
                      </span>
                    ) : null}
                  </CardMeta>
                  {dateLabel ? <span className={styles.cardDate}>{dateLabel}</span> : null}
                </Card>
              )
            })()}
          </Link>
        ))}
      </div>
    )
  }

  const sectionHeader = (title: string, moreHref?: string) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
        borderBottom: '1px solid rgba(0, 0, 0, 0.22)',
        paddingBottom: 8,
        marginBottom: 10,
      }}
    >
      <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
      {moreHref ? (
        <Link href={moreHref} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
          {t.pages.home.seeMore}
        </Link>
      ) : (
        <span />
      )}
    </div>
  )

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
          <h1 style={{ fontSize: '1.5rem' }}>{country === 'jp' ? 'やさしいニュース トップ' : 'Calm News Top'}</h1>
          {isPartial ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>
          ) : (
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              updated: {new Date(data.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

      <div style={{ height: 12 }} />

      <section style={{ marginBottom: '1.5rem' }}>
        {sectionHeader('Gentle News', `/${country}/news${gentle ? '?gentle=1' : ''}`)}
        {renderTopicCards(gentleFinal) ?? (
          <EmptyState
            title={country === 'jp' ? 'Gentle Newsがまだありません' : 'No Gentle News yet'}
            description={country === 'jp' ? 'しばらくしてからもう一度お試しください。' : 'Please try again later.'}
            action={{ label: t.pages.home.seeMore, href: `/${country}/news${gentle ? '?gentle=1' : ''}` }}
          />
        )}
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        {sectionHeader(locale === 'ja' ? '心温まる話' : 'Heartwarming', `/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}`)}
        {renderTopicCards(heartwarmingFinal) ?? (
          <EmptyState
            title={country === 'jp' ? 'まだ心温まる話がありません' : 'No heartwarming topics yet'}
            description={country === 'jp' ? 'しばらくしてからもう一度お試しください。' : 'Please try again later.'}
            action={{ label: t.pages.home.seeMore, href: `/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}` }}
          />
        )}
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        {sectionHeader(locale === 'ja' ? '押さえておきたいNews' : 'Must-know News', `/${country}/latest${gentle ? '?gentle=1' : ''}`)}
        {renderTopicCards(importantFinal) ?? (
          <EmptyState
            title={country === 'jp' ? '重要トピックスがありません' : 'No important topics'}
            description={country === 'jp' ? 'しばらくしてからもう一度お試しください。' : 'Please try again later.'}
            action={{ label: t.pages.home.seeMore, href: `/${country}/latest${gentle ? '?gentle=1' : ''}` }}
          />
        )}
      </section>

      {isPartial && <PartialNotice country={country} />}
      </main>
    </>
  )
}


