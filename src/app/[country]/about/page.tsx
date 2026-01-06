import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isCountry } from '@/lib/tglApi'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import styles from './about.module.css'
import { canonicalUrl, getSiteBaseUrl } from '@/lib/seo'
import { generateHreflang, generateBreadcrumbListJSONLD } from '@/lib/seo-helpers'

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const isJa = country === 'jp'
  const canonical = canonicalUrl(`/${country}/about`)
  const hreflang = generateHreflang('/about')
  return {
    title: `${isJa ? 'このサイトについて' : 'About'} - The Gentle Light`,
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default function AboutPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()
  const isJa = country === 'jp'
  const base = getSiteBaseUrl()
  const breadcrumbJSONLD = generateBreadcrumbListJSONLD({
    items: [
      { name: 'The Gentle Light', url: `${base}/` },
      { name: isJa ? 'トップ' : 'Home', url: `${base}/${country}` },
      { name: isJa ? 'このサイトについて' : 'About', url: `${base}/${country}/about` },
    ],
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJSONLD),
        }}
      />
      <main>
      <div className={styles.pageHeader}>
        <Link
          href={`/${country}`}
          style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          {isJa ? '← トップ' : '← Home'}
        </Link>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {isJa ? 'このサイトについて' : 'About'}
        </span>
      </div>

      <div style={{ height: 12 }} />

      <Card className={styles.topCard}>
        <CardTitle as="h1" style={{ fontSize: '1.45rem', marginBottom: 10 }}>
          <span className={styles.cardTitleAccent}>{isJa ? 'このサイトについて' : 'About this site'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          {isJa
            ? '置いていかれない。煽られない。静かに要点へ。'
            : 'Keep up without being pushed around by headlines—quietly, and with clarity.'}
        </CardContent>
      </Card>

      <div style={{ height: 12 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>{isJa ? '編集方針' : 'Editorial policy'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          {isJa ? (
            <>
              <p>速報感よりも、整理された要約と背景説明を重視します。</p>
              <p>読み疲れしないで、毎日戻ってこれることを目指しています。</p>
            </>
          ) : (
            <>
              <p>We prioritize calm summaries and helpful context over breaking-news urgency.</p>
              <p>The goal is something you can come back to every day without feeling worn out.</p>
            </>
          )}
        </CardContent>
      </Card>

      <div style={{ height: 12 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>{isJa ? '収集元' : 'Sources'}</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          {isJa ? (
            <>
              <p>ニュースは複数の信頼できるソースから収集しています。</p>
              <p>各トピックには参照元へのリンクを提供しています。</p>
            </>
          ) : (
            <>
              <p>We collect news from multiple reputable sources.</p>
              <p>Each topic includes links to the original articles.</p>
            </>
          )}
        </CardContent>
      </Card>

      <div style={{ height: 12 }} />

      <Card className={styles.topCard}>
        <CardTitle className={styles.sectionTitle}>
          <span className={styles.cardTitleAccent}>FAQ</span>
        </CardTitle>
        <CardContent className={styles.bodyText}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {isJa ? '更新頻度は？' : 'How often is it updated?'}
            </div>
            <div className={styles.bodyText}>
              {isJa ? '1時間に1度、最新のニュースを収集・整理しています。' : 'We collect and organize updates roughly once per hour.'}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {isJa ? 'どの国に対応していますか？' : 'Which editions are available?'}
            </div>
            <div className={styles.bodyText}>
              {isJa ? 'US、CA、UK、JP の4つのエディションを提供しています。' : 'We currently provide four editions: US, CA, UK, and JP.'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link
          href={`/${country}`}
          style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          {isJa ? '← トップへ戻る' : '← Back to Home'}
        </Link>
      </div>
      </main>
    </>
  )
}


