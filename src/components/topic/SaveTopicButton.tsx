'use client'

import { useEffect, useState } from 'react'
import type { TopicSummary } from '@/lib/tglApi'
import { isSaved, toggleSavedTopic } from '@/lib/savedTopics'
import { getUserToken, removeTopicFromServer, saveTopicToServer } from '@/lib/userAuth'
import { getLocaleForCountry } from '@/lib/i18n'

export function SaveTopicButton({ topic }: { topic: TopicSummary }) {
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const isJa = getLocaleForCountry(topic.country as any) === 'ja'

  useEffect(() => {
    setSaved(isSaved(topic.country, topic.topic_id))
  }, [topic.country, topic.topic_id])

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        const r = toggleSavedTopic(topic) // always update cookie/cache
        setSaved(r.saved)

        // if logged-in, also sync to DB (best-effort)
        const token = getUserToken()
        if (!token) return
        setBusy(true)
        ;(async () => {
          try {
            if (r.saved) await saveTopicToServer(topic.topic_id)
            else await removeTopicFromServer(topic.topic_id)
          } finally {
            setBusy(false)
          }
        })()
      }}
      style={{
        padding: '2px 8px',
        border: '1px solid rgba(0,0,0,0.18)',
        borderRadius: 6,
        background: saved ? '#000' : '#fff',
        color: saved ? '#fff' : 'var(--text)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        opacity: busy ? 0.6 : 1,
      }}
      aria-pressed={saved}
      title={saved ? (isJa ? '保存解除' : 'Unsave') : isJa ? '保存' : 'Save'}
    >
      {saved ? (isJa ? '保存済' : 'Saved') : isJa ? '保存' : 'Save'}
    </button>
  )
}


