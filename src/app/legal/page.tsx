import Link from 'next/link'

export const metadata = {
  title: '利用規約・プライバシーポリシー - The Gentle Light',
}

export default function LegalPage() {
  return (
    <main>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>利用規約・プライバシーポリシー</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>利用規約</h2>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>
          本サイトの利用にあたっては、以下の規約に同意していただく必要があります。
        </p>
        <ul style={{ lineHeight: 1.75, paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
          <li>本サイトのコンテンツは情報提供を目的としており、投資判断等の根拠として使用しないでください。</li>
          <li>本サイトのコンテンツの無断転載・複製を禁止します。</li>
          <li>本サイトの利用により生じた損害について、当サイトは一切の責任を負いません。</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>プライバシーポリシー</h2>
        <p style={{ lineHeight: 1.75, marginBottom: '0.5rem' }}>
          本サイトでは、以下の情報を収集・利用する場合があります。
        </p>
        <ul style={{ lineHeight: 1.75, paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
          <li>アクセスログ（IPアドレス、アクセス日時など）</li>
          <li>ブラウザ情報（User-Agentなど）</li>
          <li>保存したトピック（localStorageに保存、端末内のみ）</li>
        </ul>
        <p style={{ lineHeight: 1.75, marginTop: '0.5rem' }}>
          これらの情報は、サービスの改善や統計目的でのみ使用されます。
        </p>
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

