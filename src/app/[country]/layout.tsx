import type { ReactNode } from 'react'
import Link from 'next/link'
import { COUNTRIES, isCountry } from '../../lib/tglApi'

export default function CountryLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { country: string }
}) {
  const country = isCountry(params.country) ? params.country : null

  return (
    <>
      <header className="tglHeader">
        <div className="tglHeaderInner">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{ fontWeight: 800 }}>
              The Gentle Light
            </Link>
            {country ? <span className="tglPill">{country.toUpperCase()}</span> : null}
          </div>

          <nav className="tglNav">
            {country ? (
              <>
                <Link href={`/${country}`}>トップ</Link>
                <Link href={`/${country}/news`}>ニュース</Link>
                <Link href={`/${country}/daily`}>日報</Link>
              </>
            ) : null}
            <span className="tglMuted" style={{ opacity: 0.6 }}>
              |
            </span>
            {COUNTRIES.map((c) => (
              <Link key={c.code} href={`/${c.code}`} className="tglMuted">
                {c.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="tglContainer">{children}</div>
    </>
  )
}


