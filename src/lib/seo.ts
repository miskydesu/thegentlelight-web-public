export function getSiteBaseUrl(): string {
  // 環境変数: NEXT_PUBLIC_SITE_URL（prod/stg/devで設定）
  const v = process.env.NEXT_PUBLIC_SITE_URL
  if (v) return v.replace(/\/$/, '')
  // フォールバック（ローカル開発）
  return 'http://localhost:3000'
}

export function canonicalUrl(path: string): string {
  const base = getSiteBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}


