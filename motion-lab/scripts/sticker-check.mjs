// Checks the one rule a sticker must keep: it never lands on words. A sticker
// drifts as the page scrolls, so one picture of it proves little. This walks
// each sticker across the screen, from the moment it comes in at the bottom to
// the moment it leaves at the top, and at every stop compares it with every
// line of text on the screen.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium
//   npm run build && npm run preview &
//   node scripts/sticker-check.mjs                     every page, at seven screen sizes
//   node scripts/sticker-check.mjs --page /pricing/    one page
//   node scripts/sticker-check.mjs --width 390         one width
//   node scripts/sticker-check.mjs --width 820 --height 1180    a size that is not on the list
//   node scripts/sticker-check.mjs --theme dark        in another mode (the default is mix)
//
// The site has three modes (content/mode.js) and picks one by the hour. The
// layout is the same in all three, so one is checked, and it is named in the
// address so that the result does not depend on the time of day.
//
// Prints one line per sticker and exits with an error if one of them touches
// text, or if a page logs an error. Scribbles are not checked: a ring round a
// price is meant to touch it. The screens run three at a time, each in its own
// browser, and the whole check takes about ten minutes.

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const base = option('base', 'http://localhost:4173');
const theme = option('theme', 'mix');
const PAGES = ['/', '/work/', '/services/', '/pricing/', '/studio/', '/contact/'];
// The layout changes at 900 wide, so there is a size just above it and one just
// below, both tall: a tall screen is where a sticker drifts furthest. The last
// one is a short phone: there an opening has no height to spare, and its label
// stands on the same row as its sticker.
const touch = { deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const SCREENS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 912, height: 1368 },
  { width: 820, height: 1180, ...touch },
  { width: 390, height: 844, ...touch },
  { width: 360, height: 740, ...touch },
  { width: 375, height: 667, ...touch },
];
const pages = option('page') ? [option('page')] : PAGES;
// A width that is not on the list gets a screen of its own. Below 900 it is a touch screen.
const custom = (width, height) => (width < 900 ? { width, height, ...touch } : { width, height });
const asked = Number(option('width', 0));
const screens = asked ? [(!option('height') && SCREENS.find((screen) => screen.width === asked)) || custom(asked, Number(option('height', 900)))] : SCREENS;

const STOPS = 7; // places a sticker is looked at on its way up the screen
const SETTLE = 800; // ms: the drift follows the scroll with a delay of 0.6 s
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** One width: every page, every sticker. Its own browser, so the widths can run side by side. */
async function walk(screen) {
  const lines = [];
  let failed = 0;
  let checked = 0;
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--enable-unsafe-swiftshader'],
    executablePath: await chromium.executablePath(),
    headless: 'shell',
  });

  for (const path of pages) {
    const page = await browser.newPage();
    await page.setViewport(screen);
    const problems = [];
    page.on('console', (message) => ['error', 'warn'].includes(message.type()) && problems.push(`[console.${message.type()}] ${message.text()}`));
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));

    await page.goto(`${base}${path}?theme=${theme}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), { timeout: 30000 });
    await sleep(3000);

    // Where each sticker is on the page, and how far the page scrolls.
    const stickers = await page.evaluate(() =>
      [...document.querySelectorAll('[data-sticker]')]
        .map((sticker, index) => {
          const box = sticker.getBoundingClientRect();
          return {
            index,
            place: [...sticker.classList].find((name) => name.startsWith('sticker--') && !/--(sun|lilac|violet|night|gold)$/.test(name))?.slice(9) ?? '?',
            shown: getComputedStyle(sticker).display !== 'none',
            top: box.top + window.scrollY,
            height: box.height,
          };
        })
        .filter((sticker) => sticker.shown),
    );
    const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

    for (const sticker of stickers) {
      const from = Math.max(0, sticker.top - screen.height * 0.9);
      const to = Math.min(max, sticker.top + sticker.height * 0.5);
      let worst = null;

      for (let stop = 0; stop < STOPS; stop += 1) {
        const y = Math.round(from + ((to - from) * stop) / (STOPS - 1));
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await sleep(SETTLE);

        const hit = await page.evaluate((index) => {
          const sticker = document.querySelectorAll('[data-sticker]')[index];
          const outline = (sticker.querySelector('.doodle__back') ?? sticker.querySelector('.doodle')).getBoundingClientRect();
          // The backing is a blob, so the corners of its box are empty.
          const inset = 0.12;
          const box = {
            left: outline.left + outline.width * inset,
            right: outline.right - outline.width * inset,
            top: outline.top + outline.height * inset,
            bottom: outline.bottom - outline.height * inset,
          };
          if (box.right - box.left < 8 || box.bottom < 0 || box.top > window.innerHeight) return null;

          let found = null;
          const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.nodeValue.trim()) continue;
            const parent = node.parentElement;
            if (parent.closest('[data-sticker], .sr-only') || !parent.checkVisibility({ visibilityProperty: true })) continue;
            range.selectNodeContents(node);
            for (const line of range.getClientRects()) {
              const across = Math.min(box.right, line.right) - Math.max(box.left, line.left);
              const down = Math.min(box.bottom, line.bottom) - Math.max(box.top, line.top);
              if (across > 2 && down > 2 && (!found || across * down > found.area)) {
                found = { area: Math.round(across * down), text: node.nodeValue.trim().slice(0, 48) };
              }
            }
          }
          return found;
        }, sticker.index);

        if (hit && (!worst || hit.area > worst.area)) worst = { ...hit, y };
      }

      checked += 1;
      const where = `${String(screen.width).padStart(4)}  ${path.padEnd(11)} ${sticker.place.padEnd(15)}`;
      if (worst) {
        failed += 1;
        lines.push(`FAIL ${where} covers "${worst.text}" at scrollY ${worst.y} (${worst.area} px²)`);
      } else {
        lines.push(`ok   ${where}`);
      }
    }

    for (const problem of problems) {
      failed += 1;
      lines.push(`FAIL ${String(screen.width).padStart(4)}  ${path.padEnd(11)} ${problem}`);
    }
    await page.close();
  }

  await browser.close();
  return { lines, failed, checked };
}

const results = [];
for (let first = 0; first < screens.length; first += 3) {
  const round = await Promise.all(screens.slice(first, first + 3).map(walk));
  for (const result of round) console.log(result.lines.join('\n'));
  results.push(...round);
}

const failed = results.reduce((sum, result) => sum + result.failed, 0);
const checked = results.reduce((sum, result) => sum + result.checked, 0);

if (failed) {
  console.log(`\n${failed} failed, of ${checked} stickers. Move the sticker in src/styles/stickers.css, or give it less depth.`);
  process.exitCode = 1;
} else {
  console.log(`\nall ${checked} stickers clear of text, console clean`);
}
