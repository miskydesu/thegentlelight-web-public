import type { MetadataRoute } from 'next'
import { getSiteBaseUrl, isProdSite } from '../lib/seo'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl()
  // stg/dev/local はデフォルトで noindex（誤インデックス防止）
  const noindex = process.env.ROBOTS_NOINDEX === 'true' || !isProdSite()
  if (noindex) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
      sitemap: `${base}/sitemap.xml`,
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}


