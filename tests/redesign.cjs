// Offline checks only: provider calls and form submissions are mocked.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(root).filter(p => p.endsWith('.html')).concat('services/index.html');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const previous = p => execFileSync('git', ['show', 'HEAD:' + p], { cwd: root, encoding: 'utf8' });
const head = s => s.replace(/\r\n/g, '\n').split('</head>')[0];
const seo = s => (head(s).match(/<title>[^<]*<\/title>|<meta\b[^>]*>|<link\b[^>]*rel="canonical"[^>]*>|<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).sort();
for (const p of pages) {
  const html = read(p);
  assert.deepEqual(seo(html), seo(previous(p)), p + ': SEO metadata changed');
  if (head(previous(p)).includes('AW-18488109939')) assert(head(html).includes('AW-18488109939'), p + ': Google Ads tag missing');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, p + ': expected one h1');
  assert(html.includes('/redesign.css'), p + ': shared design missing');
  assert(!/Denver|Colorado|Wyoming|303.?882|denverodorpros|RV &amp;/i.test(html), p + ': non-LA content');
  assert(!/Maria G\.|David R\.|Jennifer M\.|Samantha K\.|Alex P\.|Chris L\./.test(html), p + ': sample testimonials');
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    const url = match[1].split('?')[0];
    if (/^(?:https?:|tel:|mailto:|data:)/.test(url)) continue;
    let target = url.startsWith('/') ? url.slice(1) : path.join(path.dirname(p), url);
    if (!target) target = 'index.html';
    else if (!path.extname(target)) target += target === 'services' ? '/index.html' : '.html';
    assert(fs.existsSync(path.join(root, target)), p + ': missing linked asset/page ' + url);
  }
}
for (const p of ['script.js', 'api/estimate.js', 'api/estimate/index.js', 'vercel.json', 'index.js']) {
  assert.equal(read(p).replace(/\r\n/g, '\n'), previous(p).replace(/\r\n/g, '\n'), p + ': integration or routing changed');
}
for (const p of ['index.html', 'odor-removal-los-angeles.html']) {
  assert(read(p).includes('elfsight-app-167be2fe-5b02-4fc5-b780-a5f56a1a8d9d'), p + ': LA reviews missing');
  assert(read(p).includes('cid=4949297367772932104'), p + ': LA profile missing');
}
const home = read('index.html');
const order = ['class="hero"', 'id="services"', 'class="process-band"', 'id="service-area"', 'class="getting-started"', 'id="estimate"', 'id="google-reviews"', '<footer'];
for (let i = 1; i < order.length; i++) assert(home.indexOf(order[i]) > home.indexOf(order[i - 1]), 'Homepage section order');
assert.equal((home.match(/class="service-card"/g) || []).length, 5);
assert.equal((home.match(/<li>(?:Los Angeles|Santa Monica|Beverly Hills|Pasadena|Burbank|Glendale|Long Beach|Anaheim|Irvine|Riverside|San Bernardino|Ventura|Oxnard|Palmdale|Lancaster|San Diego)<\/li>/g) || []).length, 16);

function endpoint(file, outcome = 'success', configured = true) {
  const module = { exports: {} };
  const state = {};
  const sandbox = {
    module, process: { env: { RESEND_API_KEY: configured ? 'offline-test' : '', LEAD_TO_EMAIL: 'laodorpros@gmail.com', LEAD_FROM_EMAIL: 'LA ODOR PROS <test@example.test>' } },
    console: { error() {} }, AbortSignal,
    fetch: async (url, options) => {
      state.url = url; state.options = options; state.email = JSON.parse(options.body);
      if (outcome === 'throw') throw new Error('Offline provider failure');
      return { ok: outcome === 'success', json: async () => outcome === 'success' ? { id: 'offline-test' } : { message: 'rejected' } };
    },
  };
  vm.runInNewContext(read(file), sandbox);
  return { handler: module.exports, state };
}
async function call(handler, method = 'POST') {
  const result = {};
  const res = { setHeader() {}, status(code) { result.status = code; return this; }, json(body) { result.body = body; } };
  await handler({ method, body: { source: 'Offline redesign test', fields: { 'First name': 'Preview Test', Email: 'preview@example.test', Phone: '424-555-0100', Message: '<script>unsafe</script>' }, pageUrl: 'http://127.0.0.1:8096/' } }, res);
  return result;
}
function element() { return { value: '', handlers: {}, dataset: {}, disabled: false, addEventListener(name, fn) { this.handlers[name] = fn; }, setAttribute() {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} } }; }
async function testClient(page, successful) {
  const form = element(), button = element();
  let status;
  form.querySelector = s => s === '.form-status' ? status : s.includes('submit') ? button : null;
  form.appendChild = node => { status = node; };
  form.reset = () => { form.wasReset = true; };
  const fields = { 'First name': 'Preview Test', Email: 'preview@example.test', Phone: '424-555-0100', Service: 'Pet Odor Removal', Message: 'Offline only' };
  const state = {};
  const sandbox = {
    document: { body: { dataset: {} }, querySelectorAll: s => s === '.estimate-form' ? [form] : [], querySelector: () => null, createElement: element, getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }] },
    window: { addEventListener() {}, location: { href: 'http://127.0.0.1:8096/' + page } },
    FormData: class { entries() { return Object.entries(fields); } },
    fetch: async (url, options) => { state.url = url; state.payload = JSON.parse(options.body); return { ok: successful, json: async () => successful ? { ok: true } : { error: 'Simulated failure' } }; },
    console, Intl, setTimeout() {},
  };
  vm.runInNewContext(read('script.js'), sandbox);
  await form.handlers.submit({ preventDefault() {} });
  assert.equal(state.url, '/api/estimate');
  assert.equal(state.payload.fields.Service, fields.Service);
  assert.equal(button.disabled, false);
  if (successful) { assert.equal(sandbox.window.location.href, '/thank-you'); assert(form.wasReset); }
  else { assert.equal(status.dataset.type, 'error'); assert.match(status.textContent, /424-553-9449.*laodorpros@gmail.com/); }
}
(async () => {
  for (const file of ['api/estimate.js', 'api/estimate/index.js']) {
    const success = endpoint(file);
    assert.equal((await call(success.handler)).status, 200);
    assert.equal(success.state.url, 'https://api.resend.com/emails');
    assert.equal(success.state.email.to, 'laodorpros@gmail.com');
    assert.equal(success.state.email.reply_to, 'preview@example.test');
    assert(success.state.email.html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
    assert.equal((await call(success.handler, 'GET')).status, 405);
    assert.equal((await call(endpoint(file, 'success', false).handler)).status, 500);
    assert.equal((await call(endpoint(file, 'reject').handler)).status, 502);
    assert.equal((await call(endpoint(file, 'throw').handler)).status, 500);
  }
  for (const page of ['', 'odor-removal-los-angeles']) {
    await testClient(page, true); await testClient(page, false);
  }
  console.log(`PASS: ${pages.length} pages; unchanged SEO, Ads, integrations and routes; local links; LA content, service area and widget; both email handlers and form success/failure flows. No real email sent.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
