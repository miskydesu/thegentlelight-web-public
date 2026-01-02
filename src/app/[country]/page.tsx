import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, isCountry, type HomeResponse } from '../../lib/tglApi'
import { canonicalUrl, getSiteBaseUrl } from '../../lib/seo'
import { useTranslations, getLocaleForCountry, type Locale } from '../../lib/i18n'
import { generateSEOMetadata, generateHreflang } from '../../lib/seo-helpers'
import { getGentleFromSearchParams } from '../../lib/view-switch'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'

export async function generateMetadata({
  params,
}: {
  params: { country: string }
}) {
  const country = params.country
  if (!isCountry(country)) return {}

  const lang: Locale = getLocaleForCountry(country)
  const base = getSiteBaseUrl()
  const path = ''
  const canonicalPath = `/${country}`

  // 利用可能な言語（デフォルト言語は常に利用可能）
  const availableLangs: Locale[] = [getLocaleForCountry(country)]
  const hreflang = generateHreflang(country, path, availableLangs)

  const countryName = country.toUpperCase()
  const title = country === 'jp' ? `${countryName} ニュース` : `${countryName} News`
  const description =
    country === 'jp'
      ? '優しく、静かに、世界のニュースを届けます'
      : 'Gentle news from around the world'

  return generateSEOMetadata({
    title,
    description,
    type: 'website',
    canonical: `${base}${canonicalPath}`,
    hreflang,
  })
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

  const sp = new URLSearchParams()
  if (gentle) sp.set('gentle', '1')
  const qs = sp.toString()
  const data = await fetchJson<HomeResponse>(`/v1/${country}/home${qs ? `?${qs}` : ''}`, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)
  const t = useTranslations(country, lang)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.5rem' }}>{country.toUpperCase()} {t.pages.home.title}</h1>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>{t.pages.home.heroTopics}</h2>
          <Link
            href={`/${country}/news`}
            style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
          >
            {t.pages.home.seeMore}
          </Link>
        </div>

        <div style={{ height: 8 }} />

        {data.hero_topics?.length ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {data.hero_topics.map((t) => (
              <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`}>
                <Card clickable>
                  <CardTitle>{t.title}</CardTitle>
                  <CardMeta style={{ marginTop: '0.5rem' }}>
                    <span>{t.category}</span>
                    <span>{t.source_count} sources</span>
                    {t.high_arousal ? <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>high arousal</span> : null}
                  </CardMeta>
                </Card>
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
  )
}


