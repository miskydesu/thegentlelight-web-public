export function getSiteBaseUrl(): string {
  const v = process.env.SITE_BASE_URL || process.env.NEXT_PUBLIC_SITE_BASE_URL
  if (v) return v.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export function canonicalUrl(path: string): string {
  const base = getSiteBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}


