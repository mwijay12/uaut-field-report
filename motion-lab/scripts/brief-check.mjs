// Walks through the brief form on the contact page, both ways it can be built:
// with the inbox off (the form only opens WhatsApp) and with the inbox on (a
// copy of the brief is saved in the main site's Firestore as well).
//
//   npm i --no-save puppeteer-core @sparticuz/chromium
//   node scripts/brief-check.mjs [--shots]
//
// --shots saves pictures of the form at its main moments in ./shots.
//
// It builds the site twice into a temporary folder, once from content/site.json
// with the inbox off and once with a made-up project ID, serves both, and
// fills the form in a headless browser. Requests to Firestore and to WhatsApp
// are caught in the browser: nothing here reaches either.
// Exit code 1 when a step fails or the page logs an error.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'altra-test-1a2b3';
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const shots = process.argv.includes('--shots');
if (shots) await mkdir(join(root, 'shots'), { recursive: true });

/** A picture of the form's last part: the fields, the message and the buttons. */
async function picture(page, name) {
  if (!shots) return;
  await page.$eval('[data-brief-status]', (element) => element.scrollIntoView({ block: 'end' }));
  await page.evaluate(() => window.scrollBy(0, 120));
  await sleep(900);
  await page.screenshot({ path: join(root, 'shots', `brief-${name}.png`) });
}

// ---------- Two builds ----------

const work = await mkdtemp(join(tmpdir(), 'altra-brief-'));
const content = JSON.parse(await readFile(join(root, 'content/site.json'), 'utf8'));

async function serve(name, leads, port) {
  const file = join(work, `${name}.json`);
  const outDir = join(work, name);
  await writeFile(file, JSON.stringify({ ...content, leads: { ...content.leads, ...leads } }));
  process.env.ALTRA_CONTENT = file; // read by vite.config.js
  await build({ root, logLevel: 'error', build: { outDir, emptyOutDir: true } });
  const server = await preview({ root, logLevel: 'error', build: { outDir }, preview: { port, strictPort: true, host: '127.0.0.1' } });
  return { server, url: `http://127.0.0.1:${port}/contact/` };
}

const off = await serve('off', { projectId: '' }, 4601);
const on = await serve('on', { projectId: PROJECT }, 4602);
delete process.env.ALTRA_CONTENT;

// ---------- The browser ----------

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
  defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
});

const problems = [];
const failures = [];
let step = 0;
const check = (label, ok, detail = '') => {
  step += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(step).padStart(2)}  ${label}${ok || !detail ? '' : `\n         ${detail}`}`);
  if (!ok) failures.push(label);
};

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const firestore = { status: 200, saved: [] };

async function open(url) {
  const page = await browser.newPage();
  page.on('console', (message) => {
    const from = message.location()?.url ?? '';
    if (message.type() === 'error' && from.startsWith('https://firestore.googleapis.com/') && /status of 500/.test(message.text())) return; // caused on purpose
    if (message.type() === 'error' || message.type() === 'warn') problems.push(`[console.${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const address = new URL(request.url());
    try {
      if (address.host === 'firestore.googleapis.com') {
        if (request.method() === 'OPTIONS') return await request.respond({ status: 204, headers: cors });
        firestore.saved.push({ path: address.pathname + address.search, fields: JSON.parse(request.postData()).fields });
        return await request.respond({ status: firestore.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: firestore.status === 200 ? '{}' : JSON.stringify({ error: { code: 500, status: 'INTERNAL', message: 'Made to fail' } }) });
      }
      if (address.hostname === '127.0.0.1' || address.protocol === 'data:') return await request.continue();
      return await request.abort();
    } catch {
      return request.abort().catch(() => {});
    }
  });

  // The mode of the site goes by the hour (content/mode.js). Name one, so that
  // the pictures and the result are the same at any time of day.
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}theme=mix`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), { timeout: 30000 });
  await sleep(1500);

  // The buttons are links that leave the page. Note whether the form let each
  // click through, then stop it, so the walk stays on the form.
  await page.evaluate(() => {
    window.__clicks = [];
    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('[data-brief-whatsapp], [data-brief-email]');
      if (!link) return;
      window.__clicks.push({ opened: !event.defaultPrevented, href: link.href });
      event.preventDefault();
    });
  });
  return page;
}

const read = (page, selector) => page.$eval(selector, (element) => element.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const fill = async (page, name, value) => {
  await page.focus(`[data-brief] [name="${name}"]`);
  await page.$eval(`[data-brief] [name="${name}"]`, (input) => input.select());
  await page.keyboard.press('Backspace');
  if (value) await page.keyboard.type(value);
};
const press = async (page, which = 'whatsapp') => {
  // Clicked from the page, not with the mouse: the button follows the pointer and a moving target can be missed.
  await page.$eval(`[data-brief-${which}]`, (link) => link.click());
  await sleep(700);
  return page.evaluate(() => window.__clicks.at(-1));
};
const message = (click) => decodeURIComponent(new URL(click.href).searchParams.get('text') ?? '');

// ---------- Inbox off ----------

{
  const page = await open(off.url);
  check('inbox off: the form has no phone field', (await page.$('[data-brief] [name="phone"]')) === null);
  check('inbox off: the note says nothing is sent to a server', /Nothing is sent to a server/.test(await read(page, '.brief__note')));
  await fill(page, 'name', 'Asha Mushi');
  const click = await press(page);
  check('inbox off: the button opens WhatsApp with nothing else asked', click.opened === true);
  check('inbox off: the message has the name and no reference', /Name: Asha Mushi/.test(message(click)) && !/Ref:/.test(message(click)), message(click));
  check('inbox off: it goes to the person line', click.href.startsWith(`https://wa.me/${content.contact.person.replace(/\D/g, '')}?`), click.href);
  check('inbox off: nothing is sent to Firestore', firestore.saved.length === 0);
  check('inbox off: the form says what happened', /WhatsApp has the message ready/.test(await read(page, '[data-brief-status]')));
  await picture(page, 'off');
  await page.close();
}

