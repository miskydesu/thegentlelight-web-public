import { type Country } from './tglApi'
import { getLocaleForCountry, type Locale } from './i18n'

const LANG_STORAGE_KEY = 'tgl_preferred_lang'

/**
 * 言語切替ヘルパー関数
 * URLにlangクエリパラメータを付与する
 */
export function addLangToUrl(url: string, lang: Locale | null): string {
  if (!lang) return url

  const [path, query] = url.split('?')
  const params = new URLSearchParams(query || '')
  
  // デフォルト言語の場合はlangパラメータを削除
  const defaultLang = getDefaultLangForUrl(url)
  if (lang === defaultLang) {
    params.delete('lang')
  } else {
    params.set('lang', lang)
  }

  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}

/**
 * URLから現在の言語を取得（クエリパラメータ or デフォルト）
 */
export function getLangFromUrl(url: string, country: Country): Locale {
  try {
    const urlObj = new URL(url, 'http://localhost')
    const langParam = urlObj.searchParams.get('lang')
    if (langParam === 'en' || langParam === 'ja') {
      return langParam
    }
  } catch {
    // URL解析失敗時はデフォルト言語を返す
  }
  return getLocaleForCountry(country)
}

/**
 * URLから国を推測（パスから）
 */
function getDefaultLangForUrl(url: string): Locale | null {
  if (url.includes('/jp/')) return 'ja'
  if (url.includes('/us/') || url.includes('/uk/') || url.includes('/ca/')) return 'en'
  return null
}

/**
 * localStorageから言語選択を取得
 */
export function getPreferredLang(country: Country): Locale | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'en' || stored === 'ja') {
      return stored
    }
  } catch {
    // localStorageアクセス失敗時は無視
  }
  return null
}

/**
 * localStorageに言語選択を保存
 */
export function setPreferredLang(lang: Locale): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // localStorage保存失敗時は無視
  }
}

/**
 * 現在のURLに言語を適用した新しいURLを生成
 */
export function getLangSwitchedUrl(currentPath: string, currentCountry: Country, targetLang: Locale): string {
  const defaultLang = getLocaleForCountry(currentCountry)
  
  // デフォルト言語の場合はlangパラメータを削除
  if (targetLang === defaultLang) {
    const [path, query] = currentPath.split('?')
    const params = new URLSearchParams(query || '')
    params.delete('lang')
    const queryString = params.toString()
    return queryString ? `${path}?${queryString}` : path
  }
  
  // 非デフォルト言語の場合はlangパラメータを追加/更新
  return addLangToUrl(currentPath, targetLang)
}

