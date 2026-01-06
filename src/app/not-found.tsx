export const runtime = 'edge'

export default function NotFound() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: '1.4rem' }}>404</h1>
      <p style={{ color: 'var(--muted)' }}>ページが見つかりませんでした。</p>
      <a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
        ← トップへ
      </a>
    </main>
  )
}


