// Checks the three modes of the site (dark, mix, light) and the switch between
// them: what a visitor gets at each hour of the day, that a choice is kept and
// "Auto" lets it go again, that a page change keeps the mode, and that the
// controls on a wide screen and on a phone do the same thing.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium
//   npm run build && npm run preview &
//   node scripts/theme-check.mjs [--base http://localhost:4173]
//
// It checks behaviour, not looks: for those, take pictures with
// scripts/shot.mjs and ?theme=dark, ?theme=mix or ?theme=light in the address.
// Prints one line per step. Exit code 1 when a step fails or a page logs an error.

import { MODE_KEY, THEME_COLORS, pickMode } from '../content/mode.js';

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');

const args = process.argv.slice(2);
const base = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173').replace(/\/$/, '');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const WIDE = { width: 1440, height: 900, deviceScaleFactor: 1 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const problems = [];
const failures = [];
let step = 0;
const check = (label, ok, detail = '') => {
  step += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(step).padStart(2)}  ${label}${ok || !detail ? '' : `\n         ${detail}`}`);
  if (!ok) failures.push(label);
};

/**
 * A visitor: their own storage, their own clock. Each one gets a browser of
 * their own, so that nothing one of them keeps is there for the next.
 * @param {{ hour: number, stored?: string, screen?: object }} who
 */
async function visitor({ hour, stored, screen = WIDE }) {
  const context = await puppeteer.launch({
    args: [...chromium.args, '--enable-unsafe-swiftshader'],
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    defaultViewport: screen,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warn') problems.push(`[console.${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
  await page.evaluateOnNewDocument(
    (value, key, kept) => {
      Date.prototype.getHours = () => value;
      // Only on the first page of the visit: after that the storage is the visitor's own.
      if (kept && !sessionStorage.getItem('check:seeded')) {
        sessionStorage.setItem('check:seeded', '1');
        localStorage.setItem(key, kept);
      }
    },
    hour,
    MODE_KEY,
    stored ?? '',
  );
  return { context, page };
}

async function go(page, path) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), { timeout: 30000 });
  await sleep(600);
}

/** What the page shows now. */
const stateOf = (page) =>
  page.evaluate((key) => {
    const root = document.documentElement;
    let stored = null;
    try {
      stored = localStorage.getItem(key);
    } catch {
      // nothing kept
    }
    return {
      mode: root.dataset.mode,
      choice: root.dataset.modeChoice,
      theme: root.dataset.theme,
      colour: document.querySelector('meta[name="theme-color"]').content,
      stored,
      said: document.querySelector('[data-announcer]').textContent,
      checked: [...document.querySelectorAll('[data-mode-switch] input:checked')].map((input) => input.value).join(','),
      step: document.querySelector('[data-mode-step]').getAttribute('aria-label'),
    };
  }, MODE_KEY);

const is = (state, wanted) => Object.entries(wanted).every(([key, value]) => state[key] === value);
const tell = (state) => JSON.stringify(state);

/** Scroll so that this section is the one being read. */
async function read(page, selector) {
  await page.evaluate((query) => {
    const section = document.querySelector(query);
    window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY + 40);
  }, selector);
  await sleep(1200);
}

// ---------- The rule itself ----------

{
  const hours = Array.from({ length: 24 }, (_, hour) => pickMode(null, '', hour).mode);
  const light = hours.filter((mode) => mode === 'light').length;
  const dark = hours.filter((mode) => mode === 'dark').length;
  const mix = hours.filter((mode) => mode === 'mix').length;
  check('auto: every hour of the day has a mode, and all three are used', light + dark + mix === 24 && light > 0 && dark > 0 && mix > 0, hours.join(' '));
  check('auto: noon is light and midnight is dark', hours[12] === 'light' && hours[0] === 'dark', hours.join(' '));
  check('a kept choice wins over the clock', pickMode('dark', '', 12).mode === 'dark' && pickMode('light', '', 0).mode === 'light' && pickMode('mix', '', 12).mode === 'mix');
  check('?theme= in the address wins over a kept choice', is(pickMode('dark', '?theme=light', 0), { choice: 'light', mode: 'light' }) && is(pickMode('dark', '?a=1&theme=auto', 12), { choice: 'auto', mode: 'light' }));
  check('anything else that was kept is ignored', is(pickMode('purple', '?theme=purple', 12), { choice: 'auto', mode: 'light' }));
}