// ---------- Inbox on ----------

{
  const page = await open(on.url);
  check('inbox on: the form has a phone field', (await page.$('[data-brief] [name="phone"]')) !== null);
  check('inbox on: the note says a copy is saved', /a copy of this brief is saved/.test(await read(page, '.brief__note')));

  let click = await press(page);
  check('inbox on: without a name the button does not open WhatsApp', click.opened === false);
  check('inbox on: it asks for the name and puts the cursor there', /Add your name/.test(await read(page, '[data-brief-status]')) && (await page.evaluate(() => document.activeElement?.name)) === 'name');

  await fill(page, 'name', 'Asha Mushi');
  click = await press(page);
  check('inbox on: without a number it asks for one', click.opened === false && /Add a phone or WhatsApp number/.test(await read(page, '[data-brief-status]')));
  await picture(page, 'on-missing');
  check('inbox on: nothing has been saved yet', firestore.saved.length === 0);

  await fill(page, 'phone', '0712 345 678');
  await fill(page, 'org', 'Mushi Hardware');
  click = await press(page);
  const first = firestore.saved.at(-1);
  const ref = message(click).match(/Ref: (#ALT-\d{4})/)?.[1];
  check('inbox on: with both, WhatsApp opens', click.opened === true);
  check('inbox on: the message carries a reference', Boolean(ref), message(click));
  check('inbox on: one record is saved, in the right project', firestore.saved.length === 1 && first.path.startsWith(`/v1/projects/${PROJECT}/databases/(default)/documents/inquiries?documentId=inq-`), JSON.stringify(first?.path));
  const value = (key) => first?.fields[key]?.stringValue;
  check('inbox on: the record has what the inbox lists', value('name') === 'Asha Mushi' && value('phone') === '0712 345 678' && value('org') === 'Mushi Hardware' && value('status') === 'new' && Boolean(value('type')) && Boolean(value('createdAt')), JSON.stringify(first?.fields));
  check('inbox on: the record and the message share the reference', value('refCode') === ref, `${value('refCode')} / ${ref}`);
  check('inbox on: the record holds the message, without the reference line', value('message')?.includes('Name: Asha Mushi') && !value('message')?.includes('Ref:'), value('message'));
  check('inbox on: the form says it was saved, with the reference', (await read(page, '[data-brief-status]')).includes(`Saved in our inbox as ${ref}`), await read(page, '[data-brief-status]'));
  await picture(page, 'on-saved');

  await press(page);
  check('inbox on: pressing again does not save the same brief twice', firestore.saved.length === 1);
  await press(page, 'email');
  check('inbox on: nor does sending the same brief by email', firestore.saved.length === 1);

  await fill(page, 'note', 'We need it before January.');
  click = await press(page);
  const second = message(click).match(/Ref: (#ALT-\d{4})/)?.[1];
  check('inbox on: a changed brief is saved as a new one', firestore.saved.length === 2 && firestore.saved[1].fields.message.stringValue.includes('before January'));
  check('inbox on: and it has its own reference', Boolean(second) && firestore.saved[1].fields.refCode.stringValue === second, `${ref} then ${second}`);

  firestore.status = 500;
  await fill(page, 'note', 'We need it before February.');
  click = await press(page);
  check('inbox on: when saving fails, WhatsApp still opens', click.opened === true && firestore.saved.length === 3);
  check('inbox on: and the form says the copy was not saved', /could not be saved/.test(await read(page, '[data-brief-status]')), await read(page, '[data-brief-status]'));
  firestore.status = 200;
  await press(page);
  check('inbox on: pressing again tries the save once more', firestore.saved.length === 4 && /Saved in our inbox/.test(await read(page, '[data-brief-status]')));
  await page.close();
}

// ---------- A package and an estimate carried in the link ----------

{
  const page = await open(`${on.url}?kind=app&with=mpesa,booking&vat=1`);
  await fill(page, 'name', 'Juma');
  await fill(page, 'phone', '+255 712 345 678');
  const before = firestore.saved.length;
  await press(page);
  const record = firestore.saved.at(-1)?.fields;
  check('an estimate in the link is filed with its range and time', firestore.saved.length === before + 1 && record.type.stringValue === 'Custom Software' && / to /.test(record.budget?.stringValue ?? '') && /weeks/.test(record.timeline?.stringValue ?? ''), JSON.stringify(record));
  await page.close();
}

await browser.close();
await Promise.all([off, on].map(({ server }) => new Promise((done) => server.httpServer.close(done))));
await rm(work, { recursive: true, force: true });

if (problems.length) console.log(`\n${problems.join('\n')}`);
console.log(failures.length || problems.length ? `\n${failures.length} failed, ${problems.length} console problems` : '\nall steps passed, console clean');
process.exit(failures.length || problems.length ? 1 : 0);
