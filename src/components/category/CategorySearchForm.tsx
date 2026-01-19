'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type Country } from '@/lib/tglApi'
import { Button } from '@/components/ui/Button'
import { getLocaleForCountry, getTranslationsForCountry } from '@/lib/i18n'

export function CategorySearchForm({
  country,
  category,
  initialQuery = '',
}: {
  country: Country
  category: string
  initialQuery?: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const t = getTranslationsForCountry(country)
  const locale = getLocaleForCountry(country) === 'ja' ? 'ja' : 'en'

  const labels = useMemo(() => {
    return locale === 'ja'
      ? {
          title: 'このカテゴリで探す',
          hint: '気になる言葉で絞る（任意）',
          clear: 'クリア',
        }
      : {
          title: 'Search within this category',
          hint: 'Filter by a keyword (optional)',
          clear: 'Clear',
        }
  }, [locale])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const params = new URLSearchParams(sp?.toString() || '')
    const q = query.trim()
    if (q) params.set('q', q)
    else params.delete('q')

    // ページングはリセット
    params.delete('cursor')

    // view系は維持（gentle / allow_important）
    // それ以外は、カテゴリ棚の正URL運用を壊さないため維持しない（limit等は任意）
    const keep = new URLSearchParams()
    const gentle = params.get('gentle')
    const allowImportant = params.get('allow_important')
    if (gentle) keep.set('gentle', gentle)
    if (allowImportant) keep.set('allow_important', allowImportant)
    if (q) keep.set('q', q)

    const qs = keep.toString()
    router.push(`/${country}/category/${encodeURIComponent(category)}${qs ? `?${qs}` : ''}`)
  }

  const handleClear = () => {
    setQuery('')
    const params = new URLSearchParams(sp?.toString() || '')
    const keep = new URLSearchParams()
    const gentle = params.get('gentle')
    const allowImportant = params.get('allow_important')
    if (gentle) keep.set('gentle', gentle)
    if (allowImportant) keep.set('allow_important', allowImportant)
    const qs = keep.toString()
    router.push(`/${country}/category/${encodeURIComponent(category)}${qs ? `?${qs}` : ''}`)
  }

  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 14,
        padding: '10px 12px',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 900 }}>{labels.title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{labels.hint}</div>
      </div>
      <div style={{ height: 8 }} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
        <Button type="submit" variant="primary" size="sm">
          {t.common.search}
        </Button>
        {query.trim() ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              borderRadius: 999,
              padding: '0.4rem 0.65rem',
              fontSize: '0.85rem',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            {labels.clear}
          </button>
        ) : null}
      </form>
    </div>
  )
}

