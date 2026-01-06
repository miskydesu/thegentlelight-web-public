import dynamic from 'next/dynamic'

const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px', color: 'var(--muted)', fontSize: 13 }}>
      Loading…
    </main>
  ),
})

export default function LoginPage() {
  return <LoginClient />
}


