// Runs Lighthouse on every page and prints the scores and what failed.
// SEO, accessibility and best practices only: performance means nothing here,
// where WebGL runs on the CPU. Measure that on a real phone, or with
// PageSpeed Insights on the live address.
//
//   npm i --no-save puppeteer-core @sparticuz/chromium lighthouse
//   npm run build && npm run preview &
//   node scripts/lighthouse.mjs [http://localhost:4173] [--min 100] [--theme dark,light]
//
// --min <score>   exit code 1 when a page scores below this in any category.
//                 `npm run lighthouse` asks for 100.
// --theme <list>  the modes to test, separated by commas: dark, light, mix
//                 (content/mode.js). Every page is tested once in each. The
//                 default is dark and light: the mix shows each section in one
//                 of those two, so they cover it, and a page with no mode named
//                 would be tested in whatever the hour of the day gives.
//
// While content/site.json has seo.index off, every page says "noindex" and the
// "is-crawlable" audit fails on purpose. That audit is reported apart, and the
// SEO score is also shown as it would be with indexing on.

process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');
const { default: puppeteer } = await import('puppeteer-core');
const { default: lighthouse } = await import('lighthouse');

const args = process.argv.slice(2);
const base = (args.find((arg) => /^https?:\/\//.test(arg)) ?? 'http://localhost:4173').replace(/\/$/, '');
const min = Number(args[args.indexOf('--min') + 1]) || 0;
const themes = (args.includes('--theme') ? args[args.indexOf('--theme') + 1] : 'dark,light').split(',').filter(Boolean);
const PAGES = ['/', '/work/', '/services/', '/pricing/', '/studio/', '/contact/'];
const CATEGORIES = ['seo', 'accessibility', 'best-practices'];

const browser = await puppeteer.launch({
  args: [...chromium.args, '--enable-unsafe-swiftshader'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});

/** One page in one mode. Prints its scores and what failed, and says whether it is below the mark. */
async function test(path, theme) {
  const page = await browser.newPage();
  const { lhr } = await lighthouse(`${base}${path}?theme=${theme}`, { output: 'json', logLevel: 'silent', onlyCategories: CATEGORIES }, undefined, page);
  await page.close();

  const failed = [];
  const scores = CATEGORIES.map((key) => {
    const category = lhr.categories[key];
    for (const ref of category.auditRefs) {
      const audit = lhr.audits[ref.id];
      if (audit.score !== null && audit.score < 1 && ref.weight > 0) failed.push({ category: key, id: ref.id, title: audit.title, weight: ref.weight, items: audit.details?.items ?? [] });
    }
    return Math.round(category.score * 100);
  });

  // The SEO score with the one audit that the noindex switch decides left out.
  const seo = lhr.categories.seo.auditRefs.filter((ref) => lhr.audits[ref.id].score !== null && ref.weight > 0);
  const rest = seo.filter((ref) => ref.id !== 'is-crawlable');
  const listed = Math.round((rest.reduce((sum, ref) => sum + ref.weight * lhr.audits[ref.id].score, 0) / rest.reduce((sum, ref) => sum + ref.weight, 0)) * 100);
  const blocked = lhr.audits['is-crawlable'].score === 0;

  console.log(`${path.padEnd(11)} SEO ${String(scores[0]).padStart(3)}${blocked ? ` (${listed} with indexing on)` : ''}   accessibility ${String(scores[1]).padStart(3)}   best practices ${String(scores[2]).padStart(3)}`);
  for (const audit of failed) {
    if (audit.id === 'is-crawlable') continue;
    console.log(`    ${audit.category}: ${audit.title}`);
    for (const item of audit.items.slice(0, 4)) {
      const where = item.node?.snippet ?? item.url ?? item.sourceLocation?.url ?? item.description ?? JSON.stringify(item).slice(0, 160);
      console.log(`      ${String(where).replace(/\s+/g, ' ').slice(0, 170)}`);
    }
  }
  return (blocked ? listed : scores[0]) < min || scores[1] < min || scores[2] < min;
}

let low = false;
for (const [index, theme] of themes.entries()) {
  console.log(`${index ? '\n' : ''}${theme}`);
  for (const path of PAGES) {
    if (await test(path, theme)) low = true;
  }
}

await browser.close();
process.exit(low ? 1 : 0);
