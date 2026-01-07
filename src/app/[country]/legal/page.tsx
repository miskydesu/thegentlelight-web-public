import Link from 'next/link'
import type { Country } from '@/lib/tglApi'
import { isCountry } from '@/lib/tglApi'
import { getLocaleForCountry } from '@/lib/i18n'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'

export const runtime = 'edge'

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const isJa = getLocaleForCountry(country) === 'ja' || country === 'jp'
  const hreflang = generateHreflang('/legal')
  return {
    title: isJa ? '利用規約・プライバシーポリシー｜The Gentle Light' : 'Terms of Service & Privacy Policy | The Gentle Light',
    description: isJa ? 'サービス利用規約とプライバシーポリシーの詳細です。' : 'Detailed terms of service and privacy policy for The Gentle Light.',
    keywords: isJa ? ['利用規約', 'プライバシー'] : ['terms', 'privacy'],
    alternates: {
      canonical: canonicalUrl(`/${country}/legal`),
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

function getText(country: Country) {
  const locale = getLocaleForCountry(country) === 'ja' ? 'ja' : 'en'
  const isJa = locale === 'ja'

  return {
    title: isJa ? '利用規約・プライバシーポリシー' : 'Terms & Privacy',
    termsTitle: isJa ? '利用規約' : 'Terms of Service',
    termsIntro: isJa
      ? '本サイトの利用にあたっては、以下の規約に同意していただく必要があります。'
      : 'By using this site, you agree to the following terms.',
    termsItems: isJa
      ? [
          '本サイトのコンテンツは情報提供を目的としており、投資判断等の根拠として使用しないでください。',
          '本サイトのコンテンツの無断転載・複製を禁止します。',
          '本サイトの利用により生じた損害について、当サイトは一切の責任を負いません。',
        ]
      : [
          'Content is provided for informational purposes only and should not be used as the basis for investment decisions.',
          'Unauthorized reproduction or redistribution of the content is prohibited.',
          'We are not liable for any damages arising from the use of this site.',
        ],
    privacyTitle: isJa ? 'プライバシーポリシー' : 'Privacy Policy',
    privacyIntro: isJa
      ? '本サイトでは、以下の情報を収集・利用する場合があります。'
      : 'We may collect and use the following information:',
    privacyItems: isJa
      ? ['アクセスログ（IPアドレス、アクセス日時など）', 'ブラウザ情報（User-Agentなど）', '保存したトピック（localStorageに保存、端末内のみ）']
      : ['Access logs (IP address, timestamps, etc.)', 'Browser information (User-Agent, etc.)', 'Saved topics (stored only on your device via localStorage)'],
    privacyOutro: isJa
      ? 'これらの情報は、サービスの改善や統計目的でのみ使用されます。'
      : 'This information is used only to improve the service and for statistical purposes.',
    backToTop: isJa ? '← トップへ戻る' : '← Back to Home',
  }
}

export default function CountryLegalPage({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { gentle?: string }
}) {
  const country = isCountry(params.country) ? (params.country as Country) : 'jp'
  const gentle = searchParams?.gentle === '1' || searchParams?.gentle === 'true'
  const t = getText(country)

  return (
    <main>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{t.termsTitle}</h1>
      <div className="tglMuted" style={{ marginBottom: '1rem' }}>
        {country === 'jp' ? '（プライバシーポリシーを含む）' : '(Includes privacy policy)'}
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>{t.termsTitle}</h2>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>{t.termsIntro}</p>
        <ul style={{ lineHeight: 1.75, paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
          {t.termsItems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>{t.privacyTitle}</h2>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>{t.privacyIntro}</p>
        <ul style={{ lineHeight: 1.75, paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
          {t.privacyItems.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p style={{ lineHeight: 1.75, marginTop: '0.5rem' }}>{t.privacyOutro}</p>
      </section>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/${country}${gentle ? '?gentle=1' : ''}`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
          {t.backToTop}
        </Link>
      </div>
    </main>
  )
}


