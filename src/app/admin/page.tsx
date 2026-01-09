import Link from 'next/link'

export default function AdminHomePage() {
  const logoSrc = '/assets/brand/logo.png'

  const cards: Array<{ href: string; title: string; desc: string }> = [
    { href: '/admin/summary', title: 'サマリー', desc: '直近の状況（要約・要約待ち・国×カテゴリ）' },
    { href: '/admin/topics', title: 'トピック', desc: 'トピック一覧・詳細' },
    { href: '/admin/columns', title: 'コラム', desc: 'コラム一覧' },
    { href: '/admin/quotes', title: '名言', desc: '名言一覧' },
    { href: '/admin/jobs', title: 'ジョブ', desc: 'ジョブの実行・確認' },
    { href: '/admin/job-logs', title: 'ジョブログ', desc: '実行ログ' },
    { href: '/admin/ai-runs', title: 'AI実行ログ', desc: 'AI生成の履歴' },
  ]

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 10px' }}>
      <section
        style={{
          background: 'linear-gradient(180deg, rgba(248,249,250,1) 0%, rgba(255,255,255,1) 70%)',
          border: '1px solid #e9ecef',
          borderRadius: 12,
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <img
            src={logoSrc}
            alt="The Gentle Light"
            style={{ height: 44, width: 'auto', display: 'block' }}
            loading="eager"
          />
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.15 }}>管理画面</div>
            <div style={{ color: '#6c757d', marginTop: 4 }}>メニューから各機能にアクセスできます</div>
          </div>
        </div>
      </section>

      <div style={{ height: 18 }} />

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#212529' }}>クイックアクセス</h2>
          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>まずは「サマリー」がおすすめ</div>
        </div>

        <div style={{ height: 10 }} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              style={{
                border: '1px solid #e9ecef',
                borderRadius: 12,
                padding: 14,
                textDecoration: 'none',
                background: '#fff',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                color: '#212529',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ fontWeight: 800 }}>{c.title}</div>
                <span aria-hidden="true" style={{ color: '#adb5bd' }}>
                  →
                </span>
              </div>
              <div style={{ marginTop: 6, color: '#6c757d', fontSize: '0.92rem', lineHeight: 1.35 }}>{c.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

