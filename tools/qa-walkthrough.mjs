/**
 * SIRR QA walkthrough — drives the real experience in headless Chrome with the GPU enabled.
 *
 *   npm run build && npx next start -p 3100
 *   node tools/qa-walkthrough.mjs http://localhost:3100 qa-out high,medium,low
 *
 * For every quality tier and chapter it records: frame times, draw calls, triangles, GPU memory,
 * console errors, and whether the frame is black (a NaN smeared by bloom) — from real screenshots.
 * It also scrolls smoothly across each threshold and reports the worst hitch.
 * Uses a throwaway browser profile; nothing touches your own browser.
 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE = (process.argv[2] ?? 'http://localhost:3100').replace(/\/$/, '')
const OUT = process.argv[3] ?? 'qa-out'
const QUALITIES = (process.argv[4] ?? 'high,medium,low').split(',')
const VIEW = process.argv[5] ?? 'desktop' // desktop | mobile
const CHROME =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) =>
    fs.existsSync(p),
  )

// must match src/content/chapters.ts scrollVh
const CHAPTERS = [
  ['awakening', 900],
  ['creation', 1000],
  ['nafs', 1000],
  ['time', 1100],
  ['stillness', 1100],
  ['return', 1000],
]
const TOTAL = CHAPTERS.reduce((a, [, v]) => a + v, 0)
const startOf = (i) => CHAPTERS.slice(0, i).reduce((a, [, v]) => a + v, 0) / TOTAL
const globalOf = (i, local) => startOf(i) + (CHAPTERS[i][1] / TOTAL) * local
const SAMPLES = [0.15, 0.5, 0.85]

fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function frames(page, ms) {
  return page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const d = []
        let last = performance.now()
        const end = last + ms
        const f = (t) => {
          d.push(t - last)
          last = t
          if (t < end) requestAnimationFrame(f)
          else resolve(d)
        }
        requestAnimationFrame(f)
      }),
    ms,
  )
}

function stats(d) {
  const s = [...d].sort((a, b) => a - b)
  const avg = d.reduce((a, b) => a + b, 0) / d.length
  return { fps: +(1000 / avg).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1) }
}

async function luminance(page, b64) {
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/jpeg;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 100
    const x = c.getContext('2d')
    x.drawImage(img, 0, 0, 160, 100)
    const p = x.getImageData(0, 0, 160, 100).data
    let sum = 0
    let black = 0
    for (let i = 0; i < p.length; i += 4) {
      const l = (p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722) / 255
      sum += l
      if (l < 0.015) black++
    }
    return { mean: +(sum / (p.length / 4)).toFixed(3), black: +(black / (p.length / 4)).toFixed(3) }
  }, b64)
}

async function goTo(page, g) {
  await page.evaluate((g) => {
    const L = document.documentElement.scrollHeight - innerHeight
    window.scrollTo(0, g * L)
  }, g)
}

async function info(page) {
  // renderer.info resets on every render pass; accumulate over ~half a second of real frames instead
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const gl = window.__gl
        if (!gl) return resolve(null)
        gl.info.autoReset = false
        gl.info.reset()
        let n = 0
        const t0 = performance.now()
        const f = () => {
          n++
          if (performance.now() - t0 < 500) return requestAnimationFrame(f)
          const r = gl.info.render
          const out = { calls: Math.round(r.calls / n), tris: Math.round(r.triangles / n), geo: gl.info.memory.geometries, tex: gl.info.memory.textures }
          gl.info.autoReset = true
          resolve(out)
        }
        requestAnimationFrame(f)
      }),
  )
}

const report = { base: BASE, view: VIEW, when: new Date().toISOString(), runs: [] }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=default', '--enable-webgl', '--disable-gpu-vsync=false'],
  defaultViewport:
    VIEW === 'mobile'
      ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { width: 1440, height: 900, deviceScaleFactor: 1 },
})

for (const q of QUALITIES) {
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  await page.goto(`${BASE}/?qa=1&q=${q}`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })
  await sleep(2500)
  const renderer = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('webgl2')
    const e = c.getExtension('WEBGL_debug_renderer_info')
    return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER)
  })
  const run = { quality: q, renderer, chapters: [], transitions: [], errors }

  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = { id: CHAPTERS[i][0], samples: [] }
    for (const local of SAMPLES) {
      await goTo(page, globalOf(i, local))
      await sleep(3500) // camera damping + any scene mount
      const st = stats(await frames(page, 2500))
      const shot = await page.screenshot({ type: 'jpeg', quality: 70, encoding: 'base64' })
      fs.writeFileSync(path.join(OUT, `${VIEW}-${q}-${i + 1}-${ch.id}-${Math.round(local * 100)}.jpg`), Buffer.from(shot, 'base64'))
      const lum = await luminance(page, shot)
      const chapterNow = await page.evaluate(() => window.__sirrStore.getState().chapterId)
      ch.samples.push({ local, ...st, ...lum, chapterNow, ...(await info(page)) })
    }
    run.chapters.push(ch)
  }

  // smooth scroll across each threshold, the way a visitor would
  for (let i = 0; i < CHAPTERS.length - 1; i++) {
    await goTo(page, globalOf(i, 0.86))
    await sleep(3000)
    const from = globalOf(i, 0.86)
    const to = globalOf(i + 1, 0.12)
    const d = await page.evaluate(
      (from, to) =>
        new Promise((resolve) => {
          const L = document.documentElement.scrollHeight - innerHeight
          const out = []
          const t0 = performance.now()
          let last = t0
          const dur = 4000
          const f = (t) => {
            out.push(t - last)
            last = t
            const k = Math.min(1, (t - t0) / dur)
            window.scrollTo(0, (from + (to - from) * k) * L)
            if (t - t0 < dur + 2500) requestAnimationFrame(f)
            else resolve(out)
          }
          requestAnimationFrame(f)
        }),
      from,
      to,
    )
    const st = stats(d)
    run.transitions.push({ from: CHAPTERS[i][0], to: CHAPTERS[i + 1][0], ...st, hitches: d.filter((x) => x > 50).length })
  }

  // memory after visiting everything, then back at the start (leaks show as growth)
  await goTo(page, 0.01)
  await sleep(4000)
  run.memoryAtStartAgain = await info(page)
  report.runs.push(run)
  await page.close()
  console.log(`done: ${q}`)
}

await browser.close()
fs.writeFileSync(path.join(OUT, `report-${VIEW}.json`), JSON.stringify(report, null, 2))

// compact table
for (const r of report.runs) {
  console.log(`\n== ${r.quality} | ${r.renderer}`)
  for (const c of r.chapters)
    for (const s of c.samples)
      console.log(
        `${c.id.padEnd(10)} ${String(s.local).padEnd(5)} fps ${String(s.fps).padEnd(6)} p95 ${String(s.p95).padEnd(6)}ms max ${String(s.max).padEnd(7)} calls ${String(s.calls).padEnd(4)} tris ${String(s.tris).padEnd(8)} lum ${s.mean} black ${s.black}${s.chapterNow !== c.id ? ' (chapter=' + s.chapterNow + ')' : ''}`,
      )
  for (const t of r.transitions) console.log(`  ${t.from} → ${t.to}: fps ${t.fps} max ${t.max}ms hitches>50ms ${t.hitches}`)
  console.log('  memory at start again:', JSON.stringify(r.memoryAtStartAgain))
  if (r.errors.length) console.log('  errors:', r.errors.slice(0, 5))
}
