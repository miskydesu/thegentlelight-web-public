export type TopicDateLocale = 'ja' | 'en'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${y}/${m}/${day}`
}

export function formatTopicListDate(
  iso: string | null | undefined,
  locale: TopicDateLocale
): string | null {
  if (!iso) return null
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null

  const nowMs = Date.now()
  const diffMs = Math.max(0, nowMs - dt.getTime())
  const dayMs = 24 * 60 * 60 * 1000

  // 24時間以上：yyyy/mm/dd
  if (diffMs >= dayMs) return formatYmd(dt)

  // 24時間以内：N hours ago / N時間前
  const hours = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)))
  if (locale === 'ja') return `${hours}時間前`
  // 要望に合わせてスペース無し（例: "6hours ago"）
  return hours === 1 ? '1hour ago' : `${hours}hours ago`
}


