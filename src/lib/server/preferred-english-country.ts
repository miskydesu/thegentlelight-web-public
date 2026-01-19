import { cookies, headers } from 'next/headers'
import type { Country } from '@/lib/tglApi'

/**
 * 国（=ニュース/朝刊の版）推定。
 * - 優先: cookie(tgl_country) > geo header > デフォルト(us)
 */
export type PreferredCountrySource = 'cookie' | 'geo' | 'default'

export function getCountryPreferenceHint(): { country: Country; source: PreferredCountrySource } {
  const cookieStore = cookies()
  const h = headers()

  const saved = (cookieStore.get('tgl_country')?.value || '').trim().toLowerCase()
  if (saved === 'us' || saved === 'ca' || saved === 'uk' || saved === 'jp') return { country: saved, source: 'cookie' }

  const raw =
    (h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || h.get('x-country-code') || '').trim().toUpperCase()
  const normalized = raw === 'GB' ? 'UK' : raw
  if (normalized === 'US') return { country: 'us', source: 'geo' }
  if (normalized === 'CA') return { country: 'ca', source: 'geo' }
  if (normalized === 'UK') return { country: 'uk', source: 'geo' }
  if (normalized === 'JP') return { country: 'jp', source: 'geo' }
  // 推定できない場合のおすすめはUS
  return { country: 'us', source: 'default' }
}

export function getPreferredCountry(): Country {
  return getCountryPreferenceHint().country
}

