'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { type TopicSummary } from '@/lib/tglApi'
import { getLocaleForCountry } from '@/lib/i18n'
import { formatTopicListDate } from '@/lib/topicDate'
import { loadSavedTopics, removeSavedKey, readSavedKeys, type SavedKey } from '@/lib/savedTopics'

export default function SavedPage() {
  const [savedTopics, setSavedTopics] = useState<TopicSummary[]>([])
  const [keys, setKeys] = useState<SavedKey[]>([])

  useEffect(() => {
    const run = async () => {
      const ks = readSavedKeys()
      setKeys(ks)
      const topics = await loadSavedTopics()
      setSavedTopics(topics)
    }
    void run()
  }, [])

  const handleRemove = (country: string, topicId: string) => {
    const key = `${country}:${topicId}`
    removeSavedKey(key)
    setKeys(readSavedKeys())
    setSavedTopics((prev) => prev.filter((t) => !(t.topic_id === topicId && t.country === country)))
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

      {keys.length > 0 ? (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {savedTopics.map((t) => {
            const locale = getLocaleForCountry(t.country as any) === 'ja' ? 'ja' : 'en'
            const dateLabel = formatTopicListDate(t.last_source_published_at, locale)
            return (
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
                      {dateLabel ? <span>{dateLabel}</span> : null}
                    </CardMeta>
                  </div>
                  <button
                    onClick={() => handleRemove(t.country, t.topic_id)}
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
            )
          })}
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

