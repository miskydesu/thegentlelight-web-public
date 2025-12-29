import { type Country } from './tglApi'
import { getLocaleForCountry, type Locale } from './i18n'

/**
 * 国切替のフォールバック実装
 * 優先順位：
 * 1. global_id が一致する同一ニュース（参照元）が、その国にも存在するなら同じトピック/記事へ遷移
 * 2. なければ今のカテゴリを維持して遷移
 * 3. それも無理なら国トップへ遷移
 * 
 * langパラメータは保持する（非デフォルト言語の場合のみ）
 */
export function getCountrySwitchUrl(
  fromCountry: Country,
  toCountry: Country,
  currentPath: string,
  currentCategory?: string,
  currentLang?: Locale | null
): string {
  // パスからカテゴリを抽出
  const categoryMatch = currentPath.match(/\/category\/([^/]+)/)
  const category = categoryMatch ? categoryMatch[1] : currentCategory

  // 言語パラメータを決定（非デフォルト言語の場合のみ保持）
  const toDefaultLang = getLocaleForCountry(toCountry)
  const langParam = currentLang && currentLang !== toDefaultLang ? `?lang=${currentLang}` : ''

  // カテゴリがある場合はカテゴリページへ、なければトップへ
  if (category) {
    return `/${toCountry}/category/${category}${langParam}`
  }

  // トップへ
  return `/${toCountry}${langParam}`
}

