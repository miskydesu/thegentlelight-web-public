export default function AdminPage() {
  return (
    <main>
      <h1 style={{ fontSize: '1.4rem' }}>管理画面</h1>
      <div style={{ height: 12 }} />
      <div className="tglRow">
        <div className="tglRowTitle">最初にやること</div>
        <div className="tglRowMeta">
          <a href="/admin/login">ログイン</a>
          <span className="tglMuted">|</span>
          <a href="/admin/topics">topics 一覧</a>
        </div>
      </div>
    </main>
  )
}

