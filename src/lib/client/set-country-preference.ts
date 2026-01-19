'use client'

import type { Country } from '@/lib/tglApi'

const COOKIE = 'tgl_country'

function isValidCountry(v: string): v is Country {
  return v === 'us' || v === 'uk' || v === 'ca' || v === 'jp'
}

/**
 * 国（=言語）選択を cookie と localStorage に保存する。
 * - ルートページ（/）の国選択と同じ永続化の意図
 * - Header/Footer/モバイルメニューで国を切り替えたときの「記憶」を担保する
 */
export function setCountryPreference(next: string) {
  const v = String(next || '').trim().toLowerCase()
  if (!isValidCountry(v)) return

  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${COOKIE}=${encodeURIComponent(v)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
  } catch {}

  try {
    localStorage.setItem(COOKIE, v)
  } catch {}
}

