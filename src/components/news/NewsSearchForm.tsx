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
    // 検索語（q）がある場合も、カテゴリ内検索として /category/{category}?q=... に寄せる（q付きは noindex 運用）
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

    // search mode: /news は検索ハブ。カテゴリを選んだら「読む棚」へ移動（カテゴリ内検索）。
    // - All（カテゴリ無し）は /news?q=... に戻す
    // - view系は維持
    const keep = new URLSearchParams()
    const gentle = params.get('gentle')
    const allowImportant = params.get('allow_important')
    if (gentle) keep.set('gentle', gentle)
    if (allowImportant) keep.set('allow_important', allowImportant)
    keep.set('q', qFromUrl)
    const qs = keep.toString()
    if (!nextCategory) return `/${country}/news?${qs}`
    return `/${country}/category/${encodeURIComponent(nextCategory)}?${qs}`
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

    // search mode（qあり）:
    // - カテゴリ指定あり: /category/{category}?q=...（カテゴリ内検索 / noindex運用）
    // - カテゴリ指定なし: /news?q=...（検索ハブ / noindex運用）
    const q = query.trim()
    const keep = new URLSearchParams()
    const gentle = params.get('gentle')
    const allowImportant = params.get('allow_important')
    if (gentle) keep.set('gentle', gentle)
    if (allowImportant) keep.set('allow_important', allowImportant)
    keep.set('q', q)
    const qs = keep.toString()
    if (category) {
      router.push(`/${country}/category/${encodeURIComponent(category)}?${qs}`)
    } else {
      router.push(`/${country}/news?${qs}`)
    }
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

