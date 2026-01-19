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
    const qFromUrl = String(params.get('q') || '').trim()

    // カテゴリ棚は「正URL = /category/{category}」へ誘導する。
    // ただし検索語（q）がある場合は検索結果（noindex）として /news?q=...&category=... を維持する。
    if (!qFromUrl) {
      // keep view params if present
      const keep = new URLSearchParams()
      const gentle = params.get('gentle')
      const allowImportant = params.get('allow_important')
      if (gentle) keep.set('gentle', gentle)
      if (allowImportant) keep.set('allow_important', allowImportant)
      const qs = keep.toString()
      if (!nextCategory) return `/${country}/news${qs ? `?${qs}` : ''}`
      return `/${country}/category/${encodeURIComponent(nextCategory)}${qs ? `?${qs}` : ''}`
    }

    // search mode: stay on /news, and apply category filter there
    if (nextCategory) params.set('category', nextCategory)
    else params.delete('category')
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
    // 検索条件が変わったらページングをリセット
    params.delete('cursor')

    // カテゴリのみ（qなし）の場合はカテゴリページへ（正URL）
    if (!query.trim() && category) {
      const keep = new URLSearchParams()
      const gentle = params.get('gentle')
      const allowImportant = params.get('allow_important')
      if (gentle) keep.set('gentle', gentle)
      if (allowImportant) keep.set('allow_important', allowImportant)
      const qs = keep.toString()
      router.push(`/${country}/category/${encodeURIComponent(category)}${qs ? `?${qs}` : ''}`)
      return
    }

    // search mode（qあり）: categoryは任意で /news に保持（noindex運用）
    if (category) params.set('category', category)
    else params.delete('category')
    const qs = params.toString()
    router.push(`/${country}/news${qs ? `?${qs}` : ''}`)
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

