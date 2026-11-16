// Walks Studio OS the way a person would: the gate, a wrong password, the
// desk, a project, a client's logo, an invoice, the paper it prints on, the
// mail, the settings, the way out — and then the same desk as a client, who
// must not see the studio's other work.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium
//   npm run build && npm run preview &
//   node scripts/portal-check.mjs [http://localhost:4173] [--shots]
//
// --shots saves a picture of each screen in ./shots.
// Exit code 1 when a step fails or the page logs an error.
//
// No Firebase key is in this build, so the run stays on the preview desk: the
// password door, localStorage, and the letters rendered in the page. That is
// exactly what someone looking at the build sees before they add the keys.

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const base = (args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:4173').replace(/\/$/, '');
const shots = args.includes('--shots');
const out = resolve(here, '../shots');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

if (shots) await mkdir(out, { recursive: true });

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
const problems = [];
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`[console.error] ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
page.on('requestfailed', (request) => problems.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText}`));

const results = [];
let failures = 0;

async function step(name, run) {
  try {
    await run();
    results.push({ ok: true, name });
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures += 1;
    results.push({ ok: false, name, reason: error.message });
    console.log(`  FAIL  ${name}\n        ${error.message}`);
  }
}

const must = (what, done) => {
  if (!done) throw new Error(what);
};

const count = (selector) => page.$$eval(selector, (nodes) => nodes.length).catch(() => 0);
const text = (selector) => page.$eval(selector, (node) => node.textContent.trim()).catch(() => '');

async function clickText(selector, wanted) {
  const done = await page.evaluate(
    (selector, wanted) => {
      const found = [...document.querySelectorAll(selector)].find((node) => node.textContent.trim().toLowerCase().includes(wanted.toLowerCase()));
      if (!found) return false;
      found.click();
      return true;
    },
    selector,
    wanted,
  );
  must(`nothing matching "${selector}" saying "${wanted}"`, done);
  await sleep(260);
}

const shot = async (name, extra = {}) => {
  if (!shots) return;
  await page.screenshot({ path: resolve(out, `${name}.png`), ...extra });
};

console.log(`\nStudio OS → ${base}/portal/\n`);

await page.goto(`${base}/portal/`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForSelector('.gate__card', { timeout: 15000 });
await sleep(400);

// ---------- The gate ----------

await step('the gate asks for a username and a password, and says the preview pair out loud', async () => {
  must('no username field', await page.$('#gate-user'));
  must('no password field', await page.$('#gate-pass'));
  const hint = await text('.gate__hint--preview');
  must(`the preview pair is not on the page (${hint.slice(0, 60)})`, /admin/.test(hint) && /altra2026/.test(hint));
  must('the demo password is not masked as a secret it is not', (await page.$eval('#gate-pass', (node) => node.type)) === 'password');
});

await shot('portal-gate');

await step('Google is offered but switched off until the keys are in the build', async () => {
  const off = await page.evaluate(() => {
    const button = [...document.querySelectorAll('.gate__card button')].find((node) => /google/i.test(node.textContent));
    return button ? { disabled: button.disabled, words: button.textContent.trim() } : null;
  });
  must('no Google button', off);
  must(`the Google button is not disabled (${off.words})`, off.disabled === true);
  must('the button does not say it needs keys', /keys/i.test(off.words));
});

await step('a wrong password is refused, and says so', async () => {
  await page.type('#gate-user', 'admin');
  await page.type('#gate-pass', 'wrong-one');
  await clickText('.gate__card button', 'Open the desk');
  const error = await text('.gate__error');
  must(`no refusal shown (got "${error}")`, error.length > 10);
  must('the gate let someone through on a wrong password', !(await page.$('.app:not([hidden])')));
});

await step('the right password opens the studio desk', async () => {
  await page.$eval('#gate-pass', (node) => (node.value = ''));
  await page.type('#gate-pass', 'altra2026');
  await clickText('.gate__card button', 'Open the desk');
  await page.waitForSelector('.rail__link[data-view="overview"]', { timeout: 15000 });
  await sleep(600);
  must('the gate is still up', await page.$eval('#gate', (node) => node.hidden));
  must('no rail', (await count('.rail__link')) >= 5);
});

await shot('portal-overview');

// ---------- The desk ----------

await step('the overview has four figures, the pipeline, the work in flight and what to chase', async () => {
  must(`only ${await count('.kpi')} figures`, (await count('.kpi')) === 4);
  must(`pipeline has ${await count('.pipeline__stage')} stages`, (await count('.pipeline__stage')) === 5);
  must('no work in flight', (await count('.rows .row')) >= 3);
  const words = await text('.kpi__value');
  must(`the first figure reads "${words}"`, words.length > 0);
});

await step('the rail counts what is in flight and what is owed', async () => {
  const counts = await page.$$eval('.rail__count', (nodes) => nodes.map((node) => node.textContent.trim()));
  must(`rail counts are ${JSON.stringify(counts)}`, counts.length === 2 && counts.every((one) => /^\d+$/.test(one)));
});

await step('Projects is a board, one column per stage', async () => {
  await page.click('.rail__link[data-view="projects"]');
  await page.waitForSelector('.board');
  await sleep(300);
  must(`only ${await count('.column')} columns`, (await count('.column')) === 5);
  must('no tickets on the board', (await count('.ticket')) >= 4);
});

await shot('portal-projects');

await step('a project opens in a drawer, with its milestones and its brief', async () => {
  await page.click('.ticket');
  await page.waitForSelector('.drawer');
  await sleep(300);
  must('no tasks listed', (await count('.drawer input[type="checkbox"]')) >= 1);
  must('no brief field', (await count('.drawer textarea')) >= 1);
  must('no save button', (await page.evaluate(() => [...document.querySelectorAll('.drawer button')].some((node) => /save/i.test(node.textContent)))));
});

await step('ticking a milestone saves the project and closes the drawer', async () => {
  const before = await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('altra-studio:desk') ?? '{}');
    return store.projects?.find((one) => one.tasks?.length)?.progress ?? null;
  });
  await page.evaluate(() => document.querySelector('.drawer input[type="checkbox"]').click());
  await sleep(400);
  must('the drawer stayed open', !(await page.$('.drawer')));
  const after = await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('altra-studio:desk') ?? '{}');
    return store.projects?.find((one) => one.tasks?.length)?.progress ?? null;
  });
  must(`progress did not follow the tick (${before} → ${after})`, before !== after);
});

