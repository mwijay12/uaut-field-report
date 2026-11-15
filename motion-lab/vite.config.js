import { defineConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { derive } from './content/derive.js';
import { compact, createEstimator, shillings } from './content/estimator.js';
import { BACKGROUNDS, PAGES, PRICES, SECTIONS, check, expand, tidy } from './content/schema.js';
import { PRESETS } from './src/gl/presets.js';

const root = dirname(fileURLToPath(import.meta.url));
const partials = resolve(root, 'src/partials');
// ALTRA_CONTENT=some/other.json builds the site from another content file,
// which is how a test tries a setting without touching the real one.
const contentFile = resolve(root, process.env.ALTRA_CONTENT || 'content/site.json');
const contentName = relative(root, contentFile);

// ---------- The content file ----------
// content/site.json is what the admin edits. A mistake in it stops the build,
// so the site that is already live stays up instead of a broken one replacing it.

function loadContent() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(contentFile, 'utf8'));
  } catch (error) {
    throw new Error(`${contentName} is not valid JSON: ${error.message}`);
  }
  const { errors } = check(parsed);
  if (errors.length) {
    const lines = errors.map((problem) => `  ${problem.path || '(file)'}: ${problem.message}`);
    throw new Error(`${contentName} has ${errors.length === 1 ? 'a problem' : `${errors.length} problems`}:\n${lines.join('\n')}`);
  }
  return tidy(parsed);
}

const content = loadContent();
const site = derive(content);

// Every section the admin can restyle must have a look, or its setting would do nothing.
for (const { key } of SECTIONS) {
  if (!PRESETS[key]) throw new Error(`content/schema.js lists the section "${key}", but src/gl/presets.js has no look with that name.`);
}

// What the estimator shows before anyone has touched it. The page carries
// these numbers in its HTML, so they are right without JavaScript too.
const untouched = createEstimator(site.prices).estimate({ kind: 'website' });
const sample = {
  low: compact(untouched.low),
  high: compact(untouched.high),
  base: shillings(untouched.base),
  contingency: shillings(untouched.contingency),
  total: shillings(untouched.total),
  rate: `${Math.round(untouched.contingencyRate * 1000) / 10}%`,
  complexity: String(untouched.complexity),
  weeks: `${untouched.weeks[0]} to ${untouched.weeks[1]}`,
};

// {{site.…}} in HTML reads from here.
const facts = { ...site, sample };

// <!-- @if leads --> … <!-- @else --> … <!-- @endif --> reads from here.
const flags = { leads: site.leads.on, index: content.seo.index };

const escapeHtml = (text) =>
  String(text).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

// ---------- Search engines and link previews ----------

const BRAND = 'Altraware Technology';

function structuredData(page, title, description) {
  const { origin } = site;
  const url = `${origin}${page.path}`;
  const offer = (key, name) => ({
    '@type': 'Offer',
    name,
    price: site.prices[key],
    priceCurrency: 'TZS',
    url: `${origin}/pricing/`,
  });

  const graph = [
    {
      '@type': 'ProfessionalService',
      '@id': `${origin}/#organization`,
      name: BRAND,
      url: `${origin}/`,
      logo: `${origin}/logo.png`,
      image: `${origin}/og.jpg`,
      description: expand(content.seo.pages.home.description, content),
      slogan: 'Rooted at home. Engineered for the world.',
      email: site.email,
      telephone: site.person.tel.replace('tel:', ''),
      priceRange: `From TSh ${site.price.starter}`,
      address: { '@type': 'PostalAddress', addressLocality: 'Dar es Salaam', addressCountry: 'TZ' },
      geo: { '@type': 'GeoCoordinates', latitude: -6.7924, longitude: 39.2083 },
      areaServed: [{ '@type': 'Country', name: 'Tanzania' }, 'East Africa'],
      knowsLanguage: ['en', 'sw'],
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '18:00',
      },
      contactPoint: [
        { '@type': 'ContactPoint', contactType: 'sales', telephone: site.person.tel.replace('tel:', ''), availableLanguage: ['en', 'sw'] },
        { '@type': 'ContactPoint', contactType: 'customer support', url: site.chatbot.whatsapp, availableLanguage: ['en', 'sw'] },
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Packages',
        itemListElement: PRICES.filter((item) => item.group === 'Packages').map((item) => offer(item.key, item.name)),
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: `${origin}/`,
      name: BRAND,
      inLanguage: 'en',
      publisher: { '@id': `${origin}/#organization` },
    },
    {
      '@type': page.key === 'contact' ? 'ContactPage' : page.key === 'studio' ? 'AboutPage' : 'WebPage',
      '@id': `${url}#page`,
      url,
      name: title,
      description,
      inLanguage: 'en',
      isPartOf: { '@id': `${origin}/#website` },
      about: { '@id': `${origin}/#organization` },
      primaryImageOfPage: `${origin}/og.jpg`,
    },
  ];

  if (page.key !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: page.name, item: url },
      ],
    });
  }

  // "<" is written as an escape so the text can never close its own <script>.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

