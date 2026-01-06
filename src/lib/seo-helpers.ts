/**
 * SEOヘルパー関数（フェーズF2/F3）
 * - metadata生成（title/description/OGP）
 * - JSON-LD構造化データ生成
 * - canonical/hreflang生成
 */

import type { Metadata } from 'next'
import { getSiteBaseUrl, canonicalUrl, isProdSite } from './seo'
import type { Country } from './tglApi'

export type Locale = 'en' | 'ja'

export type SEOConfig = {
  title: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  canonical?: string
  hreflang?: Array<{ lang: string; url: string }>
  noindex?: boolean
}

/**
 * generateMetadata 用のヘルパー
 */
export function generateSEOMetadata(config: SEOConfig): Metadata {
  const base = getSiteBaseUrl()
  const canonical = config.canonical || canonicalUrl('/')
  // stg/dev/local はデフォルトで noindex（誤インデックス防止）
  const isNoindex = process.env.ROBOTS_NOINDEX === 'true' || !isProdSite() || config.noindex

  const hasImage = Boolean(config.image)
  const twitterCard: 'summary' | 'summary_large_image' = hasImage ? 'summary_large_image' : 'summary'

  const metadata: Metadata = {
    title: config.title,
    description: config.description,
    alternates: {
      canonical,
    },
    robots: isNoindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
    openGraph: {
      title: config.title,
      description: config.description,
      type: config.type || 'website',
      url: canonical,
      images: hasImage ? [{ url: config.image! }] : undefined,
      publishedTime: config.publishedTime,
      modifiedTime: config.modifiedTime,
    },
    twitter: {
      card: twitterCard,
      title: config.title,
      description: config.description,
      images: hasImage ? [config.image!] : undefined,
    },
  }

  // hreflang を追加（alternates.languages）
  if (config.hreflang && config.hreflang.length > 0) {
    metadata.alternates = {
      ...metadata.alternates,
      languages: Object.fromEntries(config.hreflang.map((h) => [h.lang, h.url])),
    }
  }

  return metadata
}

/**
 * JSON-LD構造化データ生成（Article）
 */
export function generateArticleJSONLD(config: {
  title: string
  description?: string
  url: string
  publishedTime?: string
  modifiedTime?: string
  author?: string
  image?: string
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.title,
    description: config.description,
    url: config.url,
    datePublished: config.publishedTime,
    dateModified: config.modifiedTime || config.publishedTime,
    author: config.author
      ? {
          '@type': 'Person',
          name: config.author,
        }
      : undefined,
    image: config.image,
  }
}

/**
 * JSON-LD構造化データ生成（BlogPosting）
 */
export function generateBlogPostingJSONLD(config: {
  title: string
  description?: string
  url: string
  publishedTime?: string
  modifiedTime?: string
  author?: string
  image?: string
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: config.title,
    description: config.description,
    url: config.url,
    datePublished: config.publishedTime,
    dateModified: config.modifiedTime || config.publishedTime,
    author: config.author
      ? {
          '@type': 'Person',
          name: config.author,
        }
      : undefined,
    image: config.image,
  }
}

/**
 * JSON-LD構造化データ生成（Quotation）
 */
export function generateQuotationJSONLD(config: {
  quoteText: string
  author: string
  source?: string
  url: string
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Quotation',
    text: config.quoteText,
    author: {
      '@type': 'Person',
      name: config.author,
    },
    citation: config.source,
    url: config.url,
  }
}

/**
 * JSON-LD構造化データ生成（WebSite）
 */
export function generateWebSiteJSONLD(config: { url?: string; name?: string }): object {
  const base = config.url || getSiteBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name || 'The Gentle Light',
    url: base,
  }
}

/**
 * JSON-LD構造化データ生成（BreadcrumbList）
 */
export function generateBreadcrumbListJSONLD(config: { items: Array<{ name: string; url: string }> }): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: config.items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

/**
 * hreflang生成（4カ国エディションの代替）
 *
 * 方針:
 * - このサイトは「国（=エディション）」が一次軸
 * - 同一URLの言語違い（/us/ja や ?lang=）は現状採用しない
 * - そのため hreflang は「4カ国の同じ意図のページ」を相互に結ぶ用途でのみ使う
 *
 * 例:
 * - /{country}（国別トップ）
 * - /{country}/today, /{country}/latest, /{country}/daily
 * - /{country}/category/{category}
 */
export function generateHreflang(pathWithinCountry: string): Array<{ lang: string; url: string }> {
  const base = getSiteBaseUrl()
  const p = (() => {
    const raw = String(pathWithinCountry || '')
    if (!raw) return ''
    return raw.startsWith('/') ? raw : `/${raw}`
  })()

  const countries: Array<{ country: Country; lang: string }> = [
    { country: 'us', lang: 'en-US' },
    { country: 'uk', lang: 'en-GB' },
    { country: 'ca', lang: 'en-CA' },
    { country: 'jp', lang: 'ja-JP' },
  ]

  const hreflang: Array<{ lang: string; url: string }> = countries.map((c) => ({
    lang: c.lang,
    url: `${base}/${c.country}${p}`,
  }))

  // x-default は国選択ページへ（強制リダイレクトしない入口）
  hreflang.push({ lang: 'x-default', url: `${base}/` })

  return hreflang
}

