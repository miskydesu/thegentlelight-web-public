import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, isCountry, type HomeResponse } from '../../lib/tglApi'
import { canonicalUrl, getCountrySeoMeta, getSiteBaseUrl } from '../../lib/seo'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '../../lib/i18n'
import { generateSEOMetadata, generateHreflang, generateBreadcrumbListJSONLD } from '../../lib/seo-helpers'
import { getGentleFromSearchParams, getAllowImportantFromSearchParams } from '../../lib/view-switch'
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
  const { titleSuffix, descriptionSuffixEn, descriptionSuffixJa } = getCountrySeoMeta(country)
  // IMPORTANT:
  // 国別トップ（/[country]）だけは title の順序を固定したい。
  // layout.tsx の title.template（`%s | ${suffix}`）を適用させず、absolute を使う。
  const title = isJa
    ? `やさしく、静かに世界を知るためのニュースサイト | やさしいニュース The Gentle Light${titleSuffix}`
    : `Calm News Without Anxiety | The Gentle Light${titleSuffix}`
  const descriptionBase = isJa
    ? 'やさしいニュース。煽りがない穏やかな言葉に編集したニュースをお届けする、やさしいニュースサイト。'
    : "Gentle news for your mental health. World news without doomscrolling, anxiety, or sensationalism. Calm daily briefings that keep you informed."
  const description = isJa ? `${descriptionBase}${descriptionSuffixJa}` : `${descriptionBase}${descriptionSuffixEn}`
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
  searchParams: { gentle?: string; allow_important?: string; from?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const gentle = getGentleFromSearchParams(searchParams)
  const allowImportant = getAllowImportantFromSearchParams(searchParams)
  const fromRoot = String(searchParams?.from || '') === 'root'
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
  if (gentle && !allowImportant) sp.set('allow_important', '0')
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
  const normalizeDailyDate = (dateValue: string): string => {
    if (!dateValue) return ''
    return dateValue.includes('T') ? dateValue.slice(0, 10) : dateValue
  }
  const latestDailyDate = normalizeDailyDate((data as any)?.daily_latest?.date_local ?? '')
  const dailyHref = latestDailyDate ? `/${country}/daily/${latestDailyDate}` : `/${country}/daily`
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
  const importantFinal = importantTopics.length ? importantTopics : fb.important

  const fillHeartwarming = () => {
    const picked = [...heartwarmingTopics]
    if (picked.length >= 2) return picked.slice(0, 2)
    const hero = data.hero_topics || []
    for (const t of hero) {
      if (picked.length >= 2) break
      if (t?.category !== 'heartwarming') continue
      if (picked.some((x) => x.topic_id === t.topic_id)) continue
      picked.push(t)
    }
    if (picked.length < 2) {
      for (const t of fb.heartwarming) {
        if (picked.length >= 2) break
        if (picked.some((x) => x.topic_id === t.topic_id)) continue
        picked.push(t)
      }
    }
    return picked.slice(0, 2)
  }
  const heartwarmingFinal = heartwarmingTopics.length ? heartwarmingTopics : fillHeartwarming()

  const renderTopicCards = (
    items: Array<any>,
    options: { showCategory?: boolean; datePosition?: 'bottom' | 'topRight' } = {}
  ) => {
    if (!items.length) return null
    const showCategory = options.showCategory !== false
    const datePosition = options.datePosition ?? 'bottom'
    return (
      <div className={styles.heroGrid}>
        {items.map((x: any) => (
          <Link key={x.topic_id} href={`/${country}/news/n/${x.topic_id}`}>
            {(() => {
              const cat = String(x.category || 'unknown')
              const theme = getCategoryBadgeTheme(cat as any)
              const dateLabel = formatTopicListDate(x.last_source_published_at, locale)
              const isHeartwarming = cat === 'heartwarming'
              const distress = Number(x.distress_score ?? 0)
              const showWarning = distress >= 60 || (Boolean(x.high_arousal) && distress >= 30)
              return (
                <Card
                  clickable
                  className={`${styles.topCard}${isHeartwarming ? ` ${styles.topCardHeartwarming}` : ''}`}
                  style={{ ['--cat-color' as any]: theme.color } as any}
                >
                  {dateLabel && datePosition === 'topRight' ? (
                    <span className={`${styles.cardDate} ${styles.cardDateTopRight}`}>{dateLabel}</span>
                  ) : null}
                  {x.gentle_role_label ? (
                    <span
                      className={`${styles.roleBadge} ${
                        x.gentle_role === 'today'
                          ? styles.roleBadgeToday
                          : x.gentle_role === 'life'
                            ? styles.roleBadgeLife
                            : x.gentle_role === 'progress'
                              ? styles.roleBadgeProgress
                              : x.gentle_role === 'issues'
                                ? styles.roleBadgeIssues
                                : ''
                      }`}
                    >
                      {x.gentle_role_label}
                    </span>
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
    guide?: string
    items: Array<any>
    kind: 'heartwarming' | 'other'
    rightSlot?: React.ReactNode
  }) => {
    if (!options.items.length) return null
    return (
      <section className={styles.listSection}>
        {sectionHeader(options.title, undefined, { divider: 'top' }, options.rightSlot)}
        {options.guide ? <div className={styles.listGuide}>{options.guide}</div> : null}
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
                  ) : (
                    <div className={styles.listMeta}>
                      <span className={styles.listCategoryText} style={{ ['--cat-color' as any]: theme.color } as any}>
                        {getCategoryLabel(cat as any, locale)}
                      </span>
                      {sourceLabel ? <span>{sourceLabel}</span> : null}
                      {dateLabel ? <span>{dateLabel}</span> : null}
                    </div>
                  )}
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJSONLD),
        }}
      />

      <main style={{ position: 'relative' }}>
        {isPartial ? null : null}
        {fromRoot ? (
          <div style={{ marginBottom: 10 }}>
            <Link
              href="/?stay=1"
              style={{
                fontSize: '0.88rem',
                color: 'var(--muted)',
                textDecoration: 'underline',
              }}
            >
              {isJa ? '国と言語を変更' : 'Change country & language'}
            </Link>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.5rem' }}>{country === 'jp' ? 'やさしいニュース' : 'Calm News Top'}</h1>
          {isPartial ? (
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>部分取得（partial）</span>
          ) : (
            <span />
          )}
        </div>

      <div style={{ height: 12 }} />
      <div
        style={{
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 12,
          padding: '10px 12px',
          color: 'var(--text)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          background: '#fff',
        }}
      >
        {locale === 'ja' ? (
          <>
            煽られない。置いていかれない。
            <br />
            まずは、今日のニュース4選から。
          </>
        ) : (
          <>
            No hype. No feeling left behind.
            <br />
            First, 4 selected news stories from today.
          </>
        )}
      </div>

      <div style={{ height: 12 }} />
      <div style={{ height: 12 }} />

      <section style={{ marginBottom: '1.5rem' }}>
        {sectionHeader(
          locale === 'ja' ? '最新トップニュース4選' : 'Top News (4)',
          undefined,
          { divider: 'none' },
          !isPartial ? (
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', opacity: 0.6 }}>
              updated:{' '}
              {new Date(data.updatedAt).toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          ) : (
            <span />
          )
        )}
        {renderTopicCards(gentleFinal, { showCategory: false, datePosition: 'topRight' }) ?? (
          <EmptyState
            title={country === 'jp' ? 'Gentle Newsがまだありません' : 'No Gentle News yet'}
            description={country === 'jp' ? 'しばらくしてからもう一度お試しください。' : 'Please try again later.'}
          />
        )}
        <div
          className={styles.shortcutHeading}
          style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginTop: 14, marginBottom: 6 }}
        >
          {locale === 'ja' ? 'おすすめの行き先' : 'Quick shortcuts'}
        </div>
        <div className={styles.shortcutRow}>
          <Link className={styles.shortcutChip} href={dailyHref}>
            {locale === 'ja' ? '🗞 今日の朝刊' : "🗞 Today's briefing"}
          </Link>
          <Link className={styles.shortcutChip} href={`#heartwarming`}>
            {locale === 'ja' ? '🤍 心温まる話' : '🤍 Heartwarming'}
          </Link>
          <Link className={styles.shortcutChip} href={`#must-know`}>
            {locale === 'ja' ? '📌 重要ニュース' : '📌 Must-know'}
          </Link>
        </div>
      </section>

      <section id="heartwarming" style={{ marginBottom: '1.5rem' }}>
        {renderListSection({
          title: locale === 'ja' ? '🤍 心温まる話' : '🤍 Heartwarming',
          guide: locale === 'ja' ? '今起こっている心温まる出来事をご紹介' : 'Two gentle moments to soften the day.',
          items: heartwarmingFinal,
          kind: 'heartwarming',
          rightSlot: (
            <Link className={styles.listMore} href={`/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}`}>
              {locale === 'ja' ? '心温まる話をもっと見る →' : 'See more heartwarming →'}
            </Link>
          ),
        }) ?? (
          <EmptyState
            title={country === 'jp' ? 'まだ心温まる話がありません' : 'No heartwarming topics yet'}
            description={country === 'jp' ? 'しばらくしてからもう一度お試しください。' : 'Please try again later.'}
            action={{ label: t.pages.home.seeMore, href: `/${country}/category/heartwarming${gentle ? '?gentle=1' : ''}` }}
          />
        )}
      </section>

      <section id="must-know" style={{ marginBottom: '1.5rem' }}>
        {renderListSection({
          title: locale === 'ja' ? '📌 大事な動き' : 'Must-know News',
          guide: locale === 'ja' ? '今世界で起こっている大事な動きを抜粋' : 'Other events worth noting, briefly.',
          items: importantFinal,
          kind: 'other',
          rightSlot: (
            <Link className={styles.listMore} href={`/${country}/news${gentle ? '?gentle=1' : ''}`}>
              {locale === 'ja' ? 'ニュース一覧へ →' : 'See all news →'}
            </Link>
          ),
        }) ?? (
          <EmptyState
            title={country === 'jp' ? '重要トピックスがありません' : 'No important topics'}
            description={country === 'jp' ? 'しばらくしてからもう一度お試しください。' : 'Please try again later.'}
            action={{ label: t.pages.home.seeMore, href: `/${country}/latest${gentle ? '?gentle=1' : ''}` }}
          />
        )}
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        {sectionHeader(locale === 'ja' ? '次に読むなら、こちら' : 'Take a breath, then continue', undefined, { divider: 'top' })}
        <div className={styles.listGuide}>
          {locale === 'ja' ? '今日の気分に合わせて、読みやすいものからどうぞ。' : 'After the briefing, pick what you want to read next.'}
        </div>
        <div className={styles.guideGrid}>
          <Link href={`/${country}/category/heartwarming?gentle=1`} className={styles.guideCardLink}>
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
          <Link href={dailyHref} className={styles.guideCardLink}>
            <div className={styles.guideCard}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {locale === 'ja' ? '🗞 今日の朝刊を見る' : "🗞 Today's briefing"}
              </div>
              <div className="tglMuted" style={{ fontSize: '0.92rem' }}>
                {locale === 'ja' ? '最新の朝刊へ案内します' : 'Go to the latest morning briefing.'}
              </div>
            </div>
          </Link>
        </div>
      </section>

      {isPartial && <PartialNotice country={country} />}
      </main>
    </>
  )
}


