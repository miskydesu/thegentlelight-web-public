'use client'

import { useEffect, useMemo, useState } from 'react'
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

export function WhenReadyActions({
  defaultCountry = 'us',
  className,
}: {
  defaultCountry?: Country
  className?: string
}) {
  // 初期HTMLは固定（defaultCountry）にして、cookie有無でのSSR/CSR差を出さない
  const [country, setCountry] = useState<Country>(defaultCountry)
  const [hasSaved, setHasSaved] = useState(false)

  useEffect(() => {
    const saved = getSavedCountry()
    if (!saved) return
    if (saved === 'us' || saved === 'ca' || saved === 'uk' || saved === 'jp') {
      setCountry(saved)
      setHasSaved(true)
      return
    }
    setHasSaved(true)
  }, [])

  const labelMap: Record<Country, string> = {
    us: 'US · Morning Briefing',
    ca: 'Canada · Morning Briefing',
    uk: 'UK · Morning Briefing',
    jp: 'Japan · Morning Briefing',
  }
  const primaryHref = `/${country}/daily/today`
  const primaryLabel = labelMap[country]

  const helperText = hasSaved ? 'Continue gently, when you’re ready.' : 'Choose an edition when you’re ready.'

  const switchTargets = useMemo(() => {
    const all: Country[] = ['us', 'ca', 'uk', 'jp']
    return all.filter((c) => c !== country)
  }, [country])

  return (
    <div className={className} style={{ textAlign: 'center' }}>
      <Link
        href={primaryHref}
        onClick={() => setCountryPreference(country)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 16px',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.18)',
          background: 'rgba(255,255,255,0.92)',
          color: 'var(--text)',
          fontWeight: 900,
          textDecoration: 'none',
          boxShadow: '0 12px 30px rgba(31,42,46,0.10)',
        }}
        aria-label={primaryLabel}
      >
        {primaryLabel}
      </Link>

      <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.55 }}>{helperText}</div>

      <details style={{ marginTop: 8 }}>
        <summary
          style={{
            cursor: 'pointer',
            color: 'var(--text)',
            fontSize: '0.92rem',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
            textUnderlineOffset: 3,
            display: 'inline-block',
          }}
        >
          Switch edition
        </summary>
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 14px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {switchTargets.map((target) => (
            <Link
              key={target}
              href={`/${target}/daily/today`}
              onClick={() => setCountryPreference(target)}
              style={{ color: 'var(--text)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
            >
              {labelMap[target]}
            </Link>
          ))}
          <Link
            href="/us/news"
            onClick={() => setCountryPreference('us')}
            style={{ color: 'var(--muted)', fontSize: '0.92rem', textDecoration: 'none' }}
          >
            US news
          </Link>
          <Link
            href="/ca/news"
            onClick={() => setCountryPreference('ca')}
            style={{ color: 'var(--muted)', fontSize: '0.92rem', textDecoration: 'none' }}
          >
            Canada news
          </Link>
          <Link
            href="/uk/news"
            onClick={() => setCountryPreference('uk')}
            style={{ color: 'var(--muted)', fontSize: '0.92rem', textDecoration: 'none' }}
          >
            UK news
          </Link>
        </div>
      </details>
    </div>
  )
}

