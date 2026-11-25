// Keep estimate alerts independent of visitor-session cookies and throttling.
async function notifyEstimate(payload) {
  try {
    const token = process.env.PUSHOVER_APP_TOKEN;
    const user = process.env.PUSHOVER_USER_KEY;
    if (!token || !user) return 'disabled';
    const services = new Map([
      ['real estate & rentals', 'Real Estate & Rentals'],
      ['real estate / rental odor removal', 'Real Estate & Rentals'],
      ['pet odor removal', 'Pet Odor Removal'],
      ['smoke odor removal', 'Smoke Odor Removal'],
      ['marijuana odor removal', 'Marijuana Odor Removal'],
      ['vehicle odor removal', 'Vehicle Odor Removal']
    ]);
    const value = payload.fields.Service;
    const service = services.get(typeof value === 'string' ? value.trim().toLowerCase() : '') || 'Not specified';
    const paths = new Set(['/', '/about', '/faq', '/services', '/odor-removal-los-angeles', '/thank-you',
      '/pet-odor-removal-los-angeles', '/smoke-odor-removal-los-angeles', '/marijuana-odor-removal-los-angeles',
      '/vehicle-odor-removal-los-angeles', '/real-estate-odor-removal-los-angeles']);
    let path = '/';
    try {
      const url = new URL(payload.pageUrl);
      if (['https://www.laodorpros.com', 'https://laodorpros.com'].includes(url.origin) && paths.has(url.pathname)) path = url.pathname;
    } catch { /* Unknown URLs use the fixed homepage label. */ }
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({ token, user, title: 'LA ODOR PROS — Free Estimate request', priority: 0,
        message: 'Service: ' + service + '\nPage: ' + path })
    });
    const result = await response.json().catch(() => ({}));
    return response.ok && result.status === 1 ? 'accepted' : 'failed';
  } catch { return 'failed'; }
}

const TO_EMAIL = process.env.LEAD_TO_EMAIL || "info@laodorpros.com";
const FROM_EMAIL = process.env.LEAD_FROM_EMAIL || "LA ODOR PROS <onboarding@resend.dev>";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatFieldLabel(key) {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEmailHtml(payload) {
  const fields = payload.fields || {};
  const rows = Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5eef3;font-weight:700;color:#082f49;">${escapeHtml(formatFieldLabel(key))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5eef3;color:#16394d;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join("");

  const chatHtml = Array.isArray(payload.chatHistory) && payload.chatHistory.length
    ? `
      <h2 style="font-size:18px;color:#082f49;margin:26px 0 10px;">Recent Chat</h2>
      <div style="background:#f2fbff;border:1px solid #d8edf6;border-radius:10px;padding:14px;color:#16394d;white-space:pre-wrap;">${escapeHtml(payload.chatHistory.join("\n"))}</div>
    `
    : "";

  return `
    <div style="font-family:Arial,sans-serif;background:#f6fbff;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #d8edf6;">
        <div style="background:linear-gradient(135deg,#16a36a,#0787c8);padding:22px;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">New LA ODOR PROS Estimate Request</h1>
          <p style="margin:8px 0 0;opacity:.9;">Source: ${escapeHtml(payload.source || "Website form")}</p>
        </div>
        <div style="padding:22px;">
          <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5eef3;border-radius:10px;overflow:hidden;">
            ${rows || '<tr><td style="padding:12px;color:#16394d;">No form details were submitted.</td></tr>'}
          </table>
          ${chatHtml}
          <p style="margin:22px 0 0;color:#5b7080;font-size:13px;">Page: ${escapeHtml(payload.pageUrl || "Unknown")}</p>
        </div>
      </div>
    </div>
  `;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body;
  const fields = payload && payload.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields) ||
      Object.keys(fields).length > 20 ||
      Object.values(fields).some(value => typeof value !== "string" || value.length > 5000)) {
    return res.status(400).json({ error: "Please provide valid estimate details." });
  }
  const name = fields.Name || fields["First name"];
  const email = fields.Email;
  if (!name || !name.trim() || (!fields.Phone?.trim() && !email?.trim()) ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      (payload.chatHistory !== undefined && (!Array.isArray(payload.chatHistory) ||
        payload.chatHistory.length > 12 || payload.chatHistory.some(line => typeof line !== "string" || line.length > 5000)))) {
    return res.status(400).json({ error: "Please include your name and a valid phone number or email." });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "Email backend is not configured yet." });
  }

  try {

    const visitorName = fields.Name || fields["First name"] || "Website visitor";
    const visitorPhone = fields.Phone ? ` - ${fields.Phone}` : "";
    const subject = `New odor removal estimate request: ${visitorName}${visitorPhone}`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        reply_to: fields.Email || undefined,
        subject,
        html: buildEmailHtml(payload)
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({ error: "Email provider rejected the message.", details: result });
    }

    const notification = await notifyEstimate(payload);
    return res.status(200).json({ ok: true, id: result.id, notification });
  } catch (error) {
    return res.status(500).json({ error: "Could not send estimate request." });
  }
};
