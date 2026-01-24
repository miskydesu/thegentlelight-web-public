import { cookies } from 'next/headers'
import { GENTLE_COOKIE_KEY, GENTLE_ALLOW_IMPORTANT_COOKIE_KEY } from './view-switch'

export function getGentleFromCookies(): boolean {
  const v = cookies().get(GENTLE_COOKIE_KEY)?.value
  return v === '1' || v === 'true'
}

export function getAllowImportantFromCookies(): boolean {
  const v = cookies().get(GENTLE_ALLOW_IMPORTANT_COOKIE_KEY)?.value
  if (v === '0' || v === 'false') return false
  return true
}
