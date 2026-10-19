// Offline regression checks; no live emails or visitor-tracking requests.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function element() {
  const classes = new Set();
  return { value: '', children: [], handlers: {}, dataset: {},
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x) { if (classes.has(x)) { classes.delete(x); return false; } classes.add(x); return true; } },
    addEventListener(name, fn) { this.handlers[name] = fn; },
    appendChild(node) { this.children.push(node); }, setAttribute() {},
    querySelector() { return null; }
  };
}
const selectors = Object.fromEntries(['.chat-button', '.chat-box', '.chat-body', '.chat-input', '.chat-input input', '.chat-estimate-toggle', '.chat-estimate-form', '.chat-close'].map(s => [s, element()]));
const squareInput = element(), submitButton = element();
selectors['.chat-estimate-form'].querySelector = s => s.includes('Square footage') ? squareInput : s.includes('submit') ? submitButton : null;
selectors['.chat-estimate-form'].reset = () => {};
const timers = [];
const sandbox = {
  document: { body: { dataset: { page: 'home' } }, querySelectorAll: () => [],
    querySelector: s => selectors[s] || null, createElement: element,
    getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }] },
  window: { addEventListener() {}, location: { href: 'https://local.test/' } },
  FormData: class { entries() { return Object.entries({ Name: 'Offline Test', Phone: '424-555-0100' }); } },
  fetch: async (_, options) => { sandbox.lastPayload = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; },
  Intl, console, setTimeout: fn => timers.push(fn)
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('script.js', 'utf8'), sandbox);
for (const faq of vm.runInContext('faqAnswers', sandbox)) {
  if (sandbox.wantsEstimate(faq.question)) assert.match(sandbox.replyToChat(faq.question), /Free Estimate form/);
  else assert.equal(sandbox.replyToChat(faq.question), faq.answer);
}
const cases = [
  ['Do you remove pet odor?', /Yes.*pet odor/],
  ['Do you remove smoke odor?', /Yes.*smoke odor/],
  ['Can you remove marijuana odor?', /Yes.*marijuana/],
  ['How much for an SUV?', /Free Estimate form/],
  ['How much for a boat?', /Free Estimate form/],
  ['What is your service price?', /Free Estimate form/],
  ['I have a 2 bedroom apartment', /square footage|Free Estimate form|homes/],
  ['My home has 3 rooms', /square footage|Free Estimate form|homes/],
  ['1500', /Free Estimate form/],
  ['1000 sqf', /Free Estimate form/],
  ['1,500 square feet', /Free Estimate form/],
  ['Can you remove smoke odor from a 1000 sq ft home?', /Free Estimate form/],
  ['Can you come back tomorrow?', /confirm availability/],
  ['Can we stay inside safely?', /must be out/],
  ['Do you serve cities outside Los Angeles?', /150 miles/]
];
for (const [question, expected] of cases) assert.match(sandbox.replyToChat(question), expected, question);
timers[0]();
assert(selectors['.chat-box'].classList.contains('open'));
selectors['.chat-close'].handlers.click();
assert(!selectors['.chat-box'].classList.contains('open'));
selectors['.chat-button'].handlers.click();
assert(selectors['.chat-box'].classList.contains('open'));
selectors['.chat-input input'].value = '1000 sqf';
selectors['.chat-input'].handlers.submit({ preventDefault() {} });
assert(selectors['.chat-estimate-form'].classList.contains('open'));
assert.equal(squareInput.value, 1000);
assert(selectors['.chat-body'].children.some(e => e.textContent.includes('Free Estimate form')));
for (const question of ['I need a quote', 'What is your pricing?', 'How much for my car?', 'How much for an RV?', 'What do you charge?', 'How expensive is it?', '1000 sqft', 'How much for pet odor tomorrow?']) {
  selectors['.chat-estimate-form'].classList.remove('open');
  selectors['.chat-input input'].value = question;
  selectors['.chat-input'].handlers.submit({ preventDefault() {} });
  assert(selectors['.chat-estimate-form'].classList.contains('open'), question);
  assert.doesNotMatch(sandbox.replyToChat(question), /\$/);
}
assert.doesNotMatch(selectors['.chat-body'].children.map(e => e.textContent).join(' '), /\$/);
(async () => {
  await selectors['.chat-estimate-form'].handlers.submit({ preventDefault() {} });
  assert.equal(sandbox.lastPayload.fields.Name, 'Offline Test');
  assert(sandbox.lastPayload.chatHistory.some(line => line.includes('1000 sqf')));
  assert.equal(sandbox.window.location.href, '/thank-you');
  sandbox.window.location.href = 'https://local.test/';
  sandbox.fetch = async () => ({ ok: false, json: async () => ({ error: 'Offline test rejection' }) });
  await selectors['.chat-estimate-form'].handlers.submit({ preventDefault() {} });
  assert.equal(sandbox.window.location.href, 'https://local.test/');
  assert.equal(submitButton.disabled, false);
  assert(selectors['.chat-body'].children.some(e => e.textContent.includes('could not send')));
  console.log('PASS: 20 FAQ answers, 15 conversation cases, auto-open/close/reopen, 8 quote requests opening form without prices, sqf prefill, lead payload/history, success redirect, failure fallback. No real email sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
