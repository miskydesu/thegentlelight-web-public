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
            <a href="/" style={{ fontWeight: 800 }}>
              The Gentle Light
            </a>
            <span className="tglPill">Admin</span>
          </div>
          <nav className="tglNav">
            <a href="/admin/topics">Topics</a>
            <a href="/admin/login" className="tglMuted">
              Login
            </a>
          </nav>
        </div>
      </header>
      <div className="tglContainer">{children}</div>
    </div>
  )
}

