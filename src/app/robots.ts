import type { MetadataRoute } from 'next'
import { getSiteBaseUrl, isProdSite } from '../lib/seo'
import { COUNTRIES } from '../lib/tglApi'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl()
  // stg/dev/local はデフォルトで noindex（誤インデックス防止）
  const noindex = process.env.ROBOTS_NOINDEX === 'true' || !isProdSite()
  const sitemaps = [
    `${base}/sitemap.xml`,
    ...COUNTRIES.map((c) => `${base}/${c.code}/sitemap.xml`),
  ]
  if (noindex) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
      sitemap: sitemaps,
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: sitemaps,
  }
}


