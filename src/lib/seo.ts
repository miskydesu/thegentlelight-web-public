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

export function getCountrySeoMeta(country: 'us' | 'ca' | 'uk' | 'jp'): {
  /**
   * SERP/タブでの最小差分（略称OK）
   * 例: " - US"
   */
  titleSuffix: string
  /**
   * meta description 文末差分（正式名称）
   * 例: " (United States edition)"
   */
  descriptionSuffixEn: string
  /**
   * meta description 文末差分（日本語）
   * 例: "（Japan）"
   */
  descriptionSuffixJa: string
} {
  const titleLabel = country === 'us' ? 'US' : country === 'ca' ? 'Canada' : country === 'uk' ? 'UK' : 'Japan'
  const nameEn =
    country === 'us' ? 'United States' : country === 'ca' ? 'Canada' : country === 'uk' ? 'United Kingdom' : 'Japan'
  return {
    // タイトル末尾の国差分はハイフン（ASCII）で “ささやかに”
    titleSuffix: ` - ${titleLabel}`,
    descriptionSuffixEn: ` (${nameEn} edition)`,
    // 日本語ページでも国差分は英字で “ささやかに” 付ける（例: （Japan））
    descriptionSuffixJa: `（${nameEn}）`,
  }
}

export type IndexableTopicInput = {
  summary: string | null | undefined
  importance_score: number | null | undefined
  source_count: number | null | undefined
  high_arousal: boolean | null | undefined
  distress_score?: number | null | undefined
}

export function isIndexableTopic(input: IndexableTopicInput): boolean {
  const summary = String(input.summary || '').trim()
  if (!summary) return false

  const importance = Number.isFinite(Number(input.importance_score)) ? Number(input.importance_score) : 0
  const sources = Number.isFinite(Number(input.source_count)) ? Number(input.source_count) : 0
  const distress = Number.isFinite(Number(input.distress_score)) ? Number(input.distress_score) : null
  const highArousal = Boolean(input.high_arousal)

  // 品質担保（設計メモより重要度の目安は importance_score >= 10）
  if (!(importance >= 10 || sources >= 4)) return false
  if (highArousal) return false
  if (distress !== null && distress > 60) return false
  return true
}


