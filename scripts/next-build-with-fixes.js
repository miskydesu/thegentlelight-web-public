#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Next.js build workaround:
 * In some environments, `.next/server/webpack-runtime.js` may require
 * `./chunks/vendor-chunks/next.js` while Next outputs `vendor-chunks/next.js`.
 * This script runs `next build` and, during the build, mirrors the vendor chunk
 * into the expected `chunks/vendor-chunks` location if missing.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const nextBin = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function ensureVendorChunkMirror() {
  try {
    const src = path.join(root, '.next', 'server', 'vendor-chunks', 'next.js')
    if (!fs.existsSync(src)) return

    const dstDir = path.join(root, '.next', 'server', 'chunks', 'vendor-chunks')
    const dst = path.join(dstDir, 'next.js')
    if (fs.existsSync(dst)) return

    fs.mkdirSync(dstDir, { recursive: true })
    fs.copyFileSync(src, dst)
    // Also mirror the sourcemap if present (best-effort)
    const srcMap = `${src}.map`
    const dstMap = `${dst}.map`
    if (fs.existsSync(srcMap) && !fs.existsSync(dstMap)) {
      fs.copyFileSync(srcMap, dstMap)
    }
    console.log('[build-fix] mirrored vendor-chunks/next.js -> chunks/vendor-chunks/next.js')
  } catch (e) {
    // best-effort; do not crash build wrapper
  }
}

const args = ['next', 'build']
const child = spawn(nextBin, args, { stdio: 'inherit', cwd: root, env: process.env })

const timer = setInterval(ensureVendorChunkMirror, 120)

child.on('exit', (code, signal) => {
  clearInterval(timer)
  ensureVendorChunkMirror()
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code == null ? 1 : code)
})


