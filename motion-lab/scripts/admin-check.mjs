// Walks through the admin against a stand-in for GitHub's API, so the whole
// path is exercised without touching the real repository: a refused token,
// sign in, edit, a blocked mistake, review, publish, the build report, a clash
// with someone else's publish, history, discard, sign out.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium
//   npm run build && npm run preview &
//   node scripts/admin-check.mjs [http://localhost:4173] [--shots]
//
// --shots saves a picture of each page of the admin in ./shots.
// Exit code 1 when a step fails or the page logs an error.
//
// The admin is not told about the stand-in. It calls api.github.com and
// firestore.googleapis.com as it does in production, and this script catches
// those requests in the browser and answers them itself. `vite preview` sends
// the headers in vercel.json, so the admin's Content-Security-Policy is in
// force during the walk, and a call it would block in production fails here.
// Nothing in this walk reaches the real GitHub or the real Firestore.

import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const base = (args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:4173').replace(/\/$/, '');
const shots = args.includes('--shots');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------- The stand-in for GitHub ----------

const TOKEN = 'good-token';
const REPO = 'tester/site';
const FILE = 'motion-lab/content/site.json';
const PORT = 4599;

const first = await readFile(resolve(here, '../content/site.json'), 'utf8');
const versions = []; // newest last: { commit, sha, text, message, date }
let counter = 0;
const commitTo = (text, message, author = 'tester') => {
  counter += 1;
  const version = { commit: `c${String(counter).padStart(39, '0')}`, sha: `f${String(counter).padStart(39, '0')}`, text, message, author, date: new Date().toISOString() };
  versions.push(version);
  return version;
};
commitTo(first, 'Start');
const latest = () => versions[versions.length - 1];
const asked = new Map(); // commit -> how often its status was asked for
let blind = false; // true: the token may not read build statuses
const puts = []; // every body the admin has sent

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-GitHub-Api-Version',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
};

const api = createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'OPTIONS') return send(204, {});
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: 'Bad credentials' });

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = decodeURIComponent(url.pathname);

  if (path === '/user') return send(200, { login: 'tester' });
  if (path === `/repos/${REPO}`) return send(200, { full_name: REPO, private: false, permissions: { push: true }, html_url: `https://github.com/${REPO}` });

  if (path === `/repos/${REPO}/contents/${FILE}` && req.method === 'GET') {
    const ref = url.searchParams.get('ref');
    const version = versions.find((item) => item.commit === ref) ?? latest();
    return send(200, { type: 'file', sha: version.sha, content: Buffer.from(version.text, 'utf8').toString('base64').replace(/(.{60})/g, '$1\n') });
  }

  if (path === `/repos/${REPO}/contents/${FILE}` && req.method === 'PUT') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    puts.push(body);
    if (body.sha !== latest().sha) return send(409, { message: `${FILE} does not match ${body.sha}` });
    const version = commitTo(Buffer.from(body.content, 'base64').toString('utf8'), body.message);
    return send(200, { content: { sha: version.sha }, commit: { sha: version.commit, html_url: `https://github.com/${REPO}/commit/${version.commit}` } });
  }

  if (path === `/repos/${REPO}/commits`) {
    return send(200, [...versions].reverse().map((item) => ({
      sha: item.commit,
      html_url: `https://github.com/${REPO}/commit/${item.commit}`,
      commit: { message: item.message, author: { name: item.author, date: item.date } },
    })));
  }

  const status = path.match(new RegExp(`^/repos/${REPO}/commits/(\\w+)/status$`));
  if (status) {
    if (blind) return send(403, { message: 'Resource not accessible by personal access token' });
    const times = (asked.get(status[1]) ?? 0) + 1;
    asked.set(status[1], times);
    const state = times > 1 ? 'success' : 'pending';
    return send(200, { state, statuses: [{ context: 'Vercel', state, description: state === 'success' ? 'Deployment has completed' : 'Vercel is deploying your app', target_url: 'https://vercel.com/example' }] });
  }

  return send(404, { message: 'Not Found' });
});
await new Promise((ready) => api.listen(PORT, '127.0.0.1', ready));

// ---------- The walk ----------

