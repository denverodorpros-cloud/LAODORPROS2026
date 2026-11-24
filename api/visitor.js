// Server-only visitor alerts. Pushover credentials never reach the browser.
let lastAlertAt = 0;
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers.origin !== 'https://www.laodorpros.com' && req.headers.origin !== 'https://laodorpros.com') return res.status(403).json({ error: 'Forbidden' });
  if (/bot|crawler|spider|headless|preview/i.test(req.headers['user-agent'] || '')) return res.status(204).end();
  if (/(?:^|;\s*)la_visitor_alert=1(?:;|$)/.test(req.headers.cookie || '')) return res.status(204).end();
  const token = process.env.PUSHOVER_APP_TOKEN;
  const user = process.env.PUSHOVER_USER_KEY;
  if (!token || !user) return res.status(503).json({ error: 'Visitor alerts not configured' });
  // Coalesce busy traffic within each function instance; this is not a global rate limit.
  if (Date.now() - lastAlertAt < 60000) return res.status(204).end();
  const path = typeof req.body?.path === 'string' ? req.body.path.split(/[?#]/)[0].slice(0, 200) : '/';
  if (!path.startsWith('/') || path.startsWith('//')) return res.status(400).json({ error: 'Invalid page' });
  lastAlertAt = Date.now();
  try {
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ token, user, title: 'LA ODOR PROS — Website visitor', message: 'A visitor opened ' + path, priority: 0 })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status !== 1) return res.status(502).json({ error: 'Notification unavailable' });
    res.setHeader('Set-Cookie', 'la_visitor_alert=1; Path=/; HttpOnly; Secure; SameSite=Lax');
    return res.status(200).json({ ok: true });
  } catch { return res.status(502).json({ error: 'Notification unavailable' }); }
};
