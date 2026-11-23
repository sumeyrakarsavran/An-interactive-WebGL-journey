/**
 * Accessibility smoke test (server on :3100): reduced motion is honoured, number keys jump
 * through the curtain, reading mode shows the full text journey, and the controls are reachable
 * by keyboard. Prints PASS/FAIL per check.
 */
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1280, height: 800 } })
const p = await b.newPage()
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.goto('http://localhost:3100/?qa=1&q=low', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => window.__sirrStore?.getState().ready, { timeout: 30000 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const st = () => p.evaluate(() => { const s = window.__sirrStore.getState(); return { reduced: s.reducedMotion, chapter: s.chapterId, text: s.textMode } })
const check = (name, ok, detail = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
await sleep(2000)
check('reduced motion detected', (await st()).reduced)
await p.keyboard.press('3'); await sleep(3500)
check('key 3 jumps to Nefs', (await st()).chapter === 'nafs', (await st()).chapter)
await p.keyboard.press('6'); await sleep(3500)
check('key 6 jumps to Dönüş', (await st()).chapter === 'return', (await st()).chapter)
await p.keyboard.press('k'); await sleep(800)
const panel = await p.evaluate(() => document.querySelector('#sources')?.classList.contains('is-open') && document.activeElement?.textContent?.trim())
check('K opens sources, focus moves to Kapat', panel === 'Kapat', String(panel))
await p.keyboard.press('Escape'); await sleep(800)
check('Esc closes sources', await p.evaluate(() => !document.querySelector('#sources')?.classList.contains('is-open')))
// keyboard reachability of the controls
const reached = new Set()
for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); const t = await p.evaluate(() => document.activeElement?.textContent?.trim()); if (t) reached.add(t) }
check('controls reachable by Tab', ['Metin', 'Sessizlik', 'Kaynaklar'].every((x) => [...reached].some((r) => r.includes(x))), [...reached].slice(0, 12).join(' | '))
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'Metin')?.click()); await sleep(1200)
const text = await p.evaluate(() => { const a = document.querySelector('.text-journey'); const cs = getComputedStyle(a); return { h2: a.querySelectorAll('h2').length, visible: cs.position === 'static', canvasHidden: getComputedStyle(document.querySelector('.stage')).display === 'none' } })
check('reading mode shows all six chapters as text', text.h2 === 6 && text.visible && text.canvasHidden, JSON.stringify(text))
const sr = await p.evaluate(() => ({ stage: document.querySelector('.stage')?.getAttribute('aria-hidden'), overlay: document.querySelector('.narrative')?.getAttribute('aria-hidden'), lang: document.documentElement.lang }))
check('canvas and overlay hidden from screen readers; lang=tr', sr.stage === 'true' && sr.overlay === 'true' && sr.lang === 'tr', JSON.stringify(sr))
await b.close()