const browser = await puppeteer.launch({
  args: [...chromium.args],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
  defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();

// Keeps the page drawing frames. After a reload that went through the browser's
// "leave this page?" question, headless Chrome hands the next instruction to an
// idle page only when the page next wakes, which can be many seconds later. A
// person never sees this. A script does, as a step that times out.
await page.evaluateOnNewDocument(() => {
  const frame = () => window.requestAnimationFrame(frame);
  window.requestAnimationFrame(frame);
});
const problems = [];
page.on('console', (message) => {
  // Chrome logs every refused request. The ones this walk causes on purpose are not problems:
  // a bad token, a clash and a status it may not read at GitHub, a project with no database at Firestore.
  const from = message.location()?.url ?? '';
  if (message.type() === 'error' && /^https:\/\/(api\.github\.com|firestore\.googleapis\.com)\//.test(from) && /status of (401|403|404|409)/.test(message.text())) return;
  if (message.type() === 'error' || message.type() === 'warn') problems.push(`[console.${message.type()}] ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
page.on('dialog', (dialog) => dialog.accept()); // the "throw away these changes?" question

// ---------- The switchboard ----------
// api.github.com goes to the stand-in above. Firestore gets the answer the
// walk has lined up. Anything else that is not this machine is refused.

const firestore = { answer: { status: 200, body: {} }, bodies: [] };
const strayed = [];

await page.setRequestInterception(true);
page.on('request', async (request) => {
  const url = new URL(request.url());
  try {
    if (url.host === 'api.github.com') {
      const reply = await fetch(`http://127.0.0.1:${PORT}${url.pathname}${url.search}`, {
        method: request.method(),
        headers: request.headers(),
        body: request.postData(),
      });
      return await request.respond({ status: reply.status, headers: Object.fromEntries(reply.headers), body: await reply.text() });
    }
    if (url.host === 'firestore.googleapis.com') {
      if (request.method() === 'OPTIONS') return await request.respond({ status: 204, headers: cors });
      firestore.bodies.push({ path: url.pathname + url.search, body: JSON.parse(request.postData()) });
      return await request.respond({ status: firestore.answer.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(firestore.answer.body) });
    }
    if (['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol === 'data:') return await request.continue();
    strayed.push(request.url());
    return await request.abort();
  } catch (error) {
    problems.push(`[switchboard] ${request.method()} ${request.url()}: ${error.message}`);
    return request.abort().catch(() => {});
  }
});

let step = 0;
const failures = [];
const check = (label, ok, detail = '') => {
  step += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(step).padStart(2)}  ${label}${ok || !detail ? '' : `\n         ${detail}`}`);
  if (!ok) failures.push(label);
};
const text = (selector) => page.$eval(selector, (element) => element.textContent.trim()).catch(() => '');
const until = (fn, arg, timeout = 15000) => page.waitForFunction(fn, { timeout }, arg).then(() => true, () => false);
const tab = async (name) => {
  await page.click(`.rail__link[data-tab="${name}"]`);
  await sleep(150);
};
const type = async (selector, value) => {
  await page.focus(selector);
  await page.$eval(selector, (input) => input.select());
  await page.keyboard.press('Backspace');
  if (value) await page.keyboard.type(value);
};
const picture = async (name) => {
  if (!shots) return;
  await mkdir(resolve('shots'), { recursive: true });
  await page.screenshot({ path: resolve('shots', `admin-${name}.png`) });
};
const stored = () => JSON.parse(latest().text);

const opened = await page.goto(`${base}/admin/`, { waitUntil: 'networkidle0' });
const policy = opened.headers()['content-security-policy'] ?? '';
check('the admin is served with its content security policy', /connect-src https:\/\/api\.github\.com https:\/\/firestore\.googleapis\.com/.test(policy) && /script-src 'self'/.test(policy), policy || 'no policy header: is this `vite preview`?');
check('the sign-in screen opens', (await text('.signin__title')) === 'Manage the site');
await picture('signin');

await page.type('#token', 'wrong-token');
await page.click('.signin__more summary');
await type('#repo', REPO);
await page.click('.signin__form .btn');
check('a refused token is explained', await until(() => /did not accept the token/.test(document.querySelector('.signin__status')?.textContent ?? '')), await text('.signin__status'));

await type('#token', TOKEN);
await page.click('.signin__form .btn');
check('a good token signs in', await until(() => document.querySelector('.main__title')?.textContent === 'Overview'));
check('nothing is waiting at first', await page.$eval('.bar', (bar) => bar.hidden));
check('the last publish is shown', await until(() => /Last publish .*Start/.test(document.querySelector('[data-last]')?.textContent ?? '')), await text('[data-last]'));
await picture('overview');

// A price, a mistake, and the mistake put right.
await tab('prices');
await type('#f-prices-starter', '400,000');
check('one change shows in the bar', (await text('.bar__count')) === '1 change not published', await text('.bar__count'));
await type('#f-prices-starter', '');
check('an empty price blocks publishing', /1 problem to fix first/.test(await text('.bar__count')) && (await page.$eval('.bar .btn:not(.btn--quiet)', (button) => button.disabled)), await text('.bar__count'));
await type('#f-prices-starter', 'abc');
check('letters are not a price', /digits only/.test(await text('#f-prices-starter-note')), await text('#f-prices-starter-note'));
await type('#f-prices-starter', '400000');
await page.keyboard.press('Tab');
check('a price is tidied on leaving the field', (await page.$eval('#f-prices-starter', (input) => input.value)) === '400,000');
check('the estimator follows the new price', /TSh 400K to TSh 472K/.test(await text('.sample')), (await text('.sample')).slice(0, 80));
await picture('prices');

// A phone number written the local way.
await tab('lines');
await type('#f-contact-person', '0712 345 678');
await page.keyboard.press('Tab');
check('a local number becomes +255', (await page.$eval('#f-contact-person', (input) => input.value)) === '+255 712 345 678');
check('the WhatsApp link is shown', /wa\.me\/255712345678/.test(await text('[data-link="person"]')));
await picture('lines');

await tab('backgrounds');
await page.click('input[name="backgrounds.home-hero"][value="plain"]');
check('a background can be changed', (await text('.bar__count')) === '3 changes not published', await text('.bar__count'));
await picture('backgrounds');

await tab('search');
await type('#f-seo-pages-home-title', 'x');
await type('#f-seo-pages-home-title', '');
check('an empty title is refused', /Home needs a title/.test(await text('#f-seo-pages-home-title-note')));
await type('#f-seo-pages-home-title', 'Altraware Technology | Software studio in Dar es Salaam');
check('a quoted price is filled in the preview', /from TSh 400,000/.test(await page.$$eval('.snippet__text', (items) => items.map((item) => item.textContent).join(' | '))));
await picture('search');

await tab('leads');
check('the test button waits for a project ID', await page.$eval('.row .btn', (button) => button.disabled));
await type('#f-leads-projectId', 'Not A Project');
check('a wrong project ID is refused', /6 to 30 lower-case/.test(await text('#f-leads-projectId-note')), await text('#f-leads-projectId-note'));

// The test record, before anything is published.
const sendTest = async () => {
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Send a test record').click());
  await until(() => !/Sending/.test(document.querySelector('.field__note[role="status"]')?.textContent ?? 'Sending'));
  return text('.field__note[role="status"]');
};
await type('#f-leads-projectId', 'altra-test-1a2b3');
firestore.answer = { status: 404, body: { error: { code: 404, status: 'NOT_FOUND', message: 'The database (default) does not exist.' } } };
check('a project ID with no database says so', /no Firestore database under that project ID/.test(await sendTest()), await text('.field__note[role="status"]'));
firestore.answer = { status: 200, body: {} };
const testSaved = await sendTest();
const lead = firestore.bodies.at(-1);
check('a test record is saved and says where to find it', /^Saved as #ALT-\d{4}\./.test(testSaved), testSaved);
check(
  'the record is one the inbox of the main site can list',
  /^\/v1\/projects\/altra-test-1a2b3\/databases\/\(default\)\/documents\/inquiries\?documentId=inq-\d+$/.test(lead?.path ?? '') &&
    ['id', 'refCode', 'name', 'phone', 'type', 'message', 'status', 'createdAt'].every((key) => typeof lead.body.fields[key]?.stringValue === 'string' && lead.body.fields[key].stringValue) &&
    lead.body.fields.status.stringValue === 'new',
  JSON.stringify(lead),
);
await picture('leads');
await type('#f-leads-projectId', '');

// Review and publish.
await page.click('.bar .btn:not(.btn--quiet)');
await sleep(200);
check('the review lists the three changes', (await page.$$eval('.dialog .changes__item', (items) => items.length)) === 3);
check('the review shows the number the tidy way', /\+255 712 345 678/.test(await text('.dialog .changes')), await text('.dialog .changes'));
await picture('review');
await page.click('.dialog .btn[type="submit"]');
check('publishing reports back', await until(() => /Published/.test(document.querySelector('.banner')?.textContent ?? '')), await text('.banner'));

const sent = puts[puts.length - 1];
const now = stored();
check('the commit holds the new price', now.prices.starter === 400000);
check('the commit holds the new number', now.contact.person === '+255 712 345 678');
check('the commit holds the new background', now.backgrounds['home-hero'] === 'plain');
check('everything else is untouched', now.prices.kuza === 249000 && now.contact.chatbot === '+255 790 942 616' && now.seo.index === false);
check('the file is written the tidy way', latest().text === `${JSON.stringify(now, null, 2)}\n`);
check('the commit goes to the chosen branch with a message', sent.branch === 'main' && /^Admin: /.test(sent.message), JSON.stringify({ branch: sent.branch, message: sent.message }));
check('the bar is gone after publishing', await page.$eval('.bar', (bar) => bar.hidden));
check('the build is followed until it is live', await until(() => /^Live\./.test(document.querySelector('.banner')?.textContent ?? ''), null, 20000), await text('.banner'));
await picture('published');

// The message, far down a long page.
await tab('backgrounds');
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await sleep(250);
check(
  'the message stays in view far down a long page',
  await page.evaluate(() => {
    const box = document.querySelector('.banner').getBoundingClientRect();
    return window.scrollY > 600 && box.top >= 0 && box.bottom <= window.innerHeight;
  }),
  await page.evaluate(() => `scrolled ${Math.round(window.scrollY)}, banner top ${Math.round(document.querySelector('.banner').getBoundingClientRect().top)}`),
);
await picture('published-scrolled');
await page.click('.banner__close');
check('the message can be dismissed', await page.$eval('.banner', (banner) => banner.hidden));
await page.evaluate(() => window.scrollTo(0, 0));

// Someone else publishes while a draft is open here.
const theirs = stored();
theirs.prices.kuza = 300000;
commitTo(`${JSON.stringify(theirs, null, 2)}\n`, 'Someone else: Growth Support', 'colleague');
await tab('prices');
await type('#f-prices-tunza', '120000');
await page.click('.bar .btn:not(.btn--quiet)');
await sleep(200);
await page.click('.dialog .btn[type="submit"]');
check('a clash is explained, not overwritten', await until(() => /changed on GitHub while you were editing/.test(document.querySelector('.dialog [role="status"]')?.textContent ?? '')), await text('.dialog [role="status"]'));
check('their change is not in the list of mine', (await page.$$eval('.changes__item', (items) => items.length)) >= 1 && stored().prices.tunza === 99000);
await page.click('.dialog .btn--quiet');
await sleep(150);
check('their price is now on screen', (await page.$eval('#f-prices-kuza', (input) => input.value)) === '300,000');
await page.click('.bar .btn:not(.btn--quiet)');
await sleep(200);
check('only my change is left to publish', (await page.$$eval('.dialog .changes__item', (items) => items.length)) === 1);
blind = true; // this time the token may publish but not watch the build
await page.click('.dialog .btn[type="submit"]');
await until(() => /Published/.test(document.querySelector('.banner')?.textContent ?? ''));
check('both changes survive the clash', stored().prices.kuza === 300000 && stored().prices.tunza === 120000, JSON.stringify(stored().prices));
check('a token that cannot watch the build is told so, once', await until(() => /cannot see the build/.test(document.querySelector('.banner')?.textContent ?? '')), await text('.banner'));
blind = false;

// History.
await tab('history');
check('history lists every publish', await until(() => document.querySelectorAll('.history__item').length === 4), String(await page.$$eval('.history__item', (items) => items.length)));
await picture('history');
await page.click('.history__item:last-child .btn');
check('an old version loads as a draft', await until(() => /Loaded the version/.test(document.querySelector('.banner')?.textContent ?? '')) && /changes not published/.test(await text('.bar__count')), await text('.bar__count'));
check('loading it publishes nothing', versions.length === 4);

// A reload keeps the draft, then it is thrown away.
await page.reload({ waitUntil: 'networkidle0' });
check('a reload keeps the session and the draft', await until(() => document.querySelector('.bar') && !document.querySelector('.bar').hidden), await text('.bar__count'));
await page.click('.bar .btn--quiet');
await sleep(200);
check('discard returns to what is live', await page.$eval('.bar', (bar) => bar.hidden));

// Phone layout.
if (shots) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await tab('backgrounds');
  await picture('m-backgrounds');
  await tab('overview');
  await picture('m-overview');
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
}

await page.click('.rail__foot .btn');
check('sign out returns to the sign-in screen', await until(() => document.querySelector('.signin__title')));
check('the token is gone from the tab', await page.evaluate(() => !Object.values({ ...window.sessionStorage }).some((value) => value.includes('good-token'))));
check('the token was never kept on the device', await page.evaluate(() => !Object.values({ ...window.localStorage }).some((value) => value.includes('good-token'))));

check('nothing was sent anywhere but GitHub and Firestore', strayed.length === 0, strayed.join(' '));

await browser.close();
api.close();

if (problems.length) console.log(`\n${problems.join('\n')}`);
console.log(failures.length || problems.length ? `\n${failures.length} failed, ${problems.length} console problems` : '\nall steps passed, console clean');
process.exit(failures.length || problems.length ? 1 : 0);
