export type GentleMode = boolean

export const GENTLE_STORAGE_KEY = 'tgl_gentle_mode'
export const GENTLE_ALLOW_IMPORTANT_STORAGE_KEY = 'tgl_gentle_allow_important_news'
export const GENTLE_EVER_STORAGE_KEY = 'tgl_gentle_mode_ever'

export const GENTLE_COOKIE_KEY = 'tgl_gentle_mode'
export const GENTLE_ALLOW_IMPORTANT_COOKIE_KEY = 'tgl_gentle_allow_important_news'
export const GENTLE_EVER_COOKIE_KEY = 'tgl_gentle_mode_ever'

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const parts = document.cookie.split(';').map((x) => x.trim())
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx <= 0) continue
    const k = p.slice(0, idx)
    const v = p.slice(idx + 1)
    if (k === name) return v
  }
  return null
}

function setCookieValue(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`
}

function readGentleCookie(): boolean | null {
  const v = getCookieValue(GENTLE_COOKIE_KEY)
  if (v === '1' || v === 'true') return true
  if (v === '0' || v === 'false') return false
  return null
}

export function hasEverEnabledGentle(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const ls = window.localStorage.getItem(GENTLE_EVER_STORAGE_KEY)
    if (ls === '1' || ls === 'true') return true
  } catch {
    // ignore
  }
  const c = getCookieValue(GENTLE_EVER_COOKIE_KEY)
  return c === '1' || c === 'true'
}

/**
 * gentleモード切替ヘルパー関数
 * URLに gentle クエリパラメータを付与する（gentle=1）
 */
export function addGentleToUrl(
  url: string,
  gentle: GentleMode | null,
  opts: { allowImportantNews?: boolean | null } = {}
): string {
  const [path, query] = url.split('?')
  const params = new URLSearchParams(query || '')

  if (gentle) {
    params.set('gentle', '1')
    let allowImportant = opts.allowImportantNews
    // allowImportantNews が未指定の場合はlocalStorageの選好を使う（UIからの遷移を最小変更で反映）
    if (allowImportant === null || allowImportant === undefined) {
      const pref = getPreferredGentleAllowImportantNews()
      if (pref !== null) allowImportant = pref
    }
    if (allowImportant === false) params.set('allow_important', '0')
    else params.delete('allow_important')
  } else {
    params.delete('gentle')
    params.delete('allow_important')
  }

  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}

/**
 * URLから現在のgentleモードを取得
 */
export function getGentleFromUrl(url: string): GentleMode {
  try {
    const urlObj = new URL(url, 'http://localhost')
    const v = urlObj.searchParams.get('gentle')
    return v === '1' || v === 'true'
  } catch {
    // URL解析失敗時はデフォルトを返す
  }
  return false
}

/**
 * searchParamsからgentleパラメータを取得（サーバーサイド用）
 */
export function getGentleFromSearchParams(
  searchParams: { gentle?: string } | { [key: string]: string | string[] | undefined }
): GentleMode {
  const gentleParam = typeof (searchParams as any).gentle === 'string' ? (searchParams as any).gentle : undefined
  return gentleParam === '1' || gentleParam === 'true'
}

export function getAllowImportantFromSearchParams(
  searchParams: { allow_important?: string } | { [key: string]: string | string[] | undefined }
): boolean {
  const v = typeof (searchParams as any).allow_important === 'string' ? (searchParams as any).allow_important : undefined
  return !(v === '0' || v === 'false')
}

/**
 * localStorageからgentleモード選択を取得
 */
export function getPreferredGentle(): GentleMode | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(GENTLE_STORAGE_KEY)
    if (stored === '1' || stored === 'true') return true
    if (stored === '0' || stored === 'false') return false
  } catch {
    // localStorageアクセス失敗時は無視
  }
  // fallback: cookie
  return readGentleCookie()
}

/**
 * localStorageにgentleモード選択を保存
 */
export function setPreferredGentle(gentle: GentleMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GENTLE_STORAGE_KEY, gentle ? '1' : '0')
    if (gentle) window.localStorage.setItem(GENTLE_EVER_STORAGE_KEY, '1')
  } catch {
    // localStorage保存失敗時は無視
  }
  // cookie: 180 days (guestでも保持できるように)
  setCookieValue(GENTLE_COOKIE_KEY, gentle ? '1' : '0', 60 * 60 * 24 * 180)
  if (gentle) setCookieValue(GENTLE_EVER_COOKIE_KEY, '1', 60 * 60 * 24 * 365)
}

export function getPreferredGentleAllowImportantNews(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(GENTLE_ALLOW_IMPORTANT_STORAGE_KEY)
    if (stored === '1' || stored === 'true') return true
    if (stored === '0' || stored === 'false') return false
  } catch {
    // ignore
  }
  return null
}

export function setPreferredGentleAllowImportantNews(allow: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GENTLE_ALLOW_IMPORTANT_STORAGE_KEY, allow ? '1' : '0')
  } catch {
    // ignore
  }
  // cookie: 180 days
  setCookieValue(GENTLE_ALLOW_IMPORTANT_COOKIE_KEY, allow ? '1' : '0', 60 * 60 * 24 * 180)
}

/**
 * 現在のURLにgentleモードを適用した新しいURLを生成
 */
export function getGentleSwitchedUrl(currentPath: string, gentle: GentleMode): string {
  return addGentleToUrl(currentPath, gentle)
}