// ---------- First paint, by the hour ----------
// The home page opens on a section written for the dark theme, the pricing page on one for the light theme.

for (const hour of [0, 12]) {
  const wanted = pickMode(null, '', hour).mode;
  const theme = wanted === 'light' ? 'day' : 'night';
  const { context, page } = await visitor({ hour });
  await go(page, '/');
  let state = await stateOf(page);
  check(`${String(hour).padStart(2, '0')}:00, nothing kept: the home page is ${wanted}`, is(state, { mode: wanted, choice: 'auto', theme, colour: THEME_COLORS[theme], stored: null, checked: 'auto,auto' }), tell(state));
  await go(page, '/pricing/');
  state = await stateOf(page);
  check(`${String(hour).padStart(2, '0')}:00, nothing kept: so is the pricing page`, is(state, { mode: wanted, theme, colour: THEME_COLORS[theme] }), tell(state));
  await context.close();
}

{
  // An hour at which auto gives the mix: each page then opens in its own theme.
  const hour = Array.from({ length: 24 }, (_, at) => at).find((at) => pickMode(null, '', at).mode === 'mix');
  const { context, page } = await visitor({ hour });
  await go(page, '/');
  const home = await stateOf(page);
  await go(page, '/pricing/');
  const pricing = await stateOf(page);
  check(`${String(hour).padStart(2, '0')}:00, nothing kept: the mix, each page in its own theme`, is(home, { mode: 'mix', choice: 'auto', theme: 'night', colour: THEME_COLORS.night }) && is(pricing, { mode: 'mix', theme: 'day', colour: THEME_COLORS.day }), `${tell(home)}\n         ${tell(pricing)}`);
  await context.close();
}

// ---------- The mode holds all the way down the page ----------

for (const [mode, theme] of [
  ['dark', 'night'],
  ['light', 'day'],
]) {
  const { context, page } = await visitor({ hour: mode === 'dark' ? 12 : 0, stored: mode });
  await go(page, '/');
  const top = await stateOf(page);
  await read(page, '#services'); // written for the light theme
  const services = await stateOf(page);
  await read(page, '[data-stage="home-cta"]'); // written for the dark theme
  const closing = await stateOf(page);
  check(`${mode}, kept: every section of the home page is shown by ${theme}`, [top, services, closing].every((state) => is(state, { mode, choice: mode, theme, colour: THEME_COLORS[theme] })), [top, services, closing].map(tell).join('\n         '));
  await context.close();
}

{
  const { context, page } = await visitor({ hour: 12, stored: 'mix' });
  await go(page, '/');
  const top = await stateOf(page);
  await read(page, '#services');
  const services = await stateOf(page);
  await read(page, '[data-stage="home-cta"]');
  const closing = await stateOf(page);
  check('mix, kept: the theme follows the section being read', top.theme === 'night' && services.theme === 'day' && closing.theme === 'night' && [top, services, closing].every((state) => state.mode === 'mix'), [top, services, closing].map(tell).join('\n         '));
  await context.close();
}

// ---------- The switch in the header ----------

