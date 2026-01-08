'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, FormEvent } from 'react'
import { type Country } from '@/lib/tglApi'
import { Button } from '@/components/ui/Button'
import { getTranslationsForCountry, getLocaleForCountry } from '@/lib/i18n'
import { CATEGORIES, getCategoryLabel } from '@/lib/categories'

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.common.searchPlaceholder}
        style={{
          flex: 1,
          padding: '0.6rem 0.9rem',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
        }}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{
          padding: '0.6rem 0.75rem',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          minWidth: 180,
        }}
        aria-label={locale === 'ja' ? 'カテゴリ' : 'Category'}
      >
        <option value="">{locale === 'ja' ? 'すべてのカテゴリ' : 'All categories'}</option>
        {CATEGORIES.map((c) => (
          <option key={c.code} value={c.code}>
            {getCategoryLabel(c.code, locale)}
          </option>
        ))}
      </select>
      <Button type="submit" variant="primary" size="sm">
        {t.common.search}
      </Button>
    </form>
  )
}

