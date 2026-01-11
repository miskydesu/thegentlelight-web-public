'use client'

import React from 'react'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

export function ExternalLinkWithConfirm({
  href,
  isJa,
  className,
  rel,
  target,
  children,
}: {
  href: string
  isJa: boolean
  className?: string
  rel?: string
  target?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const message = isJa ? '外部サイトに移動します。よろしいですか？' : 'You are about to open an external site. Continue?'
  const label = isJa ? '外部サイト確認' : 'External link confirmation'

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <a
          href={href}
          className={className}
          target={target ?? '_blank'}
          rel={rel ?? 'noreferrer'}
          onClick={(e) => {
            // Use the same modal tech as Region/Lang switch (Radix Dialog).
            // We prevent the navigation here and open it only after the user confirms.
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
        >
          {children}
        </a>
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
          aria-label={label}
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
            padding: 16,
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
            <Dialog.Title style={{ fontWeight: 800 }}>{isJa ? '外部サイトへ移動' : 'Open external site'}</Dialog.Title>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>{message}</div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Dialog.Close asChild>
              <button
                type="button"
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  background: '#fff',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {isJa ? 'キャンセル' : 'Cancel'}
              </button>
            </Dialog.Close>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                const t = target ?? '_blank'
                // Best-effort: open with noopener/noreferrer in a new tab.
                // (rel attr works only for real <a> navigation; window.open uses feature flags.)
                if (t === '_self') {
                  window.location.assign(href)
                } else {
                  window.open(href, t, 'noopener,noreferrer')
                }
              }}
              style={{
                borderRadius: 10,
                border: '1px solid var(--border)',
                padding: '10px 12px',
                background: '#0b5394',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {isJa ? '移動する' : 'Continue'}
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
            {isJa ? 'Escキーでも閉じられます' : 'Press Esc to close'}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

