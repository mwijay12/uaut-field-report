// Checks Altra: the notes first (in Node, with no browser), then the panel in a
// real page.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium
//   npm run build && npm run preview &
//   node scripts/chat-check.mjs
//
// What it holds the work to:
//   - every note answers in both languages, and every note a button points at
//     exists. A chip that leads nowhere is a dead end nobody notices.
//   - the price note quotes the prices in content/site.json, so a price changed
//     in the admin changes here too, without anybody remembering to.
//   - a question nothing knows is answered with a person on WhatsApp, not a
//     guess. That is the promise the panel makes in its own footer.
//   - the panel opens from its button with the cursor in the box, closes on
//     Escape with focus back on the button, and fits a 390 px screen.
//   - no request leaves the page for anything but this site's own files: the
//     assistant must never talk to a provider, a model or a CDN.
//   - the console stays clean, in English and in Kiswahili, with reduced motion.
//
// Prints one line per promise and exits with an error on the first broken one.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { derive } from '../content/derive.js';
import { tidy } from '../content/schema.js';
import { answer, replyFor, starters } from '../src/lib/chat/answer.js';
import { knowledge } from '../src/lib/chat/knowledge.js';

const site = derive(tidy(JSON.parse(readFileSync(resolve('content/site.json'), 'utf8'))));
let failures = 0;
const pass = (line) => console.log(`  ok    ${line}`);
const fail = (line) => {
  failures += 1;
  console.log(`  FAIL  ${line}`);
};
const hold = (condition, line) => (condition ? pass(line) : fail(line));

// ---------- The notes ----------

console.log('the notes');

const entries = knowledge(site);
for (const entry of entries) {
  hold(Boolean(entry.en && entry.sw), `${entry.id}: an answer in English and in Kiswahili`);
  for (const link of entry.go ?? []) {
    hold(/^(https:\/\/|\/)/.test(link.href), `${entry.id}: link ${link.href} is absolute or on this site`);
  }
  for (const next of entry.next ?? []) {
    hold(entries.some((item) => item.id === next), `${entry.id}: next note ${next} exists`);
  }
}

// A price written into a note by hand would go stale the first time the admin
// changes it. Every note that mentions money must agree with the content file.
const priced = entries.filter((entry) => /TSh/.test(entry.en) || /TSh/.test(entry.sw));
for (const entry of priced) {
  for (const lang of ['en', 'sw']) {
    const quoted = [...entry[lang].matchAll(/TSh (\d[\d,]*\d|\d)/g)].map((match) => match[1]);
    const real = new Set(Object.values(site.price));
    for (const amount of quoted) hold(real.has(amount), `${entry.id}.${lang}: TSh ${amount} is a price in content/site.json`);
  }
}

// The same question in both languages, and the answer that comes back.
const cases = [
  ['how much does a website cost', 'price', 'en'],
  ['tovuti inagharimu kiasi gani', 'price', 'sw'],
  ['can it work without internet', 'offline', 'en'],
  ['mnawafunza wafanyakazi', 'train', 'sw'],
  ['who owns the code and the data', 'own', 'en'],
  ['where are you', 'where', 'en'],
];
for (const [question, expected, lang] of cases) {
  const reply = answer(question, { site });
  hold(reply.id === expected && reply.lang === lang, `"${question}" → ${expected} in ${lang} (got ${reply.id} in ${reply.lang})`);
}

// Nothing known: the honest answer, and a way to reach a person.
for (const question of ['do you do tiktok ads', 'what is the weather in Dar', 'je mnauza gari']) {
  const reply = answer(question, { site });
  hold(reply.id === 'unknown', `"${question}" is not guessed at`);
  hold(reply.go.some((link) => link.href === site.person.whatsapp), `"${question}" offers WhatsApp to a person`);
}

// Every button in the panel answers something.
for (const lang of ['en', 'sw']) {
  for (const chip of starters(lang, site)) {
    const reply = replyFor(chip.id, lang, site);
    hold(reply.id === chip.id && reply.lang === lang && reply.text.length > 20, `button "${chip.label}" → ${chip.id} in ${lang}`);
  }
}

// ---------- The panel ----------

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const base = option('base', 'http://localhost:4173');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});

/** A page, with everything that went wrong on it collected as it goes. */
async function open({ width = 1440, height = 900, reduced = false, touch = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const trouble = [];
  const requests = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) trouble.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => trouble.push(`page error: ${error.message}`));
  page.on('requestfailed', (request) => trouble.push(`failed request: ${request.url()}`));
  page.on('request', (request) => requests.push(request.url()));
  await page.goto(`${base}/?theme=dark`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), { timeout: 30000 });
  await sleep(1200);
  return { page, trouble, requests };
}

