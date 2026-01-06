export type CategoryCode =
  | 'heartwarming'
  | 'sports'
  | 'politics'
  | 'business'
  | 'technology'
  | 'health'
  | 'science_earth'
  | 'arts'

export const CATEGORIES: Array<{ code: CategoryCode; label: string; labelJa: string }> = [
  { code: 'heartwarming', label: 'Heartwarming', labelJa: '心温まる話' },
  // 取得順（表示順）: Science → Politics → Health → Technology → Arts&Entertainment → Business → Sports
  { code: 'science_earth', label: 'Science & Earth', labelJa: '科学と地球' },
  { code: 'politics', label: 'Politics', labelJa: '政治' },
  { code: 'health', label: 'Health', labelJa: '健康' },
  { code: 'technology', label: 'Technology', labelJa: 'テクノロジー' },
  { code: 'arts', label: 'Arts & Entertainment', labelJa: '文化・エンタメ' },
  { code: 'business', label: 'Business', labelJa: 'ビジネス' },
  { code: 'sports', label: 'Sports', labelJa: 'スポーツ' },
]

export function getCategoryLabel(code: string, locale: 'ja' | 'en'): string {
  const hit = CATEGORIES.find((c) => c.code === (code as CategoryCode))
  if (!hit) return code
  return locale === 'ja' ? hit.labelJa : hit.label
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  const n = parseInt(full, 16)
  // fallback
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getCategoryBadgeTheme(code: string): {
  color: string
  borderColor: string
  backgroundColor: string
} {
  // accent colors (text/border) + light tint background
  const base =
    code === 'heartwarming'
      ? '#c84b73'
      : code === 'sports'
        ? '#dc2626'
      : code === 'politics'
        ? '#6b5cff'
        : code === 'business'
          ? '#0f766e'
          : code === 'technology'
            ? '#2563eb'
            : code === 'health'
              ? '#16a34a'
              : code === 'science_earth'
                ? '#0ea5a5'
                : code === 'arts'
                  ? '#b45309'
                  : '#64748b'

  return {
    color: base,
    borderColor: base,
    backgroundColor: hexToRgba(base, 0.08),
  }
}


