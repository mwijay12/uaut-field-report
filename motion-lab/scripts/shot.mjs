// Headless screenshots, so a person or an agent can look at the result
// instead of guessing. Works on machines with no browser installed.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium
//   npm run build && npm run preview &
//   node scripts/shot.mjs http://localhost:4173/ --name home --at 0,0.25,0.5,1
//
// Options
//   --name <text>        file name prefix (default "page")
//   --viewport <WxH>     default 1440x900
//   --dpr <n>            device pixel ratio (default 1)
//   --touch              emulate a phone: touch input and a coarse pointer
//   --reduced            emulate prefers-reduced-motion: reduce
//   --at <list>          where to shoot: fractions of the scroll height (0..1) or
//                        pixel positions written as 1200px (default 0)
//   --wait <ms>          time to let things settle before each shot (default 1500)
//   --first <ms>         extra time once the page is ready, for the arrival animation (default 2500)
//   --click <selector>   click this before shooting (for example a link, to test a page change)
//   --hover <selector>   move the pointer over this before shooting
//   --eval <js>          run this in the page before shooting and print the result
//   --expect <status>    the page itself should answer with this status (use 404 for the not-found page)
//   --out <dir>          default ./shots
//   --full               also save one full-page image
//
// Exit code 1 when the page logged an error, so it can gate a commit.
//
// WebGL runs on the CPU here (SwiftShader). Use it to judge layout and looks,
// not frame rate.

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');

const args = process.argv.slice(2);
const url = args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:4173/';
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const name = option('name', 'page');
const [width, height] = option('viewport', '1440x900').split('x').map(Number);
const dpr = Number(option('dpr', 1));
const touch = flag('touch');
const stops = option('at', '0').split(',');
const settle = Number(option('wait', 1500));
const first = Number(option('first', 2500));
const expected = Number(option('expect', 200));
const out = resolve(option('out', 'shots'));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

await mkdir(out, { recursive: true });

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
  defaultViewport: { width, height, deviceScaleFactor: dpr, isMobile: touch, hasTouch: touch },
});

const page = await browser.newPage();
const problems = [];
page.on('console', (message) => {
  const type = message.type();
  // Chrome logs every 4xx as a console error. When the page is meant to be a 404, that one is expected.
  if (expected >= 400 && message.location()?.url === url && message.text().includes(`status of ${expected}`)) return;
  if (type === 'error' || type === 'warn') problems.push(`[console.${type}] ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
page.on('requestfailed', (request) => problems.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText}`));
page.on('response', (response) => {
  if (response.url() === url) {
    if (response.status() !== expected) problems.push(`[http ${response.status()}] ${response.url()} (expected ${expected})`);
  } else if (response.status() >= 400) {
    problems.push(`[http ${response.status()}] ${response.url()}`);
  }
});

if (flag('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), { timeout: 30000 });
await sleep(first);

const click = option('click');
if (click) {
  await page.click(click);
  await sleep(Number(option('after-click', 2600)));
}

const script = option('eval');
if (script) console.log('eval →', JSON.stringify(await page.evaluate(script)));

// Scroll with the wheel, in steps, so scroll-driven code runs the way it does for a person.
async function scrollTo(target) {
  await page.mouse.move(width / 2, height / 2);
  for (let i = 0; i < 400; i += 1) {
    const y = await page.evaluate(() => window.scrollY);
    const remaining = target - y;
    if (Math.abs(remaining) < 4) break;
    const step = Math.sign(remaining) * Math.min(Math.abs(remaining), height * 0.6);
    if (touch) await page.evaluate((delta) => window.scrollBy(0, delta), step);
    else await page.mouse.wheel({ deltaY: step });
    await sleep(140);
  }
}

for (const [index, stop] of stops.entries()) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const target = stop.endsWith('px') ? Number.parseFloat(stop) : Number(stop) * max;
  if (index > 0 || target > 0) await scrollTo(Math.round(target));

  const hover = option('hover');
  if (hover) await page.hover(hover);

  await sleep(settle);
  const y = await page.evaluate(() => Math.round(window.scrollY));
  const file = `${out}/${name}-${width}x${height}-${String(index).padStart(2, '0')}.png`;
  await page.screenshot({ path: file });
  console.log(`${file}  scrollY=${y}/${max}`);
}

if (flag('full')) {
  const file = `${out}/${name}-${width}x${height}-full.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

const state = await page.evaluate(() => ({
  title: document.title,
  path: window.location.pathname,
  theme: document.documentElement.dataset.theme,
  classes: document.documentElement.className,
  overflowX: document.documentElement.scrollWidth - window.innerWidth,
}));
console.log('state →', JSON.stringify(state));

await browser.close();

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.log('  ' + problem);
  process.exitCode = 1;
} else {
  console.log('console clean');
}