const state = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('[data-chat-panel]');
    const launch = document.querySelector('[data-chat-open]');
    const box = panel.getBoundingClientRect();
    return {
      open: !panel.hidden,
      expanded: launch.getAttribute('aria-expanded'),
      focus: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName || '',
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      messages: panel.querySelectorAll('.chat__msg').length,
      last: panel.querySelector('.chat__text')?.textContent ?? '',
      texts: [...panel.querySelectorAll('.chat__text')].map((node) => node.textContent),
      chips: [...panel.querySelectorAll('.chat__chip')].map((node) => node.textContent),
    };
  });

async function ask(page, text) {
  await page.click('[data-chat-input]');
  await page.type('[data-chat-input]', text);
  await page.keyboard.press('Enter');
  await sleep(500);
  return state(page);
}

console.log('\nthe panel');

// A desktop screen, in the dark.
{
  const { page, trouble, requests } = await open();
  const before = await state(page);
  hold(!before.open, 'the panel starts closed');

  await page.click('[data-chat-open]');
  await sleep(700);
  const opened = await state(page);
  hold(opened.open && opened.expanded === 'true', 'the button opens the panel and says so');
  hold(opened.focus === 'chat-input', `the cursor is in the box (focus is ${opened.focus})`);
  hold(opened.messages >= 1 && opened.chips.length >= 3, 'Altra greets, with buttons to start from');

  const priced = await ask(page, 'how much does a website cost');
  hold(/TSh/.test(priced.texts.at(-1) ?? ''), `a question about price is answered with prices (${priced.texts.at(-1)?.slice(0, 40)}…)`);

  await page.click('[data-chat-lang="sw"]');
  await sleep(400);
  const swahili = await ask(page, 'mnajenga nini');
  const lastSw = swahili.texts.at(-1) ?? '';
  hold(/tovuti|mifumo|apu/i.test(lastSw) && !/^Five kinds/.test(lastSw), 'a Kiswahili question is answered in Kiswahili');

  const unknown = await ask(page, 'do you do tiktok ads');
  hold(
    unknown.texts.at(-1)?.includes('whatsapp') || unknown.texts.at(-1)?.toLowerCase().includes('whatsapp'),
    'a question it cannot answer opens WhatsApp instead of guessing',
  );

  await page.keyboard.press('Escape');
  await sleep(500);
  const closed = await state(page);
  hold(!closed.open && closed.expanded === 'false', 'Escape closes the panel');
  hold(String(closed.focus).includes('chat__launch'), `focus goes back to the button that opened it (focus is ${closed.focus || 'nothing'})`);

  // Nothing may leave this site: no provider, no model, no font CDN.
  const elsewhere = requests.filter((url) => !url.startsWith(base) && !url.startsWith('data:'));
  hold(elsewhere.length === 0, `the page asked for nothing but its own files (${elsewhere.slice(0, 3).join(', ') || 'none'})`);

  hold(trouble.length === 0, `console clean at 1440 (${trouble.slice(0, 2).join(' | ') || 'clean'})`);
  await page.close();
}

// A phone, in the light.
{
  const { page, trouble } = await open({ width: 390, height: 844, touch: true });
  await page.goto(`${base}/?theme=light`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), { timeout: 30000 });
  await sleep(800);
  await page.click('[data-chat-open]');
  await sleep(700);
  const phone = await state(page);
  hold(phone.box.width <= phone.viewport.width + 1, `the panel fits 390 px (${Math.round(phone.box.width)} wide)`);
  hold(phone.box.height <= phone.viewport.height, `the panel fits the screen height (${Math.round(phone.box.height)} of ${phone.viewport.height})`);
  const answered = await ask(page, 'how do i start');
  hold(answered.texts.length > 1, 'a question is answered on a phone');
  hold(trouble.length === 0, `console clean at 390 (${trouble.slice(0, 2).join(' | ') || 'clean'})`);
  await page.close();
}

// Reduced motion: no tween, and the panel still works.
{
  const { page, trouble } = await open({ reduced: true });
  await page.click('[data-chat-open]');
  await sleep(120);
  const quick = await state(page);
  hold(quick.open, 'with reduced motion the panel is there at once');
  await page.keyboard.press('Escape');
  await sleep(120);
  const gone = await state(page);
  hold(!gone.open, 'with reduced motion it closes at once');
  hold(trouble.length === 0, `console clean with reduced motion (${trouble.slice(0, 2).join(' | ') || 'clean'})`);
  await page.close();
}

await browser.close();

if (failures) {
  console.error(`\n${failures} broken promise${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log('\nall steps passed, console clean');
