import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import styles from './root.module.css'
import { getSiteBaseUrl } from '../lib/seo'
import { generateHreflang, generateWebSiteJSONLD } from '../lib/seo-helpers'

export function generateMetadata(): Metadata {
  const h = headers()
  const acceptLanguage = h.get('accept-language') ?? ''
  const isJa = /(^|,)\s*ja([-_][A-Za-z]+)?\s*(;|,|$)/i.test(acceptLanguage)

  const base = getSiteBaseUrl()
  const hreflang = generateHreflang('')

  // `/` は「国選択ページ」であることを明確化して、各国トップ（/us 等）が検索意図の入口になりやすいようにする
  const title = isJa ? '国と言語を選ぶ | The Gentle Light' : 'Choose your country | The Gentle Light'
  const description = isJa
    ? 'US/UK/CA/JP の4つのエディションから選べます。'
    : 'Choose an edition: US, UK, CA, or JP.'

  return {
    title,
    description,
    alternates: {
      canonical: base,
      // 入口（/）と各国トップ（/us,/uk,/ca,/jp）を相互に結ぶ
      languages: Object.fromEntries(hreflang.map((x) => [x.lang, x.url])),
    },
    // SEO方針:
    // - `/`（国選択）はUXの入口として残すが、検索結果は各国トップ（/jp,/us,/uk,/ca）を優先したい
    // - そのため `/` は noindex, follow（リンク評価は渡す）にする
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: base,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function Home() {
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''
  const b = imageBase ? imageBase.replace(/\/+$/, '') : ''
  const h = headers()
  const cookieStore = cookies()
  const savedCountry = (cookieStore.get('tgl_country')?.value || '').trim().toLowerCase()
  const headerCountry =
    h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || h.get('x-country-code') || ''
  const normalizedCountry = headerCountry.toUpperCase() === 'GB' ? 'UK' : headerCountry.toUpperCase()
  const detected =
    normalizedCountry === 'JP'
      ? 'jp'
      : normalizedCountry === 'US'
        ? 'us'
        : normalizedCountry === 'UK'
          ? 'uk'
          : normalizedCountry === 'CA'
            ? 'ca'
            : null
  const acceptLanguage = h.get('accept-language') ?? ''
  const isJa = detected === 'jp' || /(^|,)\s*ja([-_][A-Za-z]+)?\s*(;|,|$)/i.test(acceptLanguage)
  const logoKey = 'assets/brand/logo.png'
  const logoSrc = b ? `${b}/${logoKey}` : `/${logoKey}`

  const defaultOrder = [
    { code: 'us' as const, href: '/us' },
    { code: 'uk' as const, href: '/uk' },
    { code: 'ca' as const, href: '/ca' },
    { code: 'jp' as const, href: '/jp' },
  ]

  // 優先順位: ユーザーの明示選択（cookie） > Geo推定 > デフォルト
  const preferred =
    savedCountry === 'jp' || savedCountry === 'us' || savedCountry === 'uk' || savedCountry === 'ca'
      ? (savedCountry as 'us' | 'uk' | 'ca' | 'jp')
      : detected
  const ordered = preferred
    ? [defaultOrder.find((x) => x.code === preferred)!, ...defaultOrder.filter((x) => x.code !== preferred)]
    : defaultOrder

  const base = getSiteBaseUrl()
  const webSiteJSONLD = generateWebSiteJSONLD({ url: base, name: 'The Gentle Light' })

  return (
    <>
      {/* 選択した国を保存（cookie + localStorage）。/ は noindex だがUX改善のため保持する */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(() => {
  const COOKIE = 'tgl_country';
  const isValid = (v) => v === 'us' || v === 'uk' || v === 'ca' || v === 'jp';
  const hasCookie = () => (document.cookie || '').split(';').some((x) => x.trim().startsWith(COOKIE + '='));
  const setCookie = (v) => {
    try {
      document.cookie = COOKIE + '=' + encodeURIComponent(v) + '; Max-Age=31536000; Path=/; SameSite=Lax';
    } catch {}
  };
  // cookie が無いが localStorage にある場合、cookie を補完（次回アクセスでサーバ側も参照できる）
  try {
    if (!hasCookie()) {
      const v = (localStorage.getItem(COOKIE) || '').trim().toLowerCase();
      if (isValid(v)) setCookie(v);
    }
  } catch {}

  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[data-country]') : null;
    if (!a) return;
    const v = String(a.getAttribute('data-country') || '').trim().toLowerCase();
    if (!isValid(v)) return;
    setCookie(v);
    try { localStorage.setItem(COOKIE, v); } catch {}
  }, true);
})();
          `.trim(),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteJSONLD),
        }}
      />

      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.hero}>
            <div className={styles.logoRow}>
              <img className={styles.logo} src={logoSrc} alt="The Gentle Light" />
            </div>
            <p className={styles.tagline}>煽られない。でも世界に置いていかれない情報サイト</p>
          </section>

          <section className={styles.picker}>
            <div className={styles.pickerTitle}>
              {isJa ? 'あなたの国と言語を選んで下さい。' : 'Choose your country and language.'}
            </div>

            <div className={styles.grid}>
              {ordered.map((x) => {
                const label =
                  x.code === 'us'
                    ? isJa
                      ? 'アメリカ（英語）'
                      : 'United States'
                    : x.code === 'uk'
                      ? isJa
                        ? 'イギリス（英語）'
                        : 'United Kingdom'
                      : x.code === 'ca'
                        ? isJa
                          ? 'カナダ（英語）'
                          : 'Canada'
                        : isJa
                          ? '日本（日本語）'
                          : 'Japan'

                const meta =
                  x.code === 'jp' ? (isJa ? '日本語' : 'Japanese') : 'English'

                const aria =
                  isJa ? `${label}へ` : `Go to ${label} (${meta})`

                return (
                  <a
                    key={x.code}
                    className={styles.countryCard}
                    href={x.href}
                    aria-label={aria}
                    data-country={x.code}
                  >
                    <div>
                      <div className={styles.countryLabel}>{label}</div>
                      <div className={styles.countryMeta}>{meta}</div>
                    </div>
                    <span className={styles.arrow} aria-hidden="true">→</span>
                  </a>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

