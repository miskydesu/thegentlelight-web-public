export type View = 'soft' | 'calm' | 'near'

const VIEW_STORAGE_KEY = 'tgl_preferred_view'

/**
 * 優しさ段階切替ヘルパー関数
 * URLにviewクエリパラメータを付与する
 */
export function addViewToUrl(url: string, view: View | null): string {
  if (!view) return url

  const [path, query] = url.split('?')
  const params = new URLSearchParams(query || '')
  
  // デフォルト（calm）の場合はviewパラメータを削除（SEO canonicalのため）
  if (view === 'calm') {
    params.delete('view')
  } else {
    params.set('view', view)
  }

  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}

/**
 * URLから現在の優しさ段階を取得（クエリパラメータ or デフォルト）
 */
export function getViewFromUrl(url: string): View {
  try {
    const urlObj = new URL(url, 'http://localhost')
    const viewParam = urlObj.searchParams.get('view')
    if (viewParam === 'soft' || viewParam === 'calm' || viewParam === 'near') {
      return viewParam
    }
  } catch {
    // URL解析失敗時はデフォルトを返す
  }
  return 'calm' // デフォルトはcalm
}

/**
 * searchParamsからviewパラメータを取得（サーバーサイド用）
 */
export function getViewFromSearchParams(searchParams: { view?: string } | { [key: string]: string | string[] | undefined }): View {
  const viewParam = typeof searchParams.view === 'string' ? searchParams.view : undefined
  if (viewParam === 'soft' || viewParam === 'calm' || viewParam === 'near') {
    return viewParam
  }
  return 'calm' // デフォルトはcalm
}

/**
 * localStorageから優しさ段階選択を取得
 */
export function getPreferredView(): View | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === 'soft' || stored === 'calm' || stored === 'near') {
      return stored
    }
  } catch {
    // localStorageアクセス失敗時は無視
  }
  return null
}

/**
 * localStorageに優しさ段階選択を保存
 */
export function setPreferredView(view: View): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view)
  } catch {
    // localStorage保存失敗時は無視
  }
}

/**
 * 現在のURLに優しさ段階を適用した新しいURLを生成
 */
export function getViewSwitchedUrl(currentPath: string, targetView: View): string {
  // デフォルト（calm）の場合はviewパラメータを削除
  if (targetView === 'calm') {
    const [path, query] = currentPath.split('?')
    const params = new URLSearchParams(query || '')
    params.delete('view')
    const queryString = params.toString()
    return queryString ? `${path}?${queryString}` : path
  }
  
  // 非デフォルトの場合はviewパラメータを追加/更新
  return addViewToUrl(currentPath, targetView)
}

