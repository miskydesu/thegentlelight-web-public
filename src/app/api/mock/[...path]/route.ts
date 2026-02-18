/**
 * Public repo: when USE_MOCK_DATA=1, respond to API-like requests with fixtures/*.json
 * so the UI can run without a backend. Uses Node runtime for fs (Edge has no fs).
 */
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function pathToFixtureKey(apiPath: string): string {
  const p = apiPath.replace(/^\//, '').split('?')[0].replace(/\/$/, '') || 'index'
  return p.split('/').join('-')
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  if (process.env.USE_MOCK_DATA !== '1') {
    return NextResponse.json({ error: 'Mock not enabled' }, { status: 404 })
  }
  const pathSegments = params.path || []
  const apiPath = '/' + pathSegments.join('/')
  const key = pathToFixtureKey(apiPath)
  const base = path.join(process.cwd(), 'fixtures')
  const file = path.join(base, `${key}.json`)
  if (!fs.existsSync(file)) {
    // フォールバック: 空の構造で 200 を返して UI が落ちないようにする
    if (key.includes('columns')) return NextResponse.json({ columns: [], meta: {} })
    if (key.includes('quotes')) return NextResponse.json({ quotes: [], meta: {} })
    if (key.includes('latest') || key.includes('home')) {
      return NextResponse.json({
        topics: [],
        hero_topics: [],
        daily_latest: null,
        updatedAt: new Date().toISOString(),
        meta: {},
      })
    }
    if (key.includes('daily')) return NextResponse.json({ days: [], meta: {} })
    return NextResponse.json({ meta: {} })
  }
  try {
    const raw = fs.readFileSync(file, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid fixture' }, { status: 500 })
  }
}
