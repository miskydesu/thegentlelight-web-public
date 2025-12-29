'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { type TopicSummary } from '@/lib/tglApi'

const STORAGE_KEY = 'tgl_saved_topics'

export default function SavedPage() {
  const [savedTopics, setSavedTopics] = useState<TopicSummary[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSavedTopics(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse saved topics', e)
      }
    }
  }, [])

  const handleRemove = (topicId: string) => {
    const updated = savedTopics.filter((t) => t.topic_id !== topicId)
    setSavedTopics(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>保存したトピック</h1>
        <Link
          href="/"
          style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          トップへ →
        </Link>
      </div>

      <div style={{ height: 12 }} />

      {savedTopics.length > 0 ? (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {savedTopics.map((t) => (
            <Card key={t.topic_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <Link href={`/${t.country}/news/n/${t.topic_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <CardTitle>{t.title}</CardTitle>
                  </Link>
                  {t.summary && (
                    <CardContent style={{ marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--muted)' }}>
                        {t.summary}
                      </p>
                    </CardContent>
                  )}
                  <CardMeta style={{ marginTop: '0.5rem' }}>
                    <span>{t.category}</span>
                    <span>{t.source_count} sources</span>
                    {t.last_source_published_at && (
                      <span>{new Date(t.last_source_published_at).toLocaleString()}</span>
                    )}
                  </CardMeta>
                </div>
                <button
                  onClick={() => handleRemove(t.topic_id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  削除
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="保存したトピックがありません"
          description="トピックを保存すると、ここに表示されます。"
          action={{ label: 'ニュース一覧へ', href: '/us/news' }}
        />
      )}
    </main>
  )
}

