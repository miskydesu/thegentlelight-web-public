export function getSiteBaseUrl(): string {
  // 環境変数: NEXT_PUBLIC_SITE_URL（prod/stg/devで設定）
  const v = process.env.NEXT_PUBLIC_SITE_URL
  if (v) return v.replace(/\/$/, '')
  // フォールバック（ローカル開発）
  return 'http://localhost:3000'
}

/**
 * SEO運用:
 * - prod のみ index
 * - stg/dev/local は誤ってインデックスされないよう noindex をデフォルトにする
 */
export function isProdSite(): boolean {
  // Cloudflare/Vercelなどで環境を明示できる場合は、それを最優先する
  // 想定: APP_ENV=prod | stg
  const appEnv = (process.env.APP_ENV || '').toLowerCase()
  if (appEnv === 'prod') return true
  if (appEnv === 'stg') return false

  const base = getSiteBaseUrl()
  try {
    const u = base.includes('://') ? new URL(base) : new URL(`https://${base}`)
    const host = u.hostname.toLowerCase()
    return host === 'thegentlelight.org' || host === 'www.thegentlelight.org'
  } catch {
    return false
  }
}

export function canonicalUrl(path: string): string {
  const base = getSiteBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
  const cleanPath = p.replace(/\/$/, '') || '/'
  return `${base}${cleanPath}`
}


