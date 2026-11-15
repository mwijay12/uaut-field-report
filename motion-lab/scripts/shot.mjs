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
//   --mouse              emulate a mouse: hover and a fine pointer. Headless Chrome reports
//                        neither, so what the site keeps for a mouse (magnetic buttons, the
//                        stickers that flinch) does not run without this
//   --reduced            emulate prefers-reduced-motion: reduce
//   --hour <0-23>        the hour the visitor's clock shows, to see what Auto does with it
//                        (light by day, dark at night: content/mode.js). To see one mode
//                        whatever the hour, put ?theme=light, ?theme=mix or ?theme=dark in
//                        the address instead
//   --at <list>          where to shoot (default 0), separated by commas. Each stop is one of:
//                        a fraction of the scroll height (0.5), a pixel position (1200px),
//                        or a CSS selector, which puts the top of that element at the top of
//                        the window (#process). Add or take pixels with +N or -N (#process+300).
//   --walk [share]       shoot the whole page from top to bottom instead of --at: one stop
//                        every <share> of the screen's height (default 0.85)
//   --wait <ms>          time to let things settle before each shot (default 1500)
//   --first <ms>         extra time once the page is ready, for the arrival animation (default 2500)
//   --click <selector>   click this before shooting (for example a link, to test a page change)
//   --hover <selector>   move the pointer over this before shooting
//   --eval <js>          run this in the page before shooting and print the result
//   --expect <status>    the page itself should answer with this status (use 404 for the not-found page)
//   --out <dir>          default ./shots
//   --full               also save one full-page image
//   --sheet <columns>    also tile every shot of this run into one image, <name>-sheet.png,
//                        so several stops can be looked at in one go
//   --sheet-width <px>   width of one tile on the sheet (default 480)
//
// Exit code 1 when the page logged an error, so it can gate a commit.
//
// WebGL runs on the CPU here (SwiftShader). Use it to judge layout and looks,
// not frame rate.

import { mkdir, readFile } from 'node:fs/promises';
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
let stops = option('at', '0').split(',');
// --walk, or --walk 0.6. The next word is the share only when it is a number.
const walk = flag('walk') ? Number(option('walk')) || 0.85 : 0;
const settle = Number(option('wait', 1500));
const first = Number(option('first', 2500));
const expected = Number(option('expect', 200));
const out = resolve(option('out', 'shots'));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

await mkdir(out, { recursive: true });

const browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    '--enable-unsafe-swiftshader',
    ...(flag('mouse') ? ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'] : []),
  ],
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

const hour = option('hour');
if (hour !== undefined) {
  await page.evaluateOnNewDocument((value) => {
    Date.prototype.getHours = () => value;
  }, Number(hour));
}

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

if (walk) {
  const end = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  stops = [];
  for (let y = 0; y < end; y += Math.round(height * walk)) stops.push(`${y}px`);
  stops.push(`${end}px`);
}

const taken = [];

for (const [index, stop] of stops.entries()) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  let target;
  if (/^[#.\[a-z]/i.test(stop)) {
    const [, selector, shift = '0'] = stop.match(/^(.*?)([+-]\d+)?$/);
    const top = await page.evaluate((query) => {
      const element = document.querySelector(query);
      return element ? element.getBoundingClientRect().top + window.scrollY : null;
    }, selector);
    if (top === null) {
      problems.push(`[shot] nothing matches ${selector}`);
      continue;
    }
    target = Math.min(max, Math.max(0, top + Number(shift)));
  } else {
    target = stop.endsWith('px') ? Number.parseFloat(stop) : Number(stop) * max;
  }
  if (index > 0 || target > 0) await scrollTo(Math.round(target));

  const hover = option('hover');
  if (hover) await page.hover(hover);

  await sleep(settle);
  const y = await page.evaluate(() => Math.round(window.scrollY));
  const file = `${out}/${name}-${width}x${height}-${String(index).padStart(2, '0')}.png`;
  await page.screenshot({ path: file });
  taken.push(file);
  console.log(`${file}  scrollY=${y}/${max}`);
}

if (flag('full')) {
  const file = `${out}/${name}-${width}x${height}-full.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

// A contact sheet: the shots of this run side by side in one picture.
const columns = Number(option('sheet', 0));
if (columns && taken.length) {
  const tile = Number(option('sheet-width', 480));
  const images = await Promise.all(taken.map(async (file) => `data:image/png;base64,${(await readFile(file)).toString('base64')}`));
  const sheet = await browser.newPage();
  const rows = Math.ceil(taken.length / columns);
  const tileHeight = Math.round((tile * height) / width);
  await sheet.setViewport({ width: columns * tile + (columns - 1) * 8, height: rows * tileHeight + (rows - 1) * 8, deviceScaleFactor: 1 });
  await sheet.setContent(
    `<body style="margin:0;background:#808080;display:grid;gap:8px;grid-template-columns:repeat(${columns},${tile}px)">` +
      images.map((source) => `<img src="${source}" style="display:block;width:${tile}px">`).join('') +
      '</body>',
  );
  const file = `${out}/${name}-sheet.png`;
  await sheet.screenshot({ path: file });
  await sheet.close();
  console.log(file);
}

const state = await page.evaluate(() => ({
  title: document.title,
  path: window.location.pathname,
  theme: document.documentElement.dataset.theme,
  mode: `${document.documentElement.dataset.modeChoice} → ${document.documentElement.dataset.mode}`,
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
