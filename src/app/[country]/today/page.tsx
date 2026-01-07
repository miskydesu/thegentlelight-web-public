import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type TodayResponse, type Country } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import type { TopicsResponse } from '@/lib/tglApi'
import styles from '../home.module.css'
import { getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import { formatTopicListDate } from '@/lib/topicDate'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { canonicalUrl, getSiteBaseUrl } from '@/lib/seo'
import { generateHreflang, generateBreadcrumbListJSONLD } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'
// 表示はsoft一本（UX方針）

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  const canonical = canonicalUrl(`/${country}/today`)
  const hreflang = generateHreflang('/today')
  return {
    title: `Today's Summary - ${country.toUpperCase()}`,
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function TodayPage({
  params,
}: {
  params: { country: string }
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
      { name: isJa ? '今日' : 'Today', url: `${base}/${country}/today` },
    ],
  })
  let data: TodayResponse
  let pickup: TopicsResponse
  try {
    data = await fetchJson<TodayResponse>(`/v1/${country}/today`, { next: { revalidate: CACHE_POLICY.frequent } })
    pickup = await fetchJson<TopicsResponse>(`/v1/${country}/pickup/heartwarming?limit=4`, { cache: 'no-store' })
  } catch (e: any) {
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
            <h1 style={{ fontSize: '1.4rem' }}>{country === 'jp' ? '今日のまとめ' : "Today's Summary"}</h1>
          </div>
          <div style={{ height: 12 }} />
          <EmptyState
            title={country === 'jp' ? 'APIに接続できません' : 'Cannot reach API'}
            description={String(e?.message || e || '')}
            action={{ label: country === 'jp' ? 'トップへ' : 'Back to home', href: `/${country}` }}
          />
        </main>
      </>
    )
  }
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
          <h1 style={{ fontSize: '1.4rem' }}>{t.pages.today.title}</h1>
          {data.daily?.generated_at && (
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              {new Date(data.daily.generated_at).toLocaleString()}
            </span>
          )}
        </div>

      <div style={{ height: 12 }} />

      {data.daily?.status === 'failed' ? (
        <EmptyState
          title={country === 'jp' ? '朝刊の生成に失敗しました' : 'Morning briefing generation failed'}
          description={country === 'jp' ? 'しばらくしてからもう一度ご覧ください。' : 'Please try again later.'}
          action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Briefings', href: `/${country}/daily` }}
        />
      ) : data.daily?.status === 'pending' ? (
        <EmptyState
          title={country === 'jp' ? '朝刊を生成中です' : 'Generating morning briefing...'}
          description={country === 'jp' ? 'しばらくお待ちください。' : 'Please wait a moment.'}
          action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Briefings', href: `/${country}/daily` }}
        />
      ) : data.daily && data.topics.length > 0 ? (
        <>
          <section style={{ marginBottom: '1.5rem' }}>
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
                href={`/${country}/category/heartwarming`}
                style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
              >
                {t.pages.home.seeMore}
              </Link>
            </div>
            <div style={{ height: 8 }} />
            {pickup.topics?.length ? (
              <div className={styles.heroGrid}>
                {pickup.topics.map((x) => (
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
                            <span className={styles.cardDate}>{formatTopicListDate(x.last_source_published_at, locale)}</span>
                          ) : null}
                        </Card>
                      )
                    })()}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>

          {data.daily.summary && (
            <section style={{ marginBottom: '1.5rem' }}>
              <Card>
                <CardTitle>{t.pages.today.summary}</CardTitle>
                <CardContent>
                  <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.daily.summary}</p>
                </CardContent>
              </Card>
            </section>
          )}

          <section>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t.pages.today.topics}</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {data.topics.map((t) => (
                <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`}>
                  <Card clickable>
                    <CardTitle>
                      <span style={{ marginRight: '0.5rem', color: 'var(--muted)' }}>#{t.rank}</span>
                      {t.title}
                    </CardTitle>
                    {t.summary && (
                      <CardContent style={{ marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--muted)' }}>
                          {t.summary}
                        </p>
                      </CardContent>
                    )}
                    <CardMeta style={{ marginTop: '0.5rem' }}>
                      <span>{t.category}</span>
                      <span>{t.source_count} sources</span>
                    </CardMeta>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={country === 'jp' ? 'まだ今日のまとめがありません' : "Today's summary is not available yet"}
          description={country === 'jp' ? '日報が生成されるまでお待ちください。' : 'Please wait for the daily to be generated.'}
          action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Briefings', href: `/${country}/daily` }}
        />
      )}
      </main>
    </>
  )
}

