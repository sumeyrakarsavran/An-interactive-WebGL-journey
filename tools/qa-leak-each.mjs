/** Per-chapter GPU memory diff: visit one chapter, come back to the start, compare. (server on :3100) */
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1280, height: 800 } })
const p = await b.newPage()
await p.goto('http://localhost:3100/?qa=1&q=' + (process.argv[2] ?? 'high'), { waitUntil: 'networkidle0' })
await p.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const mem = () => p.evaluate(() => ({ geo: window.__gl.info.memory.geometries, tex: window.__gl.info.memory.textures }))
const go = (g) => p.evaluate((g) => window.scrollTo(0, g * (document.documentElement.scrollHeight - innerHeight)), g)
await sleep(3000)
const VH = [900, 1000, 1000, 1100, 1100, 1000], T = VH.reduce((a, b) => a + b)
const mid = (i) => (VH.slice(0, i).reduce((a, b) => a + b, 0) + VH[i] * 0.5) / T
let base = await mem()
for (let i = 1; i < 6; i++) {
  await go(mid(i)); await sleep(5000)
  const there = await mem()
  await go(0.01); await sleep(5000)
  const back = await mem()
  console.log(`chapter ${i + 1}: while there +${there.tex - base.tex} tex; after leaving geo ${back.geo - base.geo >= 0 ? '+' : ''}${back.geo - base.geo}, tex ${back.tex - base.tex >= 0 ? '+' : ''}${back.tex - base.tex}`)
  base = back
}
await b.close()
