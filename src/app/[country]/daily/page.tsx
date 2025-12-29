import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchJson, isCountry, type DailyListResponse } from '../../../lib/tglApi'
import { canonicalUrl } from '../../../lib/seo'
import { useTranslations, getLocaleForCountry, type Locale } from '../../../lib/i18n'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'

export function generateMetadata({ params, searchParams }: { params: { country: string }; searchParams: { lang?: string } }) {
  const country = params.country
  return {
    alternates: {
      canonical: canonicalUrl(`/${country}/daily`),
    },
  }
}

export default async function DailyIndex({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { lang?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = searchParams.lang === 'en' || searchParams.lang === 'ja' ? searchParams.lang : getLocaleForCountry(country)
  const data = await fetchJson<DailyListResponse>(`/v1/${country}/daily?lang=${lang}`, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)
  const t = useTranslations(country, lang)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>{country === 'jp' ? '日報' : 'Daily'}</h1>
        {isPartial && <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>}
      </div>

      <div style={{ height: 12 }} />

      {data.days?.length ? (
        <>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {data.days.map((d) => {
              // APIのdateLocalはISOっぽい文字列が来るので、YYYY-MM-DDに寄せる（表示/リンク用）
              const date = d.dateLocal.slice(0, 10)
              return (
                <Link key={d.dateLocal} href={`/${country}/daily/${date}`}>
                  <Card clickable>
                    <CardTitle>{date}</CardTitle>
                    <CardMeta style={{ marginTop: '0.5rem' }}>
                      <span>{d.topicCount} topics</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{d.status}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        updated {new Date(d.updatedAt).toLocaleString()}
                      </span>
                    </CardMeta>
                  </Card>
                </Link>
              )
            })}
          </div>
          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={country === 'jp' ? 'まだ日報がありません' : 'No daily digests yet'}
          description={country === 'jp' ? '先に daily generate を実行してください。' : 'Please run daily generate first.'}
          action={{ label: t.nav.top, href: `/${country}` }}
        />
      )}
    </main>
  )
}


