// 本地管理后台静态服务器（零依赖）：托管 admin/dist 并把 /api/* 反代到后端 :3000。
// 用法：node serve-admin.cjs
const http = require('http')
const fs = require('fs')
const path = require('path')

const ADMIN_DIST = 'd:/app/code/code/career-gene-platform/admin/dist'
const PORT = 8081
const API_HOST = '127.0.0.1'
const API_PORT = 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  const url = req.url || '/'

  // 反向代理 /api/* -> 后端 127.0.0.1:3000（剥离 /api 前缀）
  if (url.startsWith('/api/') || url === '/api') {
    const targetPath = url === '/api' ? '/' : url.slice('/api'.length)
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: targetPath,
      method: req.method,
      headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` },
    }
    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
      proxyRes.pipe(res)
    })
    proxy.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'backend unreachable', detail: e.message }))
    })
    req.pipe(proxy)
    return
  }

  // 静态文件 + SPA fallback
  const pathname = decodeURIComponent(url.split('?')[0])
  let filePath = path.join(ADMIN_DIST, pathname)
  if (pathname === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ADMIN_DIST, 'index.html')
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    const ext = path.extname(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`admin server listening on http://localhost:${PORT}`)
})
