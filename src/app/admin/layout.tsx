import { Metadata } from 'next'
import { AdminNav } from './_components/AdminNav'

export const runtime = 'edge'

export const metadata: Metadata = {
  // Root layout の title.template による重複を避けるため absolute を使用
  title: { absolute: 'The Gentle Light 管理画面' },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
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
          <div className="tglNav">
            <AdminNav />
          </div>
        </div>
      </header>
      <div className="tglContainer">{children}</div>
    </div>
  )
}