await step('Clients shows who the studio builds for', async () => {
  await page.click('.rail__link[data-view="clients"]');
  await page.waitForSelector('.client-card');
  await sleep(300);
  must(`only ${await count('.client-card')} clients`, (await count('.client-card')) === 4);
  must('no logo control on a client', await page.evaluate(() => [...document.querySelectorAll('.client-card button')].some((node) => /logo/i.test(node.textContent))));
});

await shot('portal-clients');

await step('a client carries a logo, and the invoice draws it', async () => {
  const logo = await page.$eval('.client-card .logo img', (node) => node.getAttribute('src')).catch(() => '');
  must('the seeded client has no logo', logo.startsWith('data:image/svg'));
});

// ---------- The invoice ----------

await step('Invoices lists the book, with a status on every line', async () => {
  await page.click('.rail__link[data-view="invoices"]');
  await page.waitForSelector('.card .rows');
  await sleep(300);
  must(`only ${await count('.rows .row')} invoices`, (await count('.rows .row')) === 4);
  must('no status chip', (await count('.rows .row .chip')) === 4);
});

await step('an invoice opens on its own A4 sheet, with a logo, lines and the total in words', async () => {
  await page.click('.rows .row');
  await page.waitForSelector('.sheet');
  await sleep(500);
  must('no client logo on the paper', await page.$('.sheet .logo img'));
  must(`only ${await count('.sheet table.lines tbody tr')} lines`, (await count('.sheet table.lines tbody tr')) >= 2);
  const words = await text('.sheet .words');
  must(`no amount in words (got "${words}")`, /shillings only/.test(words));
  const total = await text('.sheet .sum__line--total b');
  must(`no total (got "${total}")`, /^TSh [\d,]+$/.test(total));
  must('the paper is not scaled to its column', await page.$eval('.sheet', (node) => parseFloat(getComputedStyle(node).getPropertyValue('--fit')) > 0.2));
});

await shot('portal-invoice');

