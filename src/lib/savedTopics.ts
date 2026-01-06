import type { TopicSummary } from './tglApi'
import { fetchJson } from './tglApi'
import { getUserToken, importServerSavedKeys, listServerSavedKeys } from './userAuth'

// Cookie: saved keys only (country:topicId) to keep within size limits
const COOKIE_KEY = 'tgl_saved_keys_v1'
const CACHE_KEY = 'tgl_saved_topic_cache_v1'
const LEGACY_ARRAY_KEY = 'tgl_saved_topics'

export type SavedKey = string // e.g. "jp:mjxxxxxxxxxxxxxxxxxxxxxxxx"

function buildKey(country: string, topicId: string): SavedKey {
  return `${country}:${topicId}`
}

function parseKey(key: SavedKey): { country: string; topicId: string } | null {
  const m = String(key || '').match(/^([a-z]{2}):(.+)$/)
  if (!m) return null
  return { country: m[1], topicId: m[2] }
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const parts = document.cookie.split(';').map((x) => x.trim())
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx <= 0) continue
    const k = p.slice(0, idx)
    const v = p.slice(idx + 1)
    if (k === name) return v
  }
  return null
}

function setCookieValue(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`
}

export function readSavedKeys(): SavedKey[] {
  const raw = getCookieValue(COOKIE_KEY)
  if (!raw) return []
  try {
    const decoded = decodeURIComponent(raw)
    const arr = JSON.parse(decoded)
    if (!Array.isArray(arr)) return []
    return arr.filter((x) => typeof x === 'string')
  } catch {
    return []
  }
}

function writeSavedKeys(keys: SavedKey[]) {
  // cookie size limit ~4KB. Keep it conservative.
  const unique: SavedKey[] = []
  const seen = new Set<string>()
  for (const k of keys) {
    if (!k || seen.has(k)) continue
    seen.add(k)
    unique.push(k)
  }

  // trim from the front (keep latest)
  let trimmed = unique
  while (encodeURIComponent(JSON.stringify(trimmed)).length > 3500 && trimmed.length > 1) {
    trimmed = trimmed.slice(1)
  }

  setCookieValue(COOKIE_KEY, encodeURIComponent(JSON.stringify(trimmed)), 60 * 60 * 24 * 365)
}

function readCache(): Record<string, TopicSummary> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object') return {}
    return obj
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, TopicSummary>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

export function isSaved(country: string, topicId: string): boolean {
  const key = buildKey(country, topicId)
  return readSavedKeys().includes(key)
}

export function toggleSavedTopic(topic: TopicSummary): { saved: boolean } {
  const key = buildKey(topic.country, topic.topic_id)
  const keys = readSavedKeys()
  const exists = keys.includes(key)
  const nextKeys = exists ? keys.filter((k) => k !== key) : [...keys, key]
  writeSavedKeys(nextKeys)

  // cache summary in localStorage (not cookie)
  const cache = readCache()
  if (!exists) cache[key] = topic
  else delete cache[key]
  writeCache(cache)

  // legacy cleanup (optional)
  try {
    window.localStorage.removeItem(LEGACY_ARRAY_KEY)
  } catch {
    // ignore
  }

  return { saved: !exists }
}

export function removeSavedKey(key: SavedKey) {
  const keys = readSavedKeys().filter((k) => k !== key)
  writeSavedKeys(keys)
  const cache = readCache()
  delete cache[key]
  writeCache(cache)
}

export async function ensureLegacyMigrated() {
  if (typeof window === 'undefined') return
  // Migrate old localStorage array of TopicSummary -> cookie keys + cache map
  let legacy: TopicSummary[] | null = null
  try {
    const raw = window.localStorage.getItem(LEGACY_ARRAY_KEY)
    if (raw) legacy = JSON.parse(raw)
  } catch {
    legacy = null
  }
  if (!legacy || !Array.isArray(legacy) || legacy.length === 0) return

  const keys = readSavedKeys()
  const cache = readCache()
  for (const t of legacy) {
    if (!t?.topic_id || !t?.country) continue
    const k = buildKey(t.country, t.topic_id)
    keys.push(k)
    cache[k] = t
  }
  writeSavedKeys(keys)
  writeCache(cache)
  try {
    window.localStorage.removeItem(LEGACY_ARRAY_KEY)
  } catch {
    // ignore
  }
}

export async function loadSavedTopics(): Promise<TopicSummary[]> {
  await ensureLegacyMigrated()

  let keys = readSavedKeys()

  // If logged-in, merge DB saved keys and cookie keys. Cookie extras are imported into DB.
  try {
    const token = getUserToken()
    if (token) {
      const server = await listServerSavedKeys()
      const serverKeys = Array.isArray(server.keys) ? server.keys : []
      const union = Array.from(new Set<string>([...serverKeys, ...keys]))
      // If cookie has extras, import
      const missingOnServer = keys.filter((k) => !serverKeys.includes(k))
      if (missingOnServer.length) {
        const r = await importServerSavedKeys(missingOnServer)
        keys = Array.from(new Set<string>([...(r.keys || []), ...keys]))
      } else {
        keys = union
      }
      // keep cookie in sync with union (so logout still keeps same saved list)
      writeSavedKeys(keys)
    }
  } catch {
    // ignore (offline etc)
  }

  const cache = readCache()

  const out: TopicSummary[] = []
  const missing: SavedKey[] = []
  for (const k of keys) {
    const cached = cache[k]
    if (cached) out.push(cached)
    else missing.push(k)
  }

  if (missing.length) {
    const fetched = await Promise.all(
      missing.map(async (k) => {
        const p = parseKey(k)
        if (!p) return null
        try {
          const r = await fetchJson<any>(`/v1/${p.country}/topics/${encodeURIComponent(p.topicId)}`)
          const t = r?.topic
          if (!t?.topic_id) return null
          const summary: TopicSummary = {
            topic_id: t.topic_id,
            country: t.country,
            category: t.category,
            title: t.title,
            importance_score: t.importance_score ?? 0,
            source_count: t.source_count ?? 0,
            last_seen_at: t.last_seen_at ?? null,
            last_source_published_at: t.last_source_published_at ?? null,
            high_arousal: Boolean(t.high_arousal),
            distress_score: t.distress_score ?? null,
            summary: t.summary ?? null,
            summary_updated_at: t.summary_updated_at ?? null,
          }
          return { key: k, summary }
        } catch {
          return null
        }
      })
    )
    const nextCache = { ...cache }
    for (const row of fetched) {
      if (!row) continue
      nextCache[row.key] = row.summary
      out.push(row.summary)
    }
    writeCache(nextCache)
  }

  // stable sort: newest first
  out.sort((a, b) => {
    const at = a.last_source_published_at ? new Date(a.last_source_published_at).getTime() : 0
    const bt = b.last_source_published_at ? new Date(b.last_source_published_at).getTime() : 0
    return bt - at
  })
  return out
}


