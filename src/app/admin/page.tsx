'use client'

import Link from 'next/link'

export default function AdminHomePage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 700, color: '#1a1a1a' }}>ホーム</h1>
      <div style={{ height: 10 }} />
      <div style={{ color: '#6c757d' }}>簡易表示（軽量）</div>

      <div style={{ height: 18 }} />
      <section className="tglRow">
        <div className="tglRowTitle">ショートカット</div>
        <div className="tglRowMeta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin/summary">サマリー</Link>
          <span className="tglMuted">|</span>
          <Link href="/admin/jobs">ジョブ</Link>
          <span className="tglMuted">|</span>
          <Link href="/admin/topics">トピック</Link>
          <span className="tglMuted">|</span>
          <Link href="/admin/quotes">名言</Link>
          <span className="tglMuted">|</span>
          <Link href="/admin/columns">コラム</Link>
          <span className="tglMuted">|</span>
          <Link href="/admin/job-logs">ジョブログ</Link>
        </div>
      </section>
    </main>
  )
}

