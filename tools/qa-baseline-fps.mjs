/** Frame rate of an empty page in the same headless Chrome — tells a system cap (battery saver) from a scene problem. */
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage()
await p.goto('about:blank')
const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(n / 2) }; requestAnimationFrame(f) }))
console.log(`empty page: ${fps} fps`)
await b.close()
