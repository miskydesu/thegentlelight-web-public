'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { type Country } from '@/lib/tglApi'
import { Button } from '@/components/ui/Button'
import { getTranslationsForCountry, getLocaleForCountry } from '@/lib/i18n'
import { CATEGORIES, getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import styles from './NewsSearchForm.module.css'

export function NewsSearchForm({
  country,
  initialQuery = '',
  initialCategory = '',
}: {
  country: Country
  initialQuery?: string
  initialCategory?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const t = getTranslationsForCountry(country)
  const locale = getLocaleForCountry(country) === 'ja' ? 'ja' : 'en'

  const buildHrefWithCategory = (nextCategory: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    // category
    if (nextCategory) params.set('category', nextCategory)
    else params.delete('category')
    // keep q as-is from URL (avoid applying unsaved input)
    // paging reset
    params.delete('cursor')
    const qs = params.toString()
    return `/${country}/news${qs ? `?${qs}` : ''}`
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (query.trim()) {
      params.set('q', query.trim())
    } else {
      params.delete('q')
    }
    if (category) {
      params.set('category', category)
    } else {
      params.delete('category')
    }
    // 検索条件が変わったらページングをリセット
    params.delete('cursor')
    router.push(`/${country}/news?${params.toString()}`)
  }

  return (
    <div className={styles.formWrap}>
      <form onSubmit={handleSubmit} className={styles.formRow}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.common.searchPlaceholder}
          style={{
            flex: '1 1 240px',
            padding: '0.6rem 0.9rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            backgroundColor: '#fff',
            color: 'var(--text)',
          }}
        />
        <Button type="submit" variant="primary" size="sm" className={styles.searchButton}>
          {t.common.search}
        </Button>
      </form>

      {/* カテゴリ棚（quotes のテーマ棚風） */}
      <div className={styles.categoryShelf} aria-label={locale === 'ja' ? 'カテゴリ' : 'Category'}>
        <div className={styles.categoryShelfHeader}>
          <div className={styles.categoryShelfTitle}>{locale === 'ja' ? 'カテゴリで絞り込む' : 'Filter by category'}</div>
          <div className={styles.categoryShelfHint}>{locale === 'ja' ? 'タップで絞り込み' : 'Tap to filter'}</div>
        </div>
        <div className={styles.categoryGrid}>
          <Link
            href={buildHrefWithCategory('')}
            className={`${styles.categoryItem} ${styles.categoryItemAll} ${!category ? styles.categoryItemActive : ''}`}
            aria-current={!category ? 'page' : undefined}
            onClick={() => setCategory('')}
            title={locale === 'ja' ? 'すべて' : 'All'}
            style={{ ['--cat-color' as any]: '#64748b' } as any}
          >
            <span className={styles.dot} />
            <span className={styles.categoryLabel}>{locale === 'ja' ? 'すべて' : 'All'}</span>
          </Link>

          {CATEGORIES.map((c) => {
            const active = category === c.code
            const theme = getCategoryBadgeTheme(c.code)
            const label = getCategoryLabel(c.code, locale)
            return (
              <Link
                key={c.code}
                href={buildHrefWithCategory(c.code)}
                className={`${styles.categoryItem} ${active ? styles.categoryItemActive : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setCategory(c.code)}
                title={label}
                style={{ ['--cat-color' as any]: theme.color } as any}
              >
                <span className={styles.dot} />
                <span className={styles.categoryLabel}>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

