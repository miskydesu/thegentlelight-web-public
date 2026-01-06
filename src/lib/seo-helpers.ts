/**
 * SEOヘルパー関数（フェーズF2/F3）
 * - metadata生成（title/description/OGP）
 * - JSON-LD構造化データ生成
 * - canonical/hreflang生成
 */

import type { Metadata } from 'next'
import { getSiteBaseUrl, canonicalUrl } from './seo'
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
  const isNoindex = process.env.ROBOTS_NOINDEX === 'true' || config.noindex

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
      images: config.image ? [{ url: config.image }] : undefined,
      publishedTime: config.publishedTime,
      modifiedTime: config.modifiedTime,
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      images: config.image ? [config.image] : undefined,
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
 * hreflang生成（国×言語の代替）
 * 言語別の同等ページが存在する場合のみ生成
 */
export function generateHreflang(
  country: Country,
  path: string,
  availableLangs: Locale[]
): Array<{ lang: string; url: string }> {
  const base = getSiteBaseUrl()
  const hreflang: Array<{ lang: string; url: string }> = []

  // デフォルト言語（国に応じた標準言語）
  const defaultLang = country === 'jp' ? 'ja' : 'en'
  const otherLang = defaultLang === 'en' ? 'ja' : 'en'

  // デフォルト言語版（view無しURL）
  if (availableLangs.includes(defaultLang)) {
    hreflang.push({
      lang: defaultLang === 'en' ? 'en-US' : 'ja-JP',
      url: `${base}/${country}${path}`,
    })
  }

  // もう一方の言語版（?lang=パラメータ付きURL）
  if (availableLangs.includes(otherLang)) {
    const langParam = otherLang === 'en' ? 'en' : 'ja'
    hreflang.push({
      lang: otherLang === 'en' ? 'en-US' : 'ja-JP',
      url: `${base}/${country}${path}?lang=${langParam}`,
    })
  }

  // x-default（デフォルト言語版）
  if (hreflang.length > 0) {
    hreflang.push({
      lang: 'x-default',
      url: `${base}/${country}${path}`,
    })
  }

  return hreflang
}

