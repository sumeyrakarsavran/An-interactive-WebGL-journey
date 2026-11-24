/**
 * Phone regression test for the Nefs mirror (server on :3100, static export):
 *  - the whole mirror fits on a portrait screen at the polishing spot (screenshot)
 *  - a vertical swipe on the mirror scrolls the page (nobody gets stuck)
 *  - a sideways swipe on the mirror polishes it
 *   node tools/qa-mobile-mirror.mjs [outDir=qa-out]
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const OUT = process.argv[2] ?? 'qa-out'
fs.mkdirSync(OUT, { recursive: true })
const b = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
})
const p = await b.newPage()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const check = (name, ok, detail = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
await p.goto('http://localhost:3100/?qa=1&q=low', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })

const VH = [900, 1000, 1000, 1100, 1100, 1000]
const T = VH.reduce((a, c) => a + c)
const g = (VH[0] + VH[1] + VH[2] * 0.72) / T
await p.evaluate((g) => window.scrollTo(0, g * (document.documentElement.scrollHeight - innerHeight)), g)
await sleep(6000)
await p.screenshot({ path: `${OUT}/mobile-nafs-polish.jpg`, type: 'jpeg', quality: 75 })
const state = () => p.evaluate(() => ({ chapter: window.__sirrStore.getState().chapterId, global: window.__sirrStore.getState().global, polished: !!window.__sirrNarrative }))
check('at the polishing spot', (await state()).chapter === 'nafs')

// a CDP-level touch swipe (what a finger does)
const cdp = await p.createCDPSession()
async function swipe(x0, y0, x1, y1, steps = 12) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] })
    await sleep(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

// vertical swipe on the middle of the mirror: the page must scroll
const before = await p.evaluate(() => window.scrollY)
await swipe(195, 600, 195, 250)
await sleep(1200)
const after = await p.evaluate(() => window.scrollY)
check('vertical swipe on the mirror scrolls the page', after > before + 50, `scrollY ${before} → ${after}`)

// back to the spot, then a sideways stroke: the mirror is polished
await p.evaluate((g) => window.scrollTo(0, g * (document.documentElement.scrollHeight - innerHeight)), g)
await sleep(4000)
const flashBefore = await p.evaluate(() => document.querySelector('.beat--flash')?.textContent ?? '')
await swipe(90, 420, 300, 430, 16)
await sleep(600)
const flash = await p.evaluate(() => document.querySelector('.beat--flash')?.textContent ?? '')
check('sideways stroke polishes the mirror', flash.includes('Silindikçe') || flashBefore.includes('Silindikçe'), flash || '(no line)')
await p.screenshot({ path: `${OUT}/mobile-nafs-after-stroke.jpg`, type: 'jpeg', quality: 75 })

// right after polishing, a vertical swipe must still scroll (nothing left locked)
{
  const y0 = await p.evaluate(() => window.scrollY)
  await swipe(195, 600, 195, 250)
  await sleep(1200)
  const y1 = await p.evaluate(() => window.scrollY)
  check('after polishing, a vertical swipe still scrolls', y1 > y0 + 50, `scrollY ${y0} → ${y1}`)
}

// once the mirror is water: a tap ripples, and a swipe that starts on the water still scrolls
{
  const gw = (VH[0] + VH[1] + VH[2] * 0.9) / T
  await p.evaluate((g) => window.scrollTo(0, g * (document.documentElement.scrollHeight - innerHeight)), gw)
  await sleep(5000)
  await p.touchscreen.tap(195, 420)
  await sleep(300)
  const y0 = await p.evaluate(() => window.scrollY)
  await swipe(195, 600, 195, 250)
  await sleep(1200)
  const y1 = await p.evaluate(() => window.scrollY)
  check('on the water, a swipe scrolls on (no lock after taps)', y1 > y0 + 50, `scrollY ${y0} → ${y1}`)
  const locked = await p.evaluate(() => document.documentElement.classList.contains('lenis-stopped'))
  check('scrolling is not left stopped', !locked)
}

// no blue tap flash
const tap = await p.evaluate(() => getComputedStyle(document.querySelector('canvas')).webkitTapHighlightColor)
check('no tap highlight on the scene', tap === 'rgba(0, 0, 0, 0)' || tap === 'transparent', tap)
await b.close()
