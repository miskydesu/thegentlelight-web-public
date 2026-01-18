'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { addGentleToUrl } from '@/lib/view-switch'

const SEEN_KEY = 'tgl_gentle_caution_seen_v1'

export function GentleCautionBadge({
  label,
  gentle,
  allowImportant,
  className,
  style,
  isJa,
  autoOpen,
}: {
  label: string
  gentle: boolean
  allowImportant: boolean
  isJa: boolean
  autoOpen?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const canPrompt = Boolean(autoOpen) && !gentle
  const title = isJa ? '読む前に、ひとつだけ' : 'A quick note before reading'
  const bodyLines = isJa
    ? ['この話題は、重く感じるかもしれません。', 'この場で「読み方」を選べます。']
    : ['This topic may feel emotionally intense.', 'Choose how you want to read it, right now.']
  const detailsTitle = isJa ? 'この選択について' : 'About this choice'
  const detailsGentle = isJa
    ? '「やわらかく読む」＝Gentle Mode をONにして、心の負担になる可能性があるトピックを非表示にします。'
    : '"Read gently" turns Gentle Mode ON and hides topics that may feel emotionally intense.'
  const detailsNormal = isJa ? '「そのまま読む」＝モード切り替えなどは行わずに読みます。' : 'Read as-is does not change your mode.'
  const detailsChange = isJa
    ? '設定の変更は、PCならフッター／スマホならメニューから行えます。'
    : 'You can change this anytime: footer on desktop, menu on mobile.'

  const gentleUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const qs = window.location.search ? window.location.search.replace(/^\?/, '') : ''
    const current = `${window.location.pathname}${qs ? `?${qs}` : ''}`
    return addGentleToUrl(current, true, { allowImportantNews: allowImportant })
  }, [allowImportant])

  useEffect(() => {
    if (!canPrompt) return
    if (typeof window === 'undefined') return
    try {
      const seen = window.sessionStorage.getItem(SEEN_KEY)
      if (seen) return
      window.sessionStorage.setItem(SEEN_KEY, '1')
      setOpen(true)
    } catch {
      // ignore
      setOpen(true)
    }
  }, [canPrompt])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={className}
          style={{
            ...style,
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
        >
          {label}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
        <Dialog.Content
          aria-label={isJa ? 'Gentle Mode の案内' : 'Gentle Mode guidance'}
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 51,
            width: 'calc(100vw - 2rem)',
            maxWidth: 520,
            borderRadius: 12,
            background: '#fff',
            border: '1px solid var(--border)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.12)',
            padding: 18,
          }}
        >
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label={isJa ? '閉じる' : 'Close'}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#fff',
                color: 'var(--text)',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </Dialog.Close>

          <div style={{ paddingRight: 44, marginBottom: 10 }}>
            <Dialog.Title style={{ fontWeight: 800 }}>{title}</Dialog.Title>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 14, lineHeight: 1.7 }}>
            {bodyLines.map((x, i) => (
              <div key={i}>{x}</div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 6 }}>{isJa ? 'おすすめ' : 'Recommended'}</div>
            <button
              type="button"
              onClick={() => {
                if (!gentleUrl) return
                window.location.href = gentleUrl
              }}
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                padding: '12px 12px',
                background: '#0b5394',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 800,
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 15 }}>{isJa ? '負担を減らす' : 'Read gently'}</div>
              <div style={{ marginTop: 2, fontSize: 12, opacity: 0.9, fontWeight: 600 }}>
                {isJa ? 'このような記事を表示しないようにする' : 'Reduce intensity and focus on key points'}
              </div>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Dialog.Close asChild>
              <button
                type="button"
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '12px 12px',
                  background: '#fff',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 800 }}>{isJa ? 'そのまま読む' : 'Read as-is'}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>{isJa ? '切り替えなし' : 'No mode change'}</div>
              </button>
            </Dialog.Close>

            <button
              type="button"
              onClick={() => {
                try {
                  window.history.back()
                } catch {
                  setOpen(false)
                }
              }}
              style={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                padding: '12px 12px',
                background: '#fff',
                color: 'var(--text)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 800 }}>{isJa ? '戻る' : 'Go back'}</div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>{isJa ? 'この記事は開かない' : "Don't open this article"}</div>
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 10 }}>
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--muted)',
                fontSize: 12,
                textDecoration: 'underline',
              }}
            >
              {detailsTitle}
            </button>
            {detailsOpen ? (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.65 }}>
                <div>{detailsGentle}</div>
                <div style={{ marginTop: 6 }}>{detailsNormal}</div>
                <div style={{ marginTop: 6 }}>{detailsChange}</div>
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

