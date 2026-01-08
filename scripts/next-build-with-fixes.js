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
    const srcDir = path.join(root, '.next', 'server', 'vendor-chunks')
    if (!fs.existsSync(srcDir)) return

    const dstDir = path.join(root, '.next', 'server', 'chunks', 'vendor-chunks')
    fs.mkdirSync(dstDir, { recursive: true })

    // Mirror all vendor chunks (Next sometimes outputs to `vendor-chunks/*` but runtime expects `chunks/vendor-chunks/*`).
    // Best-effort: only copy files that are missing on dst.
    const entries = fs.readdirSync(srcDir, { withFileTypes: true })
    let copied = 0
    for (const ent of entries) {
      if (!ent.isFile()) continue
      const src = path.join(srcDir, ent.name)
      const dst = path.join(dstDir, ent.name)
      if (fs.existsSync(dst)) continue
      fs.copyFileSync(src, dst)
      copied += 1
    }
    if (copied > 0) {
      console.log(`[build-fix] mirrored vendor-chunks/* -> chunks/vendor-chunks/* (${copied} files)`)
    }
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