{
  const { context, page } = await visitor({ hour: 12 });
  await go(page, '/');
  const pick = async (value) => {
    await page.click(`.site-header [data-mode-switch] input[value="${value}"] + *`);
    await sleep(900);
    return stateOf(page);
  };

  let state = await pick('dark');
  check('header: choosing Dark at noon turns the page dark, at once', is(state, { mode: 'dark', choice: 'dark', theme: 'night', colour: THEME_COLORS.night }), tell(state));
  check('header: the choice is kept, said aloud, and shown in both switches', is(state, { stored: 'dark', said: 'Theme: Dark', checked: 'dark,dark' }), tell(state));

  await go(page, '/pricing/');
  state = await stateOf(page);
  check('header: after a reload, on another page, it is still dark', is(state, { mode: 'dark', choice: 'dark', theme: 'night', stored: 'dark' }), tell(state));

  // A page change without a reload (Barba).
  await page.click('.nav a[href="/studio/"]');
  await page.waitForFunction(() => document.documentElement.dataset.page === 'studio', { timeout: 20000 });
  await sleep(2600);
  state = await stateOf(page);
  check('header: a page change keeps the mode', is(state, { mode: 'dark', theme: 'night', colour: THEME_COLORS.night }), tell(state));

  state = await pick('mix');
  check('header: choosing Mix gives each section its own theme again', is(state, { mode: 'mix', choice: 'mix', theme: 'night', stored: 'mix' }), tell(state));

  state = await pick('auto');
  check('header: choosing Auto lets the choice go and follows the clock', is(state, { mode: 'light', choice: 'auto', theme: 'day', stored: null }) && /Auto/.test(state.said), tell(state));

  // The arrow keys move between the choices, as in any group of radio buttons.
  await page.focus('.site-header [data-mode-switch] input[value="auto"]');
  await page.keyboard.press('ArrowRight');
  await sleep(700);
  state = await stateOf(page);
  check('header: the right arrow key moves to the next choice', is(state, { choice: 'light', stored: 'light' }), tell(state));
  await context.close();
}

// ---------- ?theme= in the address ----------

{
  const { context, page } = await visitor({ hour: 0, stored: 'dark' });
  await go(page, '/?theme=light');
  const asked = await stateOf(page);
  check('?theme=light shows the light mode whatever was kept, and keeps nothing new', is(asked, { mode: 'light', theme: 'day', stored: 'dark' }), tell(asked));
  await context.close();
}

// ---------- A phone: the button in the header, the switch in the menu ----------

{
  const { context, page } = await visitor({ hour: 0, screen: PHONE });
  await go(page, '/');
  let state = await stateOf(page);
  const shown = await page.evaluate(() => ({
    step: getComputedStyle(document.querySelector('[data-mode-step]')).display !== 'none',
    bar: getComputedStyle(document.querySelector('.site-header [data-mode-switch]')).display !== 'none',
  }));
  check('phone: the header has the one button, not the whole switch', shown.step && !shown.bar && /Dark/.test(state.step), `${tell(shown)} ${state.step}`);

  const seen = [];
  for (let i = 0; i < 3; i += 1) {
    await page.click('[data-mode-step]');
    await sleep(800);
    state = await stateOf(page);
    seen.push(state.mode);
  }
  check('phone: the button steps through light, mix and dark, and keeps each', seen.join() === 'light,mix,dark' && state.stored === 'dark' && state.choice === 'dark', `${seen.join()} ${tell(state)}`);

  await page.click('[data-menu-toggle]');
  await sleep(1200);
  await page.click('.menu [data-mode-switch] input[value="light"] + *');
  await sleep(800);
  state = await stateOf(page);
  const menu = await page.evaluate(() => ({
    bg: getComputedStyle(document.querySelector('.menu')).backgroundColor,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  check('phone: the switch in the menu changes the mode, menu and all', is(state, { mode: 'light', choice: 'light', theme: 'day', stored: 'light', checked: 'light,light' }) && menu.bg === 'rgb(247, 246, 242)' && menu.overflow <= 0, `${tell(state)} ${tell(menu)}`);
  await context.close();
}

if (problems.length) console.log(`\n${problems.join('\n')}`);
console.log(failures.length || problems.length ? `\n${failures.length} failed, ${problems.length} console problems` : '\nall steps passed, console clean');
process.exit(failures.length || problems.length ? 1 : 0);
