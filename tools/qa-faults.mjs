/**
 * Failure drills (server on :3100):
 *  1. a chapter's code fails to download → notice + reading mode, no white page
 *  2. the GPU drops the WebGL context → notice; it clears when the context is restored
 */
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:3100'
const b = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1280, height: 800 },
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const check = (name, ok, detail = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
const VH = [900, 1000, 1000, 1100, 1100, 1000]
const T = VH.reduce((a, c) => a + c)

// 1) block every JS chunk requested after the first chapter is running
{
  const p = await b.newPage()
  await p.goto(`${BASE}/?qa=1&q=low`, { waitUntil: 'networkidle0' })
  await p.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })
  await p.setRequestInterception(true)
  p.on('request', (r) => (r.url().includes('/_next/static/chunks/') ? r.abort() : r.continue()))
  const g = (VH[0] + VH[1] * 0.5) / T // middle of Yaratılış: its chunk has not been loaded yet
  await p.evaluate((g) => window.scrollTo(0, g * (document.documentElement.scrollHeight - innerHeight)), g)
  await sleep(6000)
  const s = await p.evaluate(() => ({
    fault: window.__sirrStore.getState().fault,
    text: window.__sirrStore.getState().textMode,
    notice: document.querySelector('.fault')?.textContent ?? null,
    journeyVisible: getComputedStyle(document.querySelector('.text-journey')).position === 'static',
  }))
  check('missing chapter chunk → notice + reading mode', s.fault === 'chunk' && s.text && s.journeyVisible && !!s.notice, JSON.stringify(s))
  await p.close()
}

// 2) simulate a lost and restored GPU context
{
  const p = await b.newPage()
  await p.goto(`${BASE}/?qa=1&q=low`, { waitUntil: 'networkidle0' })
  await p.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })
  await sleep(1500)
  await p.evaluate(() => {
    window.__lose = window.__gl.getContext().getExtension('WEBGL_lose_context')
    window.__lose.loseContext()
  })
  await sleep(800)
  const lost = await p.evaluate(() => ({ fault: window.__sirrStore.getState().fault, notice: document.querySelector('.fault')?.textContent ?? null }))
  check('context lost → notice shown', lost.fault === 'context' && !!lost.notice, JSON.stringify(lost))
  await p.evaluate(() => window.__lose.restoreContext())
  await sleep(2500)
  const back = await p.evaluate(() => ({ fault: window.__sirrStore.getState().fault }))
  check('context restored → notice clears', back.fault === null, JSON.stringify(back))
  const frames = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 1000 ? requestAnimationFrame(f) : r(n) }; requestAnimationFrame(f) }))
  check('rendering continues after restore', frames > 20, `${frames} frames/s`)
  await p.close()
}

await b.close()
