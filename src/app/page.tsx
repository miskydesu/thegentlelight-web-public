import type { Metadata } from 'next'
import styles from './root.module.css'
import Link from 'next/link'
import { canonicalUrl } from '../lib/seo'
import { generateSEOMetadata, generateWebSiteJSONLD } from '../lib/seo-helpers'
import { fetchJson, type ApiMeta, type LatestResponse } from '../lib/tglApi'
import { CACHE_POLICY } from '../lib/cache-policy'
import { WhenReadyActions } from '@/components/root/WhenReadyActions'
import { HeadlinesTabs } from '@/components/root/HeadlinesTabs'

export function generateMetadata(): Metadata {
  const canonical = canonicalUrl('/')
  return generateSEOMetadata({
    title: 'The Gentle Light — News, without the noise.',
    description:
      'A calm editorial home for living with the news: reduce doomscrolling, ease information overload, and practice gentle news through digital minimalism, digital detox, and healthy tech boundaries. Start with guides, then choose your news edition (US / Canada / UK).',
    keywords: [
      'doomscrolling',
      'how to stop doomscrolling',
      'how to stop scrolling',
      'doom scroll',
      'infinite scrolling',
      'information overload',
      'gentle news',
      'how to use your phone less',
      'digital minimalism',
      'digital detox',
      'social media detox',
      'reduce screen time',
      'phone detox',
      'digital burnout',
      'healthy tech boundaries',
    ],
    canonical,
    // 仕様: / は x-default（国別の同等ページではない、グローバル入口）
    hreflang: [{ lang: 'x-default', url: canonical }],
  })
}

type ColumnListResponse = {
  columns: Array<{
    column_id: string
    title: string | null
    excerpt: string | null
    cover_image_key: string | null
    published_at: string | null
    updated_at: string | null
  }>
  meta: ApiMeta
}

type QuoteListResponse = {
  quotes: Array<{
    quote_id: string
    text?: string | null
    quote?: string | null
    author?: string | null
  }>
  meta?: ApiMeta
}

export default async function Home() {
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''
  const b = imageBase ? imageBase.replace(/\/+$/, '') : ''
  const logoKey = 'assets/brand/logo.png'
  const logoSrc = b ? `${b}/${logoKey}` : `/${logoKey}`
  const joinUrl = (baseUrl: string, key: string) => `${baseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`

  const base = canonicalUrl('/')
  const webSiteJSONLD = generateWebSiteJSONLD({ url: base, name: 'The Gentle Light' })

  // / はグローバル入口。見出しは全版をHTMLに含め、クライアントで初期タブのみ切替する。
  // - columns/quotes は /en に集約（代表として CA のデータを利用）
  // - headlines は US/CA/UK を各1〜2件（JPは除外）
  const [columns, usLatest, caLatest, ukLatest, quoteList] = await Promise.all([
    fetchJson<ColumnListResponse>(`/v1/ca/columns?limit=6`, { next: { revalidate: CACHE_POLICY.meta } }).catch(() => null),
    fetchJson<LatestResponse>(`/v1/us/latest?limit=3`, { next: { revalidate: CACHE_POLICY.meta } }).catch(() => null),
    fetchJson<LatestResponse>(`/v1/ca/latest?limit=3`, { next: { revalidate: CACHE_POLICY.meta } }).catch(() => null),
    fetchJson<LatestResponse>(`/v1/uk/latest?limit=3`, { next: { revalidate: CACHE_POLICY.meta } }).catch(() => null),
    fetchJson<QuoteListResponse>(`/v1/ca/quotes?limit=1`, { next: { revalidate: CACHE_POLICY.meta } }).catch(() => null),
  ])

  const pickTopics = (r: LatestResponse | null) =>
    (r?.topics || [])
      .map((t) => ({ topic_id: t.topic_id, title: String(t.title || '').trim() }))
      .filter((t) => t.topic_id && t.title)
      .slice(0, 3)

  const usTopics = pickTopics(usLatest)
  const caTopics = pickTopics(caLatest)
  const ukTopics = pickTopics(ukLatest)
  const firstQuote = (quoteList?.quotes || [])[0]
  const quoteText = String(firstQuote?.text || firstQuote?.quote || '').trim()
  const quoteAuthor = String(firstQuote?.author || '').trim()
  const fallbackQuote = 'Nothing can bring you peace but yourself.'
  const fallbackAuthor = 'Ralph Waldo Emerson'
  const displayQuoteText = quoteText || fallbackQuote
  const displayQuoteAuthor = quoteAuthor || fallbackAuthor

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteJSONLD),
        }}
      />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.heroSplit}>
            <section className={styles.heroCard}>
              <div className={styles.logoRow}>
                <img className={styles.logo} src={logoSrc} alt="The Gentle Light" />
              </div>
              <h1 className={styles.heroTitle}>News, without the noise.</h1>
              <p className={styles.heroLead}>An editorial home for staying informed calmly.</p>

              <div className={styles.ctaRow}>
                <Link className={styles.primaryCta} href="/en/columns">
                  Start with the Gentle Guide
                </Link>
              </div>
            </section>

            <section className={styles.afterHero}>
              <div className={styles.afterHeroInner}>
                <div className={styles.afterHeroTitle}>When you’re ready</div>
                <WhenReadyActions />
              </div>
            </section>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>The Gentle Guide</h2>
              <Link className={styles.sectionLink} href="/en/columns">
                Browse all →
              </Link>
            </div>
            <p className={styles.sectionDesc}>
              Evergreen guides on news anxiety, doomscrolling, and how to stay informed with a calmer relationship to the world.
            </p>

            <div className={styles.cardGrid}>
              {(columns?.columns || []).slice(0, 6).map((c, i) => {
                const useMedia = Boolean(c.cover_image_key) && (i === 0 || i === 3)
                const imgSrc = useMedia && b && c.cover_image_key ? joinUrl(b, c.cover_image_key) : null
                const v = c.published_at || c.updated_at || ''
                const img = imgSrc ? `${imgSrc}${v ? `?v=${encodeURIComponent(v)}` : ''}` : null
                return (
                  <Link
                    key={c.column_id}
                    className={`${styles.card} ${useMedia ? styles.cardWithMedia : ''}`}
                    href={`/en/columns/${c.column_id}`}
                  >
                    <div className={styles.cardInner}>
                      {useMedia && img ? (
                        <div className={styles.cardMedia} aria-hidden="true">
                          <img className={styles.cardMediaImg} src={img} alt="" loading="lazy" />
                        </div>
                      ) : null}
                      <div className={styles.cardBody}>
                        <div className={styles.cardTitle}>{c.title || '—'}</div>
                        {c.excerpt ? <div className={styles.cardExcerpt}>{c.excerpt}</div> : null}
                        <div className={styles.cardReadMore}>Read →</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          <div className={styles.editorialLine} aria-label="editorial note">
            Read slowly. You don’t need everything today.
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>A quiet look at recent headlines</h2>
              <div className={styles.sectionHint}>Headlines only—no urgency.</div>
            </div>

            <HeadlinesTabs us={usTopics} ca={caTopics} uk={ukTopics} />
          </section>

          <div className={styles.quoteCard} aria-label="quote preview">
            <p className={styles.quoteText}>“{displayQuoteText}”</p>
            <div className={styles.quoteAuthor}>— {displayQuoteAuthor}</div>
            <Link className={styles.quoteLink} href="/en/quotes">
              See more (Quotes)
            </Link>
          </div>

          <div className={styles.footerNote} aria-label="closing note">
            Take what you need. Leave the rest.
          </div>
        </div>
      </main>
    </>
  )
}

