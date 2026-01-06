import { Metadata } from 'next'

export const runtime = 'edge'

export const metadata: Metadata = {
  title: 'The Gentle Light 管理画面',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <header className="tglHeader">
        <div className="tglHeaderInner">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/admin" style={{ fontWeight: 800 }}>
              The Gentle Light
            </a>
            <span className="tglPill">Admin</span>
          </div>
          <nav className="tglNav">
            <a href="/admin">ホーム</a>
            <a href="/admin/jobs">ジョブ</a>
            <a href="/admin/topics">トピック</a>
            <a href="/admin/quotes">名言</a>
            <a href="/admin/writers">ライター</a>
            <a href="/admin/column-names">コラム名</a>
            <a href="/admin/columns">コラム</a>
            <a href="/admin/ai-runs">AI実行ログ</a>
            <a href="/admin/login" className="tglMuted">
              ログイン
            </a>
          </nav>
        </div>
      </header>
      <div className="tglContainer">{children}</div>
    </div>
  )
}

