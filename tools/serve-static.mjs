/**
 * Minimal static server for the exported site (no dependencies). For local preview and QA only.
 *   node tools/serve-static.mjs [dir=out] [port=3100]
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.argv[2] ?? 'out')
const PORT = Number(process.argv[3] ?? 3100)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    let file = path.join(ROOT, url)
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end()
      return
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html'
    if (!fs.existsSync(file)) {
      const nf = path.join(ROOT, '404.html')
      res.writeHead(404, { 'content-type': TYPES['.html'] })
      res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found')
      return
    }
    const immutable = url.startsWith('/_next/static/')
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`))
