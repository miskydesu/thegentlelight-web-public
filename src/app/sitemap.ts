import type { MetadataRoute } from 'next'
import { COUNTRIES } from '../lib/tglApi'

function getSiteBaseUrl(): string {
  // 推奨: サーバ側で SITE_BASE_URL を設定（例: https://stg.thegentlelight.org）
  const v = process.env.SITE_BASE_URL || process.env.NEXT_PUBLIC_SITE_BASE_URL
  if (v) return v.replace(/\/$/, '')
  // フォールバック（ローカル）
  return 'http://localhost:3000'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl()
  const now = new Date()

  // MVP: まずは「迷子にならない導線」の固定ページ群を載せる
  // topic/quotes/columns などは実装が揃ったタイミングで拡張する
  const routes: string[] = ['/', '/admin/login', '/admin/topics']
  for (const c of COUNTRIES) {
    routes.push(`/${c.code}`)
    routes.push(`/${c.code}/news`)
    routes.push(`/${c.code}/daily`)
  }

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }))
}