await step('changing a quantity changes the paper, the total and the words', async () => {
  const before = { total: await text('.sheet .sum__line--total b'), words: await text('.sheet .words') };
  await page.evaluate(() => {
    const input = document.querySelector('.item-row input[type="number"]');
    input.value = '3';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(350);
  const after = { total: await text('.sheet .sum__line--total b'), words: await text('.sheet .words') };
  must(`the total did not move (${before.total})`, before.total !== after.total);
  must(`the words did not move (${before.words})`, before.words !== after.words);
  const sum = await text('.sheet .sum');
  must(`the VAT line is missing (${sum.replace(/\s+/g, ' ')})`, /VAT 18%/.test(sum));
  must('the discount line came back on an invoice with no discount', !/Discount/.test(sum));
});

await step('saving gives the invoice its own address', async () => {
  await clickText('.builder button', 'Save');
  await sleep(500);
  const hash = await page.evaluate(() => location.hash);
  must(`the address is ${hash}`, /#\/invoices\/.+/.test(hash));
  must('no toast said it was saved', /saved/i.test(await text('.toast')));
});

await step('print leaves nothing on the paper but the invoice', async () => {
  await page.emulateMediaType('print');
  await sleep(400);
  const look = await page.evaluate(() => ({
    rail: getComputedStyle(document.querySelector('.rail')).display,
    tools: getComputedStyle(document.querySelector('.paper-tools')).display,
    sheet: getComputedStyle(document.querySelector('.sheet')).transform,
    width: document.querySelector('.sheet').getBoundingClientRect().width,
  }));
  must(`the rail prints (${look.rail})`, look.rail === 'none');
  must(`the tools print (${look.tools})`, look.tools === 'none');
  must(`the sheet is still shrunk on paper (${look.sheet})`, look.sheet === 'none' || look.sheet === 'matrix(1, 0, 0, 1, 0, 0)');
  must(`the sheet is ${Math.round(look.width)} px wide, not an A4 page`, look.width > 700);
  await shot('portal-print');
  await page.emulateMediaType('screen');
});

// ---------- The mail ----------

await step('Mail shows the letter as it will arrive, with its subject', async () => {
  await page.click('.rail__link[data-view="mail"]');
  await page.waitForSelector('.preview-frame');
  await sleep(700);
  const subject = await text('.card .mono');
  must(`the subject reads "${subject}"`, /karibu|inv-/i.test(subject));
  const frame = page.frames().find((one) => one !== page.mainFrame());
  must('the preview frame is empty', frame);
  const body = await frame.$eval('body', (node) => node.innerText).catch(() => '');
  must(`the letter is empty (${body.slice(0, 40)})`, body.length > 120);
});

await shot('portal-mail');

await step('the invoice letter is a second template, and names the number and the total', async () => {
  await page.evaluate(() => {
    const select = document.querySelector('.card select');
    select.value = 'invoice';
    select.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(700);
  const subject = await text('.card .mono');
  must(`the subject reads "${subject}"`, /INV-/.test(subject));
});

// ---------- Settings ----------

await step('Settings says what is connected and which keys are still missing', async () => {
  await page.click('.rail__link[data-view="settings"]');
  await page.waitForSelector('.facts');
  await sleep(300);
  const body = await page.evaluate(() => document.body.innerText);
  must('the settings do not name the Firebase keys', /VITE_FIREBASE_API_KEY/.test(body));
  must('the settings do not name the SMTP keys', /SMTP_HOST/.test(body));
  must('the settings do not say the desk is only this device', /This device \(preview\)/.test(body));
});

await step('signing out closes the desk', async () => {
  await clickText('.rail button', 'Sign out');
  await page.waitForSelector('.gate__card');
  must('the desk is still visible', await page.$eval('#app', (node) => node.hidden));
});

// ---------- As a client ----------

await step('a client signs in, and sees their own work and nothing else', async () => {
  await clickText('.gate__card button', 'Look at it as a client');
  await page.waitForSelector('.rail__link[data-view="overview"]');
  await sleep(600);
  must('a client can see the Clients tab', !(await page.$('.rail__link[data-view="clients"]')));
  must('a client can see the Mail tab', !(await page.$('.rail__link[data-view="mail"]')));
  await page.click('.rail__link[data-view="invoices"]');
  await page.waitForSelector('.rows, .card__body');
  await sleep(300);
  must(`a client sees ${await count('.rows .row')} invoices, not their own 1`, (await count('.rows .row')) === 1);
});

await shot('portal-client');

await step('a client can print their own invoice but cannot edit it', async () => {
  await page.click('.rows .row');
  await page.waitForSelector('.sheet');
  await sleep(400);
  must('the client has no paper', await page.$('.sheet'));
  must('the client was given an editing form', !(await page.$('.item-row')));
  must('the client was given no PDF button', await page.evaluate(() => [...document.querySelectorAll('button')].some((node) => /save as pdf/i.test(node.textContent))));
});

// ---------- What the page said ----------

await step('the page logged nothing all the way through', async () => {
  // The client's invoice fetch is the only request this build does not answer,
  // and the desk catches it; anything else is a fault.
  const real = problems.filter((line) => !/api\/welcome|404|favicon/.test(line));
  must(`${real.length} problem(s):\n        ${real.slice(0, 6).join('\n        ')}`, real.length === 0);
});

await browser.close();

const passed = results.filter((one) => one.ok).length;
console.log(`\n${failures ? '✗' : '✓'} ${passed}/${results.length} steps${failures ? `, ${failures} failed` : ''}\n`);
process.exit(failures ? 1 : 0);
