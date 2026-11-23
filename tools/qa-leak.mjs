/** GPU memory check: loops through every chapter three times; geometry/texture counts back at the start should stay flat.
 *   node tools/qa-leak.mjs   (production server on :3100) */
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1280, height: 800 } })
const p = await b.newPage()
await p.goto('http://localhost:3100/?qa=1&q=high', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const mem = () => p.evaluate(() => ({ geo: window.__gl.info.memory.geometries, tex: window.__gl.info.memory.textures, chapter: window.__sirrStore.getState().chapterId }))
const go = (g) => p.evaluate((g) => window.scrollTo(0, g * (document.documentElement.scrollHeight - innerHeight)), g)
await sleep(3000)
const out = [['start', await mem()]]
for (let loop = 0; loop < 3; loop++) {
  for (const g of [0.25, 0.45, 0.62, 0.8, 0.95]) { await go(g); await sleep(3500) }
  await go(0.01); await sleep(4500)
  out.push([`back at start after loop ${loop + 1}`, await mem()])
}
console.log(JSON.stringify(out, null, 1))
await b.close()
