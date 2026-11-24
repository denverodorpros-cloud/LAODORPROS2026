// Local preview only. Email delivery is simulated; no message leaves this process.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const port = Number(process.env.PORT || 8096);
const handlerModule = { exports: {} };
const sandbox = {
  module: handlerModule,
  process: { env: { RESEND_API_KEY: 'local-preview-only', LEAD_TO_EMAIL: 'laodorpros@gmail.com', LEAD_FROM_EMAIL: 'LA ODOR PROS <preview@example.test>' } },
  fetch: async () => ({ ok: true, json: async () => ({ id: 'local-preview-no-email' }) }),
  AbortSignal, console,
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'api/estimate.js'), 'utf8'), sandbox);
const redirects = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).redirects || [];
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/estimate') {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 65536) { res.writeHead(413); return res.end(); } }
    let payload;
    try { payload = body ? JSON.parse(body) : {}; } catch { res.writeHead(400); return res.end('Invalid JSON'); }
    const adapter = { setHeader: (k, v) => res.setHeader(k, v), status(code) { res.statusCode = code; return this; }, json(value) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); } };
    console.log('Local estimate request tested; email delivery simulated.');
    return handlerModule.exports({ method: req.method, body: payload }, adapter);
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  const redirect = redirects.find(r => r.source === pathname);
  if (redirect) { res.writeHead(redirect.statusCode, { Location: redirect.destination }); return res.end(); }
  if (pathname === '/') pathname = '/index.html';
  else if (!path.extname(pathname)) pathname += pathname === '/services' ? '/index.html' : '.html';
  const target = path.resolve(root, '.' + pathname);
  if (!target.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(target, (error, bytes) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  });
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port} (email delivery simulated)`));
