'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, FormEvent } from 'react'
import { type Country } from '@/lib/tglApi'
import { Button } from '@/components/ui/Button'
import { useTranslations } from '@/lib/i18n'

export function NewsSearchForm({ country, initialQuery = '' }: { country: Country; initialQuery?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const t = useTranslations(country)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (query.trim()) {
      params.set('q', query.trim())
    } else {
      params.delete('q')
    }
    router.push(`/${country}/news?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
      <Button type="submit" variant="primary" size="sm">
        {t.common.search}
      </Button>
    </form>
  )
}

