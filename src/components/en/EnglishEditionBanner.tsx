'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import type { Country } from '@/lib/tglApi'
import { setCountryPreference } from '@/lib/client/set-country-preference'
import { getUserToken, updateDefaultCountry } from '@/lib/userAuth'

type EnglishEdition = 'us' | 'ca' | 'uk'
type InferredSource = 'cookie' | 'geo' | 'default'

function readCookieValue(name: string): string | null {
  try {
    const parts = String(document.cookie || '')
      .split(';')
      .map((x) => x.trim())
    for (const p of parts) {
      const idx = p.indexOf('=')
      if (idx <= 0) continue
      const k = p.slice(0, idx)
      const v = p.slice(idx + 1)
      if (k === name) return decodeURIComponent(v || '')
    }
  } catch {
    // ignore
  }
  return null
}

function getSavedCountry(): 'us' | 'ca' | 'uk' | 'jp' | null {
  const COOKIE = 'tgl_country'
  const norm = (v: string | null) => String(v || '').trim().toLowerCase()
  const fromCookie = norm(readCookieValue(COOKIE))
  if (fromCookie === 'us' || fromCookie === 'ca' || fromCookie === 'uk' || fromCookie === 'jp') return fromCookie
  try {
    const ls = norm(localStorage.getItem(COOKIE))
    if (ls === 'us' || ls === 'ca' || ls === 'uk' || ls === 'jp') return ls
  } catch {
    // ignore
  }
  return null
}

export function EnglishEditionBanner({
  initialEdition,
  kind,
  inferredCountry,
  inferredSource,
}: {
  initialEdition: EnglishEdition
  kind: 'quotes' | 'columns'
  inferredCountry?: Country | null
  inferredSource?: InferredSource
}) {
  const router = useRouter()
  const [edition, setEdition] = useState<EnglishEdition>(initialEdition)
  const [decision, setDecision] = useState<'pending' | 'hide' | 'show'>('pending')

  // 仕様:
  // - cookie/LS に国が保存済みなら非表示（初回迷子だけ救う）
  // - 未保存でも geo 等で推定できるなら「自動保存して非表示」
  // - 推定もできず・未保存・未ログインのときだけ表示
  useEffect(() => {
    const saved = getSavedCountry()
    if (saved) {
      setDecision('hide')
      return
    }

    const source = inferredSource || 'default'
    const inferred = inferredCountry || null
    const hasToken = !!getUserToken()

    if (source === 'geo' && inferred) {
      setCountryPreference(inferred)
      if (hasToken) {
        void updateDefaultCountry(inferred).catch(() => {
          // ignore
        })
      }
      setDecision('hide')
      return
    }

    if (hasToken) {
      setDecision('hide')
      return
    }

    // default（推定不可）かつ未保存・未ログインだけ表示
    setDecision('show')
  }, [inferredCountry, inferredSource])

  const copy = useMemo(() => {
    const shared = kind === 'quotes' ? 'Quotes are shared across English editions.' : 'Columns are shared across English editions.'
    return {
      title: 'Continue with your preferred edition:',
      body: shared,
      button: 'Change',
    }
  }, [kind])

  const items = useMemo(
    () =>
      [
        { code: 'us' as const, label: 'United States (English)' },
        { code: 'ca' as const, label: 'Canada (English)' },
        { code: 'uk' as const, label: 'United Kingdom (English)' },
      ] as const,
    []
  )

  const apply = (next: EnglishEdition) => {
    setEdition(next)
    setCountryPreference(next)
    if (getUserToken()) {
      void updateDefaultCountry(next).catch(() => {
        // ignore
      })
    }
    // cookie/LS更新に合わせて、サーバーコンポーネント側の表示もリフレッシュする
    router.refresh()
  }

  if (decision !== 'show') return null

  return (
    <div style={{ marginTop: 6, marginBottom: 14 }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        {copy.body} <span style={{ fontWeight: 800, color: 'var(--text)' }}>{copy.title} {edition.toUpperCase()}</span>
        <span style={{ margin: '0 8px', opacity: 0.6 }}>·</span>
        <Link
          href={`/${edition}/daily/today`}
          style={{ color: 'var(--text)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
        >
          Today’s Briefing
        </Link>
        <span style={{ margin: '0 8px', opacity: 0.6 }}>·</span>
        <Link
          href={`/${edition}/news`}
          style={{ color: 'var(--text)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
        >
          News
        </Link>

        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button
              type="button"
              style={{
                marginLeft: 14,
                color: 'var(--text)',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textUnderlineOffset: 3,
                background: 'transparent',
                border: 'none',
                padding: 0,
                font: 'inherit',
                cursor: 'pointer',
              }}
            >
              {copy.button}
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
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 51,
                width: 'calc(100vw - 2rem)',
                maxWidth: 560,
                maxHeight: 'calc(100vh - 2rem)',
                overflowY: 'auto',
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
                  aria-label="Close"
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

              <div style={{ paddingRight: 44, marginBottom: 12 }}>
                <Dialog.Title style={{ fontWeight: 800 }}>Region & Language</Dialog.Title>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {items.map((x) => {
                  const active = x.code === edition
                  return (
                    <Dialog.Close asChild key={x.code}>
                      <button
                        type="button"
                        onClick={() => apply(x.code)}
                        style={{
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          padding: '10px 12px',
                          fontSize: 14,
                          textAlign: 'left',
                          background: active ? 'rgba(0,0,0,0.04)' : '#fff',
                          color: 'var(--text)',
                          cursor: 'pointer',
                        }}
                        aria-pressed={active}
                      >
                        {x.label}
                      </button>
                    </Dialog.Close>
                  )
                })}
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>Press Esc to close</div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  )
}

