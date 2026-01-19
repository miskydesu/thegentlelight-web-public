'use client'

import { useEffect } from 'react'
import type { Country } from '@/lib/tglApi'
import { setCountryPreference } from '@/lib/client/set-country-preference'

function readCookieValue(name: string): string | null {
  try {
    const parts = String(document.cookie || '')
      .split(';')
      .map((x) => x.trim())
    for (const p of parts) {
      const idx = p.indexOf('=')
      if (idx <= 0) continue
      const k = p.slice(0, idx)
      const v = p.slice(idx + 1)
      if (k === name) return decodeURIComponent(v || '')
    }
  } catch {
    // ignore
  }
  return null
}

function isValidCountry(v: string): v is Country {
  return v === 'us' || v === 'ca' || v === 'uk' || v === 'jp'
}

/**
 * 国別ページに直接着地したとき、ユーザーに選択を迫らずに country を保存する。
 * - cookie と localStorage のどちらかに「既に有効値」があれば上書きしない
 * - SPA遷移でも確実に動くよう client component で実装
 */
export function EnsureCountryPreference({ country }: { country: Country }) {
  useEffect(() => {
    const COOKIE = 'tgl_country'
    try {
      const c = String(readCookieValue(COOKIE) || '').trim().toLowerCase()
      if (isValidCountry(c)) return
      const ls = String(localStorage.getItem(COOKIE) || '').trim().toLowerCase()
      if (isValidCountry(ls)) return
      setCountryPreference(country)
    } catch {
      // ignore
    }
  }, [country])

  return null
}