/** What the <head> of a page needs, by page key. A key that is not a page (the 404, the admin) is kept out of search. */
function headOf(key, given) {
  const page = PAGES.find((item) => item.key === key);
  if (!page) {
    if (!given.title) throw new Error(`The head of "${key}" needs a title: it is not one of the pages in content/schema.js.`);
    return { robots: 'noindex, nofollow', canonical: '', 'json-ld': '{}', image: `${site.origin}/og.jpg` };
  }

  const entry = content.seo.pages[page.key];
  const title = expand(entry.title, content);
  const description = expand(entry.description, content);
  const url = `${site.origin}${page.path}`;
  return {
    title: escapeHtml(title),
    description: escapeHtml(description),
    robots: content.seo.index ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    canonical: `<link rel="canonical" href="${escapeHtml(url)}" data-head />\n<meta property="og:url" content="${escapeHtml(url)}" data-head />`,
    image: `${site.origin}/og.jpg`,
    'json-ld': structuredData(page, title, description),
  };
}

/** robots.txt always, sitemap.xml only while the site may be listed. */
function searchFiles() {
  const robots = [
    `# ${BRAND}`,
    'User-agent: *',
    'Allow: /',
    ...(content.seo.index ? ['', `Sitemap: ${site.origin}/sitemap.xml`] : []),
    '',
  ].join('\n');

  const today = new Date().toISOString().slice(0, 10);
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PAGES.map((page) => `  <url><loc>${escapeHtml(site.origin + page.path)}</loc><lastmod>${today}</lastmod></url>`),
    '</urlset>',
    '',
  ].join('\n');

  const files = { '/robots.txt': ['text/plain; charset=utf-8', robots] };
  if (content.seo.index) files['/sitemap.xml'] = ['application/xml; charset=utf-8', sitemap];

  return {
    name: 'search-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files[new URL(req.url, 'http://localhost').pathname];
        if (!file) return next();
        res.setHeader('Content-Type', file[0]);
        res.end(file[1]);
      });
    },
    generateBundle() {
      for (const [path, [, source]] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source });
      }
    },
  };
}

// ---------- Pages ----------

/**
 * A small HTML step, so the pages share one header, footer and <head>, and
 * take their facts from the content file.
 *
 *   <!-- @include footer -->
 *   <!-- @include head page="pricing" theme-color="#f7f6f2" -->
 *
 * The comment is replaced by src/partials/<name>.html. The name can point into
 * a folder: <!-- @include art/compass --> is src/partials/art/compass.html.
 * Inside a partial, {{title}} is replaced by the attribute of the same name,
 * or by nothing.
 * With page="…", the title, description and the rest of the <head> come from
 * the content file.
 *
 *   {{site.person.number}}
 *
 * Anywhere in a page or a partial, this is replaced by that value. An unknown
 * name fails the build.
 *
 *   <!-- @if leads --> … <!-- @else --> … <!-- @endif -->
 *
 * Keeps one part. `leads`: briefs are also saved to the inbox. `index`: search
 * engines may list the site. `@if !leads` is the opposite.
 *
 *   data-stage="home-route"
 *
 * Gets data-bg="plain" data-calm="1" (or "soft") beside it when the content
 * file asks for that. A name with no look in src/gl/presets.js fails the build.
 */
