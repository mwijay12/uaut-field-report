// Makes public/og.jpg, the picture a link to the site shows when it is shared
// (1200 by 630). It is a photograph of the home page's opening, with the menu
// and the buttons taken off, so it always matches the site.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium sharp
//   npm run build && npm run preview &
//   node scripts/og.mjs [http://localhost:4173/]
//
// Run it again after the hero's words, type or colours change, and commit the file.
// The picture is taken of the mix (?theme=mix), where the home page opens dark,
// whatever the hour: left to itself the site would be light by day.

import { resolve } from 'node:path';

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');
const { default: sharp } = await import('sharp');

const address = new URL(process.argv[2] ?? 'http://localhost:4173/');
address.searchParams.set('theme', 'mix');
const url = address.href;
const file = resolve('public/og.jpg');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
  defaultViewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), { timeout: 30000 });
await sleep(3500); // the arrival animation

// A share card is read at a glance: the mark, the line, one sentence. The
// card is shorter than any screen the hero is drawn for, so its parts stand
// closer together here, or the pane under the sentence would run off the edge.
await page.addStyleTag({
  content: `
    .nav, .menu-toggle, .mode-switch, .mode-step, .meter, .hero__actions, .hero__foot, .site-header__status { display: none !important; }
    .hero { gap: 1.25rem !important; padding-top: calc(var(--header-h) + 0.75rem) !important; padding-bottom: 2.25rem !important; }
    .hero .lede { max-width: 30ch !important; }
  `,
});
await page.evaluate(() => {
  document.querySelector('.hero .lede').textContent = 'Websites, apps and business systems, built in Dar es Salaam.';
});
await sleep(400);

const shot = await page.screenshot({ type: 'png' });
await browser.close();

const { size } = await sharp(shot).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
console.log(`${file}  1200x630  ${(size / 1024).toFixed(0)} kB`);
