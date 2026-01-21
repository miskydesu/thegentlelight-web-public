'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '@/app/root.module.css'

type Country = 'us' | 'ca' | 'uk'

type Topic = {
  topic_id: string
  title: string
}

type HeadlinesTabsProps = {
  us: Topic[]
  ca: Topic[]
  uk: Topic[]
}

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

function getSavedCountry(): string | null {
  const COOKIE = 'tgl_country'
  const norm = (v: string | null) => String(v || '').trim().toLowerCase()
  const fromCookie = norm(readCookieValue(COOKIE))
  if (fromCookie) return fromCookie
  try {
    return norm(localStorage.getItem(COOKIE))
  } catch {
    return null
  }
}

export function HeadlinesTabs({ us, ca, uk }: HeadlinesTabsProps) {
  // SSRのHTMLは固定（US）。クライアントだけで初期タブを切り替える。
  const [active, setActive] = useState<Country>('us')

  useEffect(() => {
    const saved = getSavedCountry()
    if (saved === 'us' || saved === 'ca' || saved === 'uk') setActive(saved)
  }, [])

  const tabs = useMemo(
    () => [
      { code: 'us' as const, label: 'US' },
      { code: 'ca' as const, label: 'Canada' },
      { code: 'uk' as const, label: 'UK' },
    ],
    [],
  )

  const topicsMap: Record<Country, Topic[]> = { us, ca, uk }

  return (
    <div>
      <div className={styles.previewTabs} role="tablist" aria-label="news editions">
        {tabs.map((t) => (
          <button
            key={t.code}
            type="button"
            role="tab"
            aria-selected={active === t.code}
            className={`${styles.previewTab}${active === t.code ? ` ${styles.previewTabActive}` : ''}`}
            onClick={() => setActive(t.code)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.previewGrid}>
        {tabs.map((t) => (
          <div
            key={t.code}
            role="tabpanel"
            className={`${styles.previewPanel}${active === t.code ? '' : ` ${styles.previewPanelHidden}`}`}
          >
            <div className={styles.previewCol}>
              <div className={styles.previewTitle}>Headlines · {t.label}</div>
              <ul className={styles.previewList}>
                {(topicsMap[t.code] || []).map((topic) => (
                  <li key={topic.topic_id}>
                    <Link className={styles.previewLink} href={`/${t.code}/news/n/${topic.topic_id}`}>
                      {topic.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={styles.previewLinks} aria-label="headlines links">
                <span className={styles.previewLinkLabel}>Explore</span>
                <Link className={styles.previewLinkItem} href={`/${t.code}/news`}>
                  See more ({t.label})
                </Link>
                <span className={styles.previewLinkDot} aria-hidden="true">
                  ·
                </span>
                <Link className={styles.previewLinkItem} href={`/${t.code}`}>
                  {t.label} home
                </Link>
                <span className={styles.previewLinkDot} aria-hidden="true">
                  ·
                </span>
                <Link className={styles.previewLinkItem} href={`/${t.code}/category/heartwarming`}>
                  Heartwarming
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