function htmlIncludes() {
  const include = /<!--\s*@include\s+([\w-]+(?:\/[\w-]+)*)((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
  const attribute = /([\w-]+)="([^"]*)"/g;
  const slot = /\{\{\s*([\w-]+)\s*\}\}/g;
  const fact = /\{\{\s*site\.([\w.]+)\s*\}\}/g;
  const branch = /<!--\s*@if\s+(!?)([\w-]+)\s*-->([\s\S]*?)(?:<!--\s*@else\s*-->([\s\S]*?))?<!--\s*@endif\s*-->/g;
  const staged = /data-stage="([^"]*)"/g;

  const fill = (html, depth = 0) =>
    html.replace(include, (_, name, attrs) => {
      const given = Object.fromEntries([...attrs.matchAll(attribute)].map((m) => [m[1], m[2]]));
      const vars = given.page ? { ...given, ...headOf(given.page, given) } : given;
      const part = readFileSync(resolve(partials, `${name}.html`), 'utf8').replace(slot, (__, key) => vars[key] ?? '');
      return depth < 3 ? fill(part, depth + 1) : part;
    });

  // An include that does not match the pattern would otherwise be left in the
  // page as a comment, and the page would ship without its <head>. Fail instead.
  const check = (html, file) => {
    const leftover = html.match(/<!--\s*@(include|if|else|endif)[^>]*-->/);
    if (leftover) {
      throw new Error(`Malformed ${leftover[1]} in ${file}: ${leftover[0].slice(0, 120)}\nAttribute values must use double quotes and cannot contain a double quote. An @if needs its @endif and cannot hold another @if.`);
    }
    return html;
  };

  const choose = (html, file) =>
    html.replace(branch, (_, not, name, yes, no = '') => {
      if (!(name in flags)) throw new Error(`Unknown @if ${name} in ${file}. The names are: ${Object.keys(flags).join(', ')}.`);
      return flags[name] !== Boolean(not) ? yes : no;
    });

  const tell = (html, file) =>
    html.replace(fact, (token, path) => {
      const value = path.split('.').reduce((at, key) => at?.[key], facts);
      if (typeof value !== 'string') throw new Error(`Unknown ${token} in ${file}. The values come from content/site.json, through content/derive.js.`);
      return escapeHtml(value);
    });

  const dress = (html, file) =>
    html.replace(staged, (attr, name) => {
      if (!PRESETS[name]) throw new Error(`data-stage="${name}" in ${file} has no look in src/gl/presets.js.`);
      const background = BACKGROUNDS.find((item) => item.key === (content.backgrounds[name] ?? 'effect'));
      return background.calm ? `${attr} data-bg="${background.key}" data-calm="${background.calm}"` : attr;
    });

  return {
    name: 'html-includes',
    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        return dress(tell(check(choose(fill(html), filename), filename), filename), filename);
      },
    },
    configureServer(server) {
      server.watcher.add([partials, contentFile]);
      server.watcher.on('change', (file) => {
        // The content is read once, when this file loads. Start again to read it afresh.
        if (file === contentFile) server.restart();
        else if (file.startsWith(partials)) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

/**
 * Vercel answers any unknown path with dist/404.html. `vite` and `vite preview`
 * answer with an empty 404, so this makes the local servers behave like production.
 */
function notFoundPage() {
  const misses = (req) => {
    if (req.method !== 'GET' || !(req.headers.accept ?? '').includes('text/html')) return false;
    // By the time this runs, Vite has rewritten every page that exists to its .html file.
    return !new URL(req.url, 'http://localhost').pathname.endsWith('.html');
  };

  return {
    name: 'not-found-page',
    configureServer(server) {
      return () =>
        server.middlewares.use((req, res, next) => {
          if (misses(req)) req.url = '/404.html';
          next();
        });
    },
    configurePreviewServer(server) {
      const page = resolve(server.config.root, server.config.build.outDir, '404.html');
      if (!existsSync(page)) throw new Error(`${page} does not exist. Run "npm run build" first.`);
      return () =>
        server.middlewares.use((req, res, next) => {
          if (!misses(req)) return next();
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(readFileSync(page));
        });
    },
  };
}

/**
 * `vite preview` sends the headers vercel.json asks for, so a policy that would
 * block something in production blocks it here first (the admin's
 * Content-Security-Policy above all). Not in `vite` itself: the dev server
 * needs inline scripts that the policy forbids.
 *
 * A "source" in vercel.json is read as a plain regular expression, which is
 * true of the simple patterns used there (no :name parts).
 *
 * One thing is left out on purpose: the rule against being shown in a frame
 * (X-Frame-Options, and frame-ancestors in the policy). A preview is often
 * looked at inside a frame, such as an editor's preview pane, and that rule
 * would leave the pane empty. Production sends it.
 */
function vercelHeaders() {
  const framable = ({ key, value }) =>
    /^content-security-policy$/i.test(key) ? { key, value: value.replace(/\s*frame-ancestors[^;]*;?/i, '').replace(/;\s*$/, '') } : { key, value };

  const rules = (JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8')).headers ?? []).map((rule) => ({
    pattern: new RegExp(`^${rule.source}$`),
    headers: rule.headers.filter(({ key }) => !/^x-frame-options$/i.test(key)).map(framable),
  }));

  return {
    name: 'vercel-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const { pathname } = new URL(req.url, 'http://localhost');
        for (const rule of rules) {
          if (!rule.pattern.test(pathname)) continue;
          for (const { key, value } of rule.headers) res.setHeader(key, value);
        }
        next();
      });
    },
  };
}

// The Arena preview proxies the dev server under *.e2b.app, so that host must be allowed.
const host = { host: '0.0.0.0', strictPort: true, allowedHosts: ['.e2b.app'] };

export default defineConfig({
  appType: 'mpa',
  plugins: [htmlIncludes(), searchFiles(), notFoundPage(), vercelHeaders()],
  define: {
    // Only what the scripts use. See src/site.js.
    __SITE__: JSON.stringify({
      chatbot: site.chatbot,
      person: site.person,
      email: site.email,
      prices: site.prices,
      leads: { on: site.leads.on, projectId: site.leads.projectId },
    }),
  },
  server: { ...host, port: 5173 },
  preview: { ...host, port: 4173 },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: {
        home: resolve(root, 'index.html'),
        work: resolve(root, 'work/index.html'),
        services: resolve(root, 'services/index.html'),
        pricing: resolve(root, 'pricing/index.html'),
        studio: resolve(root, 'studio/index.html'),
        contact: resolve(root, 'contact/index.html'),
        notFound: resolve(root, '404.html'),
        admin: resolve(root, 'admin/index.html'),
      },
    },
  },
});
