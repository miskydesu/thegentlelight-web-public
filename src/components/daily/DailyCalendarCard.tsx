'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import styles from '@/app/[country]/layout.module.css'

type DailyCalendarCardProps = {
  country: 'us' | 'uk' | 'ca' | 'jp'
  year: number
  month: number
  monthLabel: string
  prevHref: string
  nextHref: string
  weekdayLabels: string[]
  firstWeekday: number
  daysInMonth: number
  todayYmd: string
  selectedDate: string
  dayStatusByDate: Record<string, string>
  latestDailyDate: string
}

export function DailyCalendarCard({
  country,
  year,
  month,
  monthLabel,
  prevHref,
  nextHref,
  weekdayLabels,
  firstWeekday,
  daysInMonth,
  todayYmd,
  selectedDate,
  dayStatusByDate,
  latestDailyDate,
}: DailyCalendarCardProps) {
  const isJa = country === 'jp'
  const [open, setOpen] = useState(false)
  const openLatestHref = latestDailyDate ? `/${country}/daily/${latestDailyDate}` : `/${country}/daily`

  return (
    <Card>
      <CardTitle style={{ fontWeight: 700 }}>{isJa ? '日付で選ぶ' : 'Choose a date'}</CardTitle>
      <CardMeta className={styles.dailyMonthMeta} style={{ marginTop: 6 }}>
        <Link href={prevHref} className="tglMuted" aria-label="prev month">
          ←
        </Link>
        <span className={styles.dailyMonthLabel}>{monthLabel}</span>
        <Link href={nextHref} className="tglMuted" aria-label="next month">
          →
        </Link>
      </CardMeta>
      <CardContent style={{ marginTop: 12 }}>
        <div className="tglMuted" style={{ fontSize: 12, marginBottom: 6 }}>
          {isJa ? '● 朝刊ありの日だけ開けます' : '● Open only on days with a briefing'}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className={`${styles.calendarDot} ${styles.calendarDotReady}`} style={{ width: 11, height: 11, opacity: 1 }} />
            {isJa ? '朝刊あり' : 'Briefing'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className={`${styles.calendarDot} ${styles.calendarDotPending}`} style={{ width: 11, height: 11 }} />
            {isJa ? '未作成' : 'Not ready'}
          </span>
        </div>
        <div style={{ height: 10 }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 6,
          }}
        >
          {weekdayLabels.map((w) => (
            <div key={w} style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '2px 0' }}>
              {w}
            </div>
          ))}

          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`b-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const status = String(dayStatusByDate[date] || '')
            const isReady = status === 'ready'
            const isSelected = date === selectedDate

            if (date > todayYmd) {
              return (
                <div
                  key={date}
                  style={{
                    display: 'block',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '6px 0',
                    color: 'var(--muted)',
                    background: '#fff',
                    opacity: 0.55,
                  }}
                  title={isJa ? '未来日付' : 'Future date'}
                >
                  <div style={{ fontWeight: 700, textAlign: 'center', fontSize: 14 }}>{day}</div>
                  {/* keep height consistent with other cells */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2, padding: '2px 0' }}>
                    <span
                      className={`${styles.calendarDot} ${styles.calendarDotPending}`}
                      style={{ width: 8, height: 8, visibility: 'hidden' }}
                    />
                  </div>
                </div>
              )
            }

            const cellStyle: React.CSSProperties = {
              display: 'block',
              border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 10,
              padding: '6px 0',
              textDecoration: 'none',
              color: 'inherit',
              background: isSelected ? 'rgba(0,0,0,0.04)' : '#fff',
              width: '100%',
            }

            const inner = (
              <>
                <div style={{ fontWeight: 700, textAlign: 'center', fontSize: 14 }}>{day}</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2, padding: '2px 0' }}>
                  {isReady ? (
                    <span className={`${styles.calendarDot} ${styles.calendarDotReady}`} style={{ width: 8, height: 8 }} />
                  ) : (
                    <span className={`${styles.calendarDot} ${styles.calendarDotPending}`} style={{ width: 8, height: 8 }} />
                  )}
                </div>
              </>
            )

            if (isReady) {
              return (
                <Link key={date} href={`/${country}/daily/${date}`} style={cellStyle}>
                  {inner}
                </Link>
              )
            }

            return (
              <button
                key={date}
                type="button"
                style={{ ...cellStyle, cursor: 'pointer' }}
                onClick={() => {
                  setOpen(true)
                }}
                aria-label={isJa ? `${date}の朝刊は準備中` : `Briefing for ${date} is not ready`}
              >
                {inner}
              </button>
            )
          })}
        </div>
      </CardContent>

      <Dialog.Root open={open} onOpenChange={setOpen}>
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
            aria-label={isJa ? '朝刊準備中' : 'Briefing not ready'}
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
              <Dialog.Title style={{ fontWeight: 800 }}>
                {isJa ? 'この日の朝刊は準備中です' : 'This briefing is being prepared'}
              </Dialog.Title>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
              {isJa
                ? '作成され次第、この日付で読めるようになります。'
                : 'Once ready, it will be available on this date.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
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
                  {isJa ? '別の日付を選ぶ' : 'Pick another date'}
                </button>
              </Dialog.Close>

              <Link
                href={openLatestHref}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  background: '#0b5394',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                {isJa ? '直近の朝刊を開く' : 'Open latest briefing'}
              </Link>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              <Link href={`/${country}/columns/mkcnb9euo4wrdycp3p00000000`} style={{ color: 'inherit' }}>
                {isJa ? '朝刊ってなに？' : 'What is a briefing?'}
              </Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  )
}
