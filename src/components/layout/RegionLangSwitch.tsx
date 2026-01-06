'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { COUNTRIES, type Country } from '@/lib/tglApi'
import { getCountrySwitchUrl } from '@/lib/country-switch'
import { addGentleToUrl } from '@/lib/view-switch'
import * as Dialog from '@radix-ui/react-dialog'

export function RegionLangSwitch({ currentCountry }: { currentCountry: Country }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const gentleParam = searchParams.get('gentle')
  const gentle = gentleParam === '1' || gentleParam === 'true'

  // カテゴリを抽出（/category/... のときだけ維持）
  const categoryMatch = pathname.match(/\/category\/([^/]+)/)
  const category = categoryMatch ? categoryMatch[1] : undefined

  const label = currentCountry === 'jp' ? '地域と言語' : 'Region & Language'

  const items = useMemo(() => {
    const labelsJa: Record<Country, string> = {
      us: 'アメリカ合衆国（英語）',
      ca: 'カナダ（英語）',
      uk: 'イギリス（英語）',
      jp: '日本（日本語）',
    }
    const labelsEn: Record<Country, string> = {
      us: 'United States (English)',
      ca: 'Canada (English)',
      uk: 'United Kingdom (English)',
      jp: 'Japan (Japanese)',
    }
    const isJa = currentCountry === 'jp'
    return COUNTRIES.map((c) => {
      const to = c.code
      const baseUrl = getCountrySwitchUrl(currentCountry, to, pathname, category, null)
      const href = addGentleToUrl(baseUrl, gentle)
      return {
        code: to,
        label: isJa ? labelsJa[to] : labelsEn[to],
        href,
        active: to === currentCountry,
      }
    })
  }, [category, currentCountry, gentle, pathname])

  return (
    <>
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="text-sm"
            title={label}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--muted)',
              cursor: 'pointer',
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationThickness: '1px',
              textUnderlineOffset: 3,
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
                aria-label={currentCountry === 'jp' ? '閉じる' : 'Close'}
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
              <Dialog.Title style={{ fontWeight: 800 }}>{label}</Dialog.Title>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {items.map((x) => (
                <Dialog.Close asChild key={x.code}>
                  <Link
                    href={x.href}
                    style={{
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      padding: '10px 12px',
                      fontSize: 14,
                      textDecoration: 'none',
                      color: 'var(--text)',
                      transition: 'border-color 120ms ease, color 120ms ease, background 120ms ease',
                    }}
                    aria-current={x.active ? 'page' : undefined}
                  >
                    {x.label}
                  </Link>
                </Dialog.Close>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
              {currentCountry === 'jp' ? 'Escキーでも閉じられます' : 'Press Esc to close'}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}


