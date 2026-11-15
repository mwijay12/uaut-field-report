import { defineConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { site } from './src/site.js';

const root = dirname(fileURLToPath(import.meta.url));
const partials = resolve(root, 'src/partials');

/**
 * Tiny HTML include step, so the pages share one header, footer and <head>.
 *
 *   <!-- @include footer -->
 *   <!-- @include head title="Work" description="..." -->
 *
 * The comment is replaced by src/partials/<name>.html. Inside a partial,
 * {{title}} is replaced by the attribute of the same name, or by nothing.
 *
 * Anywhere in a page or a partial, {{site.person.number}} is replaced by that
 * value from src/site.js. An unknown name fails the build.
 */
function htmlIncludes() {
  const include = /<!--\s*@include\s+([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
  const attribute = /([\w-]+)="([^"]*)"/g;
  const slot = /\{\{\s*([\w-]+)\s*\}\}/g;
  const fact = /\{\{\s*site\.([\w.]+)\s*\}\}/g;

  const facts = (html, file) =>
    html.replace(fact, (token, path) => {
      const value = path.split('.').reduce((at, key) => at?.[key], site);
      if (typeof value !== 'string') throw new Error(`Unknown ${token} in ${file}. The values are in src/site.js.`);
      return value;
    });

  const fill = (html, depth = 0) =>
    html.replace(include, (_, name, attrs) => {
      const vars = Object.fromEntries([...attrs.matchAll(attribute)].map((m) => [m[1], m[2]]));
      const part = readFileSync(resolve(partials, `${name}.html`), 'utf8').replace(slot, (__, key) => vars[key] ?? '');
      return depth < 3 ? fill(part, depth + 1) : part;
    });

  // An include that does not match the pattern would otherwise be left in the
  // page as a comment, and the page would ship without its <head>. Fail instead.
  const check = (html, file) => {
    const leftover = html.match(/<!--\s*@include[^>]*-->/);
    if (leftover) {
      throw new Error(`Malformed include in ${file}: ${leftover[0].slice(0, 120)}\nAttribute values must use double quotes and cannot contain a double quote.`);
    }
    return html;
  };

  return {
    name: 'html-includes',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, context) => facts(check(fill(html), context.filename), context.filename),
    },
    configureServer(server) {
      server.watcher.add(partials);
      server.watcher.on('change', (file) => {
        if (file.startsWith(partials)) server.ws.send({ type: 'full-reload' });
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

// The Arena preview proxies the dev server under *.e2b.app, so that host must be allowed.
const host = { host: '0.0.0.0', strictPort: true, allowedHosts: ['.e2b.app'] };

export default defineConfig({
  appType: 'mpa',
  plugins: [htmlIncludes(), notFoundPage()],
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
      },
    },
  },
});
