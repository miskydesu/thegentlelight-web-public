import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type DailyDetailResponse } from '../../../../lib/tglApi'
import { canonicalUrl } from '../../../../lib/seo'
import { getLocaleForCountry, useTranslations, type Locale } from '../../../../lib/i18n'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { DailyGenerateButton } from '@/components/daily/DailyGenerateButton'
import { MorningMessagesRotator } from '@/components/daily/MorningMessagesRotator'
import styles from '../../home.module.css'
import { getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import { formatTopicListDate } from '@/lib/topicDate'

export function generateMetadata({ params }: { params: { country: string; date: string } }) {
  const { country, date } = params
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/daily/${date}`),
    },
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

export default async function DailyDetailPage({
  params,
}: {
  params: { country: string; date: string }
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
          <Link href={`/${country}/daily/today`}>← {country === 'jp' ? '本日の朝刊へ' : "Go to today's briefing"}</Link>
        </div>
        <EmptyState
          title={country === 'jp' ? '未来日付の朝刊は閲覧できません。' : 'Future briefings are not available.'}
          description={country === 'jp' ? '当日の朝刊へ移動します。' : "Redirect to today's briefing."}
          action={{ label: country === 'jp' ? '本日の朝刊へ' : "Go to today's briefing", href: `/${country}/daily/today` }}
        />
      </main>
    )
  }

  const lang: Locale = getLocaleForCountry(country)
  const t = useTranslations(country, lang)
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
          {country === 'jp' ? `${formatDailyTitleDateJa(date)}の朝刊` : `Morning Briefing ${date}`}
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

  const gentleTopics = data.topics.filter((x: any) => (x.section ? x.section === 'A' : (x.rank ?? 0) >= 1 && (x.rank ?? 0) <= 4))
  const heartwarmingTopics = data.topics
    .filter((x: any) => (x.section ? x.section === 'B' : (x.rank ?? 0) >= 5 && (x.rank ?? 0) <= 8))
    .slice(0, 2)
  const importantTopics = data.topics.filter((x: any) => (x.section ? x.section === 'C' : (x.rank ?? 0) >= 9 && (x.rank ?? 0) <= 14))

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

  const sectionHeader = (title: string) => (
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
      <span />
    </div>
  )

  return (
    <main>
      <div className="tglMuted" style={{ marginBottom: 10 }}>
        <Link href={`/${country}/daily`}>← {country === 'jp' ? '朝刊一覧' : 'Morning Briefing'}</Link>
      </div>

      <h1 style={{ fontSize: '1.45rem' }}>
        {country === 'jp' ? `${formatDailyTitleDateJa(date)}の朝刊` : `Morning Briefing ${date}`}
      </h1>
      <div style={{ height: 10 }} />

      {data.daily.status === 'failed' ? (
        <>
          <EmptyState
            title={country === 'jp' ? '朝刊の生成に失敗しました' : 'Morning briefing generation failed'}
            description={country === 'jp' ? 'しばらくしてからもう一度ご覧ください。' : 'Please try again later.'}
            action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
          />
        </>
      ) : data.daily.status === 'pending' ? (
        <EmptyState
          title={country === 'jp' ? '朝刊を生成中です' : 'Generating morning briefing...'}
          description={country === 'jp' ? 'しばらくお待ちください。' : 'Please wait a moment.'}
          action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
        />
      ) : data.daily.status === 'missing' ? (
        <>
          <EmptyState
            title={country === 'jp' ? 'この日の朝刊はまだありません' : 'No morning briefing for this date'}
            description={country === 'jp' ? '別の日付をお試しください。' : 'Please try another date.'}
            action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
          />
        </>
      ) : (
        <>
          {data.messages?.length ? (
            <>
              <MorningMessagesRotator messages={data.messages} intervalMs={5000} />
              <div style={{ height: 12 }} />
            </>
          ) : null}

          <div style={{ height: 12 }} />

          {data.daily.summary ? (
            <>
              <div
                style={{
                  fontSize: '0.98rem',
                  lineHeight: 1.75,
                  color: 'var(--text)',
                  fontWeight: 700,
                  marginBottom: '1.25rem',
                }}
              >
                {data.daily.summary}
              </div>
            </>
          ) : null}

          <section style={{ marginBottom: '1.5rem' }}>
            {sectionHeader('Gentle News')}
            {renderTopicCards(gentleTopics) ?? (
              <EmptyState
                title={country === 'jp' ? 'GentleNews枠のトピックがありません' : 'No GentleNews topics'}
                description={country === 'jp' ? '対象期間の条件に合うトピックが少ない可能性があります。' : 'There may have been too few eligible topics.'}
                action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
              />
            )}
          </section>

          <section style={{ marginBottom: '1.5rem' }}>
            {sectionHeader('心温まる話')}
            {renderTopicCards(heartwarmingTopics) ?? (
              <EmptyState
                title={country === 'jp' ? '心温まる話枠のトピックがありません' : 'No heartwarming topics'}
                description={country === 'jp' ? '対象期間の条件に合うトピックが少ない可能性があります。' : 'There may have been too few eligible topics.'}
                action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
              />
            )}
          </section>

          <section style={{ marginBottom: '1.5rem' }}>
            {sectionHeader('押さえておきたいNews')}
            {renderTopicCards(importantTopics) ?? (
              <EmptyState
                title={country === 'jp' ? '重要トピックスがありません' : 'No important topics'}
                description={country === 'jp' ? '対象期間の条件に合うトピックが少ない可能性があります。' : 'There may have been too few eligible topics.'}
                action={{ label: country === 'jp' ? '朝刊一覧へ' : 'Back to Briefings', href: `/${country}/daily` }}
              />
            )}
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


