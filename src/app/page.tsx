export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>The Gentle Light</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        置いていかれない。煽られない。静かに要点へ。
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>国を選ぶ</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a className="tglButton" href="/us">US</a>
          <a className="tglButton" href="/uk">UK</a>
          <a className="tglButton" href="/ca">CA</a>
          <a className="tglButton" href="/jp">JP</a>
        </div>
      </section>

      <section style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <a className="tglLinkCard" href="/test/">
          <div className="tglLinkCardTitle">開発テスト</div>
          <div className="tglLinkCardDesc">画像/R2、Sentry、疎通テスト</div>
        </a>
        <a className="tglLinkCard" href="/admin/">
          <div className="tglLinkCardTitle">Admin</div>
          <div className="tglLinkCardDesc">管理画面（MVP）</div>
        </a>
      </section>
    </main>
  )
}

