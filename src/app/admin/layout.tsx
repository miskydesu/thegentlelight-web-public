export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <nav>
        <h2>管理画面</h2>
      </nav>
      {children}
    </div>
  )
}

