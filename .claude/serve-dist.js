// Minimal static file server for the exported web build (dist/).
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'dist')
const PORT = 8088
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.map': 'application/json',
}

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    let filePath = path.join(ROOT, urlPath)
    if (urlPath === '/' || !path.extname(filePath)) filePath = path.join(ROOT, 'index.html')
    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(ROOT, 'index.html'), (e2, html) => {
          if (e2) { res.writeHead(404); res.end('Not found'); return }
          res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html)
        })
        return
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' })
      res.end(data)
    })
  })
  .listen(PORT, () => console.log(`Serving dist on http://localhost:${PORT}`))
