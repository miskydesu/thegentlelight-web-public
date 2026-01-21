'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { setCountryPreference } from '@/lib/client/set-country-preference'

type Country = 'us' | 'ca' | 'uk' | 'jp'

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

function getSavedCountry(): Country | null {
  const COOKIE = 'tgl_country'
  const norm = (v: string | null) => String(v || '').trim().toLowerCase()
  const fromCookie = norm(readCookieValue(COOKIE))
  if (fromCookie === 'us' || fromCookie === 'ca' || fromCookie === 'uk' || fromCookie === 'jp') return fromCookie
  try {
    const ls = norm(localStorage.getItem(COOKIE))
    if (ls === 'us' || ls === 'ca' || ls === 'uk' || ls === 'jp') return ls
  } catch {
    // ignore
  }
  return null
}

export function RootEditionHint() {
  const [saved, setSaved] = useState<Country | null>(null)
  const [jpDetected, setJpDetected] = useState(false)

  useEffect(() => {
    setSaved(getSavedCountry())
    try {
      const lang = String(navigator.language || '').toLowerCase()
      const langs = Array.isArray(navigator.languages) ? navigator.languages.map((l) => String(l).toLowerCase()) : []
      const isJpLang = lang.startsWith('ja') || langs.some((l) => l.startsWith('ja'))
      setJpDetected(isJpLang)
    } catch {
      // ignore
    }
  }, [])

  if (!saved) {
    if (!jpDetected) return null
    return (
      <div style={{ marginTop: 10, fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        <Link
          href="/jp"
          onClick={() => setCountryPreference('jp')}
          style={{ color: 'var(--text)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
        >
          日本語版はこちら
        </Link>
      </div>
    )
  }

  const label = saved === 'us' ? 'US' : saved === 'ca' ? 'Canada' : saved === 'uk' ? 'UK' : 'Japan'

  return (
    <div style={{ marginTop: 10, fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.6 }}>
      <span style={{ fontWeight: 800, color: 'var(--text)' }}>Continue with your edition:</span> {label}
      <span style={{ margin: '0 10px', opacity: 0.6 }}>·</span>
      <Link
        href={`/${saved}/daily/today`}
        onClick={() => setCountryPreference(saved)}
        style={{ color: 'var(--text)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
      >
        Morning Briefing
      </Link>
      <span style={{ margin: '0 10px', opacity: 0.6 }}>·</span>
      <Link
        href={`/${saved}/news`}
        onClick={() => setCountryPreference(saved)}
        style={{ color: 'var(--text)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
      >
        News
      </Link>
    </div>
  )
}

