import Link from 'next/link'

export const metadata = {
  title: 'このサイトについて - The Gentle Light',
}

export default function AboutPage() {
  return (
    <main>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>このサイトについて</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>編集方針</h2>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>
          The Gentle Light は、置いていかれない。煽られない。静かに要点へ。
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>
          速報感よりも、整理された要約と背景説明を重視します。
        </p>
        <p style={{ lineHeight: 1.75 }}>
          読み疲れしないで、毎日戻ってこれることを目指しています。
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>収集元</h2>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>
          ニュースは複数の信頼できるソースから収集しています。
        </p>
        <p style={{ lineHeight: 1.75 }}>
          各トピックには参照元へのリンクを提供しています。
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>FAQ</h2>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>更新頻度は？</h3>
          <p style={{ lineHeight: 1.75 }}>
            1時間に1度、最新のニュースを収集・整理しています。
          </p>
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>どの国に対応していますか？</h3>
          <p style={{ lineHeight: 1.75 }}>
            US、CA、UK、JP の4つのエディションを提供しています。
          </p>
        </div>
      </section>

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link
          href="/"
          style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          ← トップへ戻る
        </Link>
      </div>
    </main>
  )
}

