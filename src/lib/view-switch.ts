export type GentleMode = boolean

const GENTLE_STORAGE_KEY = 'tgl_gentle_mode'

/**
 * gentleモード切替ヘルパー関数
 * URLに gentle クエリパラメータを付与する（gentle=1）
 */
export function addGentleToUrl(url: string, gentle: GentleMode | null): string {
  const [path, query] = url.split('?')
  const params = new URLSearchParams(query || '')

  if (gentle) {
    params.set('gentle', '1')
  } else {
    params.delete('gentle')
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
  return null
}

/**
 * localStorageにgentleモード選択を保存
 */
export function setPreferredGentle(gentle: GentleMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GENTLE_STORAGE_KEY, gentle ? '1' : '0')
  } catch {
    // localStorage保存失敗時は無視
  }
}

/**
 * 現在のURLにgentleモードを適用した新しいURLを生成
 */
export function getGentleSwitchedUrl(currentPath: string, gentle: GentleMode): string {
  return addGentleToUrl(currentPath, gentle)
}

