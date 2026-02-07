import { permanentRedirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'

export const metadata = {
  // Root layout の title.template による重複を避けるため absolute を使用
  title: { absolute: 'このサイトについて - The Gentle Light' },
}

export default function AboutRedirect() {
  const cookieStore = cookies()
  const savedCountry = (cookieStore.get('tgl_country')?.value || '').trim().toLowerCase()
  const validSaved = savedCountry === 'us' || savedCountry === 'ca' || savedCountry === 'uk' || savedCountry === 'jp'

  const h = headers()
  const headerCountry =
    h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || h.get('x-country-code') || ''
  const normalizedCountry = headerCountry.toUpperCase() === 'GB' ? 'UK' : headerCountry.toUpperCase()
  const detected =
    normalizedCountry === 'US'
      ? 'us'
      : normalizedCountry === 'CA'
        ? 'ca'
        : normalizedCountry === 'UK'
          ? 'uk'
          : normalizedCountry === 'JP'
            ? 'jp'
            : null

  // Policy:
  // - Prefer last choice (cookie)
  // - Then Geo
  // - Fallback to English-first default (US)
  // About is language-based:
  // - JP → /jp/about
  // - EN (US/CA/UK) → /en/about
  const picked = (validSaved ? (savedCountry as 'us' | 'ca' | 'uk' | 'jp') : detected) || 'us'
  const target = picked === 'jp' ? '/jp/about' : '/en/about'
  permanentRedirect(target)
}

