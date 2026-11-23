/**
 * Captures the social-share image (public/og.jpg, 1200×630) from the experience itself:
 * the lake at dusk with its single tree, UI hidden.
 *   node tools/capture-og.mjs [baseUrl=http://localhost:3100] [chapter=5] [local=0.07]
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:3100'
const CH = Number(process.argv[3] ?? 5)
const LOCAL = Number(process.argv[4] ?? 0.07)
const VH = [900, 1000, 1000, 1100, 1100, 1000]
const T = VH.reduce((a, b) => a + b)
const g = (VH.slice(0, CH - 1).reduce((a, b) => a + b, 0) + VH[CH - 1] * LOCAL) / T

const b = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
})
const p = await b.newPage()
await p.goto(`${BASE}/?qa=1&q=high`, { waitUntil: 'networkidle0' })
await p.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })
await p.addStyleTag({ content: '.controls,.chapters,.hint,.narrative,.loader,.veil,.word{display:none!important}' })
await p.evaluate((g) => window.scrollTo(0, g * (document.documentElement.scrollHeight - innerHeight)), g)
await new Promise((r) => setTimeout(r, 9000))
fs.mkdirSync('public', { recursive: true })
await p.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 86 })
console.log('wrote public/og.jpg')
await b.close()
