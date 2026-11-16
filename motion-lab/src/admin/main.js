// The admin. One page, no server: it reads content/site.json from GitHub with
// the owner's token, lets them change it, and commits it back. The commit is
// the publish. Vercel rebuilds the site from it in about a minute.
//
//   config.js    which repository, branch and file
//   github.js    the calls to GitHub
//   changes.js   what differs from the live content, in words
//   dom.js       element helper
//
// The rules for what the file may hold are in content/schema.js, the same file
// the build reads, so the admin cannot publish something the build would refuse.

import { compact, createEstimator, shillings } from '../../content/estimator.js';
import {
  BACKGROUNDS,
  LIMITS,
  PAGES,
  PRICES,
  SECTIONS,
  SOCIAL,
  check,
  cleanProfile,
  expand,
  formatAmount,
  formatPhone,
  phoneDigits,
  serialise,
  tidy,
} from '../../content/schema.js';
import { explain, leadRecord, saveLead } from '../lib/leads.js';
import { changes, commitMessage, nameOf, showValue, tabOf } from './changes.js';
import { DEFAULTS, SESSION, TOKEN_PAGE } from './config.js';
import { add, ago, fill, h, icon } from './dom.js';
import { createGitHub } from './github.js';

// ---------- Storage ----------
// The token lives in sessionStorage: this tab only, gone when the tab closes.
// Only the repository name is kept for next time, and that is not a secret.

const SESSION_KEY = 'altra-admin:session';
const DRAFT_KEY = 'altra-admin:draft';
const WHERE_KEY = 'altra-admin:where';

const keep = (storage) => ({
  get(key) {
    try {
      return JSON.parse(storage.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null || value === undefined) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be blocked. The admin still works, it just forgets on reload.
    }
  },
  drop(key) {
    try {
      storage.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  },
});
const tab = keep(window.sessionStorage);
const device = keep(window.localStorage);

// ---------- State ----------

const root = document.getElementById('app');

const app = {
  github: null,
  who: null, // { repo, login, canWrite, url }
  saved: null, // the content that is on the branch
  sha: '', // of the file, as loaded
  draft: null, // what the forms edit
  report: { errors: [], advice: [] },
  diff: [],
  tab: 'overview',
  view: null, // { sync() } of the page on screen
  fields: new Map(), // path -> { element, input, note }
  commits: null, // history, once asked for
  build: null, // the last publish and what Vercel says about it
  parts: {}, // elements of the shell
};

const get = (object, path) => path.split('.').reduce((at, key) => at?.[key], object);
const set = (object, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((at, key) => (at[key] ??= {}), object)[last] = value;
};

// ---------- Sign in ----------

let clock = 0;
let watching = false;

function signOut(notice = '') {
  window.clearInterval(clock);
  tab.drop(SESSION_KEY);
  app.github = null;
  showSignIn(notice);
}

function watchSession() {
  const touch = () => {
    const session = tab.get(SESSION_KEY);
    if (session && Date.now() - session.seen > 10_000) tab.set(SESSION_KEY, { ...session, seen: Date.now() });
  };
  if (!watching) {
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    watching = true;
  }

  window.clearInterval(clock);
  clock = window.setInterval(() => {
    const session = tab.get(SESSION_KEY);
    if (!session) return;
    const kept = app.diff.length ? ' Your unpublished changes are kept in this tab.' : '';
    if (Date.now() - session.started > SESSION.longest) signOut(`Signed out after eight hours.${kept}`);
    else if (Date.now() - session.seen > SESSION.idle) signOut(`Signed out after thirty minutes without activity.${kept}`);
  }, 20_000);
}

function showSignIn(notice = '') {
  const where = { ...DEFAULTS, ...(device.get(WHERE_KEY) ?? {}) };
  const status = h('p', { class: 'signin__status', role: 'status' }, notice);
  const token = h('input', {
    id: 'token',
    name: 'token',
    type: 'password',
    autocomplete: 'off',
    spellcheck: false,
    required: true,
    placeholder: 'github_pat_…',
  });
  const repo = h('input', { id: 'repo', type: 'text', value: where.repo, spellcheck: false, autocomplete: 'off' });
  const branch = h('input', { id: 'branch', type: 'text', value: where.branch, spellcheck: false, autocomplete: 'off' });
  const file = h('input', { id: 'file', type: 'text', value: where.file, spellcheck: false, autocomplete: 'off' });
  const button = h('button', { class: 'btn', type: 'submit' }, 'Sign in');

  const form = h(
    'form',
    {
      class: 'signin__form',
      onsubmit: async (event) => {
        event.preventDefault();
        const place = { repo: repo.value.trim(), branch: branch.value.trim(), file: file.value.trim().replace(/^\/+/, '') };
        if (!/^[\w.-]+\/[\w.-]+$/.test(place.repo)) {
          status.textContent = 'Write the repository as owner/name.';
          return;
        }
        button.disabled = true;
        status.textContent = 'Checking with GitHub…';
        try {
          await enter({ token: token.value.trim(), ...place });
          device.set(WHERE_KEY, { ...place, repo: app.who.repo });
        } catch (error) {
          status.textContent = error.hint ?? error.message;
          button.disabled = false;
          token.focus();
        }
      },
    },
    h('label', { class: 'field__label', for: 'token' }, 'GitHub token'),
    token,
    h('details', { class: 'signin__more' },
      h('summary', null, 'Repository'),
      h('label', { class: 'field__label', for: 'repo' }, 'Repository'), repo,
      h('label', { class: 'field__label', for: 'branch' }, 'Branch that Vercel publishes'), branch,
      h('label', { class: 'field__label', for: 'file' }, 'Content file'), file,
    ),
    button,
    status,
  );

  fill(root,
    h('main', { class: 'signin' },
      h('p', { class: 'eyebrow' }, 'Altraware · Admin'),
      h('h1', { class: 'signin__title' }, 'Manage the site'),
      h('p', { class: 'signin__lede' },
        'Phone lines, prices, section backgrounds, search listing and where briefs are saved. A change is published as a commit, and the site rebuilds itself in about a minute.'),
      form,
      h('section', { class: 'signin__help' },
        h('h2', null, 'Making the token, once'),
        h('ol', null,
          h('li', null, 'Open ', h('a', { href: TOKEN_PAGE, target: '_blank', rel: 'noopener noreferrer' }, 'GitHub, Fine-grained tokens, Generate new token', icon('out')), '.'),
          h('li', null, 'Repository access: Only select repositories, then ', h('code', null, where.repo), '.'),
          h('li', null, 'Repository permissions: ', h('strong', null, 'Contents'), ', Read and write, so it can publish. And ', h('strong', null, 'Commit statuses'), ', Read-only, so it can tell you when the build is live. Nothing else.'),
          h('li', null, 'Generate it, copy it and paste it above.'),
        ),
        h('p', null,
          'The token stays in this browser tab and is sent only to api.github.com. Closing the tab signs you out. This page has no password of its own: without a token that can write to the repository it can change nothing.'),
      ),
    ),
  );
  token.focus();
}

async function enter({ token, repo, branch, file }) {
  const github = createGitHub({ token, repo, branch, file });
  const who = await github.connect();
  const { text, sha } = await github.read();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${file} on ${branch} is not valid JSON. Fix it on GitHub first.`);
  }

  app.github = github;
  app.who = who;
  app.saved = tidy(parsed);
  app.sha = sha;
  app.commits = null;
  app.build = null;

  // Changes that were not published before a reload or a sign-out, if they
  // were made against this same version of the file.
  const waiting = tab.get(DRAFT_KEY);
  app.draft = waiting?.sha === sha && waiting.draft ? waiting.draft : structuredClone(app.saved);

  const now = Date.now();
  const earlier = tab.get(SESSION_KEY);
  tab.set(SESSION_KEY, { token, repo: who.repo, branch, file, started: earlier?.token === token ? earlier.started : now, seen: now });
  watchSession();
  showShell();
}

// ---------- The shell ----------

const TABS = [
  { key: 'overview', name: 'Overview', title: 'Overview', text: 'What is live, and what is waiting to be published.' },
  { key: 'lines', name: 'Lines', title: 'Phone lines and email', text: 'Every page, the footer, the menu and the WhatsApp message read these three.' },
  { key: 'social', name: 'Social', title: 'Social profiles', text: 'The icons in the footer, and the answer Altra gives when somebody asks where to follow us. The WhatsApp icon uses the person line, so there is nothing to set for it here.' },
  { key: 'prices', name: 'Prices', title: 'Prices', text: 'In Tanzanian shillings, before VAT. The cards, the estimator, the brief form and the page descriptions all follow.' },
  { key: 'backgrounds', name: 'Backgrounds', title: 'Section backgrounds', text: 'Each section shows the moving chart, a soft version of it, or the plain page colour. On a light section, the chart or its soft version puts the small text on glass panes, so the lines do not run through it.' },
  { key: 'search', name: 'Search', title: 'Search engines', text: 'Whether the site may be listed, and what each page says about itself in results and link previews.' },
  { key: 'leads', name: 'Leads', title: 'Where briefs go', text: 'A brief always opens WhatsApp. It can also be saved in the inbox of the main site.' },
  { key: 'history', name: 'History', title: 'History', text: 'Every publish, newest first. Any of them can be loaded back.' },
];

function showShell() {
  const nav = h('nav', { class: 'rail__nav', 'aria-label': 'Admin' },
    TABS.map((item) =>
      h('button', { class: 'rail__link', type: 'button', data: { tab: item.key }, onclick: () => go(item.key) },
        h('span', null, item.name),
        h('span', { class: 'rail__mark', 'aria-hidden': 'true' }),
      ),
    ),
  );

  // The words are the live region. The button beside them is not, so a screen
  // reader announces the message and not the button.
  const bannerText = h('p', { class: 'banner__text', role: 'status', 'aria-live': 'polite' });
  const bannerAction = h('span', { class: 'banner__action' });
  const banner = h('div', { class: 'banner', hidden: true },
    bannerText,
    bannerAction,
    h('button', { class: 'banner__close', type: 'button', 'aria-label': 'Dismiss this message', onclick: () => notify('') }, icon('close')),
  );
  const title = h('h1', { class: 'main__title', tabIndex: -1 });
  const text = h('p', { class: 'main__text' });
  const body = h('div', { class: 'main__body' });

  const count = h('p', { class: 'bar__count' });
  const discard = h('button', { class: 'btn btn--quiet', type: 'button', onclick: discardDraft }, 'Discard');
  const review = h('button', { class: 'btn', type: 'button', onclick: openReview }, 'Review and publish');
  const bar = h('div', { class: 'bar', hidden: true }, count, h('div', { class: 'bar__actions' }, discard, review));

  app.parts = { nav, banner, bannerText, bannerAction, title, text, body, bar, count, review };

  fill(root,
    h('div', { class: 'shell' },
      h('aside', { class: 'rail' },
        h('a', { class: 'rail__brand', href: '/', target: '_blank', rel: 'noopener' }, 'Altraware', h('span', null, 'Admin')),
        nav,
        h('div', { class: 'rail__foot' },
          h('p', { class: 'rail__who' }, app.who.login ? `${app.who.login} · ` : '', h('a', { href: app.who.url, target: '_blank', rel: 'noopener noreferrer' }, app.who.repo), ` · ${app.github.branch}`),
          h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => signOut(app.diff.length ? 'Signed out. Your unpublished changes are kept in this tab.' : 'Signed out.') }, 'Sign out'),
        ),
      ),
      h('main', { class: 'main' },
        banner,
        h('header', { class: 'main__head' }, title, text),
        body,
      ),
      bar,
    ),
  );

  if (!app.who.canWrite) notify('This token can read the repository but not write to it. You can look around, but publishing will be refused.', 'warn');
  changed({ render: false });
  go(app.tab, { focus: false });
}

function go(key, { focus = true } = {}) {
  const page = TABS.find((item) => item.key === key) ?? TABS[0];
  app.tab = page.key;
  app.fields.clear();
  app.parts.title.textContent = page.title;
  app.parts.text.textContent = page.text;
  for (const link of app.parts.nav.children) {
    if (link.dataset.tab === page.key) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  fill(app.parts.body);
  app.view = VIEWS[page.key](app.parts.body) ?? null;
  syncFields();
  if (focus) {
    app.parts.title.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

/** Something in the draft changed: check it again and bring everything on screen up to date. */
function changed({ render = true } = {}) {
  app.report = check(app.draft);
  app.diff = changes(app.saved, app.draft);
  tab.set(DRAFT_KEY, app.diff.length ? { sha: app.sha, draft: app.draft } : null);

  const { nav, bar, count, review } = app.parts;
  for (const link of nav.children) {
    const key = link.dataset.tab;
    const wrong = app.report.errors.some((problem) => tabOf(problem.path) === key);
    const edited = app.diff.some((change) => tabOf(change.path) === key);
    link.dataset.state = wrong ? 'error' : edited ? 'changed' : '';
  }

  const total = app.diff.length;
  const wrong = app.report.errors.length;
  bar.hidden = total === 0;
  count.textContent = wrong
    ? `${total} ${total === 1 ? 'change' : 'changes'}, ${wrong} ${wrong === 1 ? 'problem' : 'problems'} to fix first`
    : `${total} ${total === 1 ? 'change' : 'changes'} not published`;
  review.disabled = wrong > 0;

  if (render) {
    syncFields();
    app.view?.sync?.();
  }
}

function syncFields() {
  for (const [path, item] of app.fields) {
    const error = app.report.errors.find((problem) => problem.path === path);
    const advice = app.report.advice.find((problem) => problem.path === path);
    item.note.textContent = (error ?? advice)?.message ?? '';
    item.element.classList.toggle('is-error', Boolean(error));
    item.element.classList.toggle('is-advice', !error && Boolean(advice));
    item.element.classList.toggle('is-changed', app.diff.some((change) => change.path === path));
    item.input?.setAttribute('aria-invalid', error ? 'true' : 'false');
  }
}

function notify(message, tone = 'info', action = null) {
  const { banner, bannerText, bannerAction } = app.parts;
  bannerText.textContent = message;
  fill(bannerAction, action);
  banner.dataset.tone = tone;
  banner.hidden = !message;
}

window.addEventListener('beforeunload', (event) => {
  // The draft survives a reload of this tab, but not closing it.
  if (app.github && app.diff.length) event.preventDefault();
});

// ---------- Form pieces ----------

/**
 * One labelled input bound to a path of the draft. It shows the problem or the
 * advice for that path under itself, and a mark when it differs from what is live.
 */
function field({ path, label, hint = '', rows = 0, prefix = '', inputmode, type = 'text', placeholder = '', parse = (value) => value, format = (value) => value ?? '', tidyOnBlur = false, counter = null }) {
  const id = `f-${path.replace(/\W+/g, '-')}`;
  const input = h(rows ? 'textarea' : 'input', {
    id,
    ...(rows ? { rows } : { type }),
    value: format(get(app.draft, path)),
    placeholder,
    inputMode: inputmode,
    spellcheck: rows > 0,
    autocomplete: 'off',
    'aria-describedby': `${id}-note`,
  });
  const note = h('p', { class: 'field__note', id: `${id}-note` });
  const count = counter ? h('span', { class: 'field__count' }) : null;
  const showCount = () => {
    if (!count) return;
    const length = counter.measure(input.value).length;
    count.textContent = `${length} / ${counter.best}`;
    count.classList.toggle('is-over', length > counter.best);
  };

  input.addEventListener('input', () => {
    set(app.draft, path, parse(input.value));
    showCount();
    changed();
  });
  if (tidyOnBlur) {
    // On leaving the field, show the value the tidy way and keep it that way,
    // so the review lists "+255 712 345 678" and not what was typed.
    input.addEventListener('blur', () => {
      const shown = format(get(app.draft, path));
      if (!shown) return;
      input.value = shown;
      if (get(app.draft, path) !== parse(shown)) {
        set(app.draft, path, parse(shown));
        changed();
      }
    });
  }
  showCount();

  const element = h('div', { class: 'field' },
    h('div', { class: 'field__top' }, h('label', { class: 'field__label', for: id }, label), count),
    prefix ? h('div', { class: 'field__box' }, h('span', { class: 'field__prefix', 'aria-hidden': 'true' }, prefix), input) : input,
    hint ? h('p', { class: 'field__hint' }, hint) : null,
    note,
  );
  app.fields.set(path, { element, input, note });
  return element;
}

const panel = (title, ...children) => h('section', { class: 'panel' }, title ? h('h2', { class: 'panel__title' }, title) : null, ...children);

const external = (href, label) => h('a', { class: 'link', href, target: '_blank', rel: 'noopener noreferrer' }, label, icon('out'));

// ---------- Pages ----------

const VIEWS = {
  overview(body) {
    const render = () => {
      const { draft, saved } = app;
      const modes = SECTIONS.reduce((tally, { key }) => {
        const mode = draft.backgrounds[key] ?? 'effect';
        return { ...tally, [mode]: (tally[mode] ?? 0) + 1 };
      }, {});

      const state = (label, value, note, key) =>
        h('button', { class: 'tile', type: 'button', onclick: () => go(key) },
          h('span', { class: 'tile__label' }, label),
          h('span', { class: 'tile__value' }, value),
          h('span', { class: 'tile__note' }, note),
        );

      const problems = [
        ...app.report.errors.map((problem) => ({ ...problem, tone: 'error' })),
        ...app.report.advice.map((problem) => ({ ...problem, tone: 'advice' })),
      ];

      fill(body,
        h('div', { class: 'tiles' },
          state('Search engines', saved.seo.index ? 'Listed' : 'Hidden',
            saved.seo.index ? 'Search engines may list every page.' : 'Every page asks not to be listed. This alone holds the Lighthouse SEO score down.', 'search'),
          state('Briefs', saved.leads.projectId ? 'WhatsApp and inbox' : 'WhatsApp only',
            saved.leads.projectId ? `Also saved in ${saved.leads.projectId}.` : 'Nothing is saved anywhere. Add the Firebase project ID to keep a copy.', 'leads'),
          state('Backgrounds', `${modes.plain ?? 0} plain`, `${modes.soft ?? 0} soft, ${modes.effect ?? 0} with the full chart.`, 'backgrounds'),
          state('Person line', formatPhone(saved.contact.person), `Chatbot ${formatPhone(saved.contact.chatbot)}`, 'lines'),
        ),

        panel('The site',
          h('p', null, external(`${saved.seo.origin}/`, saved.seo.origin.replace(/^https:\/\//, ''))),
          saved.leads.inbox ? h('p', null, external(saved.leads.inbox, 'Open the inbox on the main site'), ' to read the briefs that were saved.') : null,
          h('p', { class: 'muted', data: { last: '' } }, 'Looking up the last publish…'),
        ),

        panel(app.diff.length ? `Not published yet (${app.diff.length})` : 'Not published yet',
          app.diff.length
            ? changeList(app.diff, { jump: true })
            : h('p', { class: 'muted' }, 'Nothing. What you see here is what is live.'),
        ),

        problems.length
          ? panel('Worth a look',
              h('ul', { class: 'problems' },
                problems.map((problem) =>
                  h('li', { class: `problems__item is-${problem.tone}` },
                    icon(problem.tone === 'error' ? 'alert' : 'dot'),
                    h('span', null, h('strong', null, nameOf(problem.path)), ' ', problem.message),
                    h('button', { class: 'link', type: 'button', onclick: () => go(tabOf(problem.path)) }, 'Go there'),
                  ),
                ),
              ),
            )
          : null,
      );

      lastPublish(body.querySelector('[data-last]'));
    };
    render();
    return { sync: render };
  },

  lines(body) {
    const preview = (key) => h('p', { class: 'field__hint', data: { link: key } });
    add(body,
      panel('WhatsApp chatbot',
        h('p', { class: 'panel__text' }, 'Automated replies. The site offers it for quick questions, beside the main button on the home, work and pricing pages.'),
        field({ path: 'contact.chatbot', label: 'Number', inputmode: 'tel', placeholder: '+255 790 942 616', format: formatPhone, tidyOnBlur: true }),
        preview('chatbot'),
      ),
      panel('A person on the team',
        h('p', { class: 'panel__text' }, 'On WhatsApp and by phone. Briefs and estimates are sent here, because they ask for a written quote.'),
        field({ path: 'contact.person', label: 'Number', inputmode: 'tel', placeholder: '+255 792 867 427', format: formatPhone, tidyOnBlur: true }),
        preview('person'),
      ),
      panel('Email',
        field({ path: 'contact.email', label: 'Address', type: 'email', inputmode: 'email', placeholder: 'name@example.com', parse: (value) => value.trim() }),
      ),
    );

    const sync = () => {
      for (const note of body.querySelectorAll('[data-link]')) {
        const digits = phoneDigits(app.draft.contact[note.dataset.link]);
        const usable = digits.length >= 10 && digits.length <= 15;
        fill(note,
          usable ? 'The site will link to ' : 'A number written as 0790 942 616 is read as Tanzanian, +255.',
          usable ? external(`https://wa.me/${digits}`, `wa.me/${digits}`) : null,
          usable ? '. Open it to check that it reaches the right chat.' : null,
        );
      }
    };
    sync();
    return { sync };
  },

  social(body) {
    const preview = (key) => h('p', { class: 'field__hint', data: { social: key } });

    add(body,
      panel('Profiles',
        h('p', { class: 'panel__text' }, 'An icon in the footer of every page opens one of these. Paste the address from the browser: the rest is dropped, because ?hl=en and ?viewAsMember=true say where the visitor came from, not who we are.'),
        ...SOCIAL.map((item) => [
          field({
            path: `social.${item.key}`,
            label: item.name,
            hint: item.example,
            type: 'url',
            inputmode: 'url',
            placeholder: item.example,
            parse: (value) => value.trim(),
            // On leaving the field the address is shown the way the site will
            // publish it, so the review lists that and not what was pasted.
            format: (value) => cleanProfile(value),
            tidyOnBlur: true,
          }),
          preview(item.key),
        ]),
      ),
      panel('WhatsApp',
        h('p', { class: 'panel__text' }, 'The WhatsApp icon is the person line, so it is set on Lines with the other numbers. Briefs and estimates go to that line, never to the chatbot.'),
      ),
    );

    const sync = () => {
      for (const note of body.querySelectorAll('[data-social]')) {
        const value = app.draft.social?.[note.dataset.social] ?? '';
        fill(note, value ? 'The footer will link to ' : 'Empty, so the icon has nowhere to go.', value ? external(value, value.replace(/^https:\/\//, '')) : null, value ? '.' : null);
      }
    };
    sync();
    return { sync };
  },

  prices(body) {
    const groups = [...new Set(PRICES.map((item) => item.group))];
    const sample = h('div', { class: 'sample' });

    add(body,
      ...groups.map((group) =>
        panel(group,
          h('div', { class: 'grid' },
            PRICES.filter((item) => item.group === group).map((item) =>
              field({
                path: `prices.${item.key}`,
                label: item.name,
                hint: item.note,
                prefix: 'TSh',
                inputmode: 'numeric',
                // Digits only: "350,000" and "350 000" both mean 350000. Anything else is not a price.
                parse: (value) => (/^[\d\s,.]+$/.test(value.trim()) ? Number(value.replace(/\D/g, '')) : Number.NaN),
                format: (value) => (Number.isInteger(value) ? formatAmount(value) : ''),
                tidyOnBlur: true,
              }),
            ),
          ),
        ),
      ),
      panel('What the estimator will say', sample,
        h('p', { class: 'muted' }, 'The rules do not change here: 10% off three or more add-ons, a contingency of 15% plus 1.5% per point of complexity, VAT at 18% when asked for.')),
    );

    const sync = () => {
      const prices = app.draft.prices;
      if (!PRICES.every(({ key }) => Number.isInteger(prices[key]) && prices[key] > 0)) {
        fill(sample, h('p', { class: 'muted' }, 'Fix the prices above to see the estimate.'));
        return;
      }
      const { estimate } = createEstimator(prices);
      const row = (title, result, extra = '') =>
        h('div', { class: 'sample__row' },
          h('p', { class: 'sample__title' }, title),
          h('p', { class: 'sample__range' }, `${compact(result.low)} to ${compact(result.high)}`),
          h('p', { class: 'muted' }, `About ${result.weeks[0]} to ${result.weeks[1]} weeks, complexity ${result.complexity} of 10.${extra}`),
        );
      const full = estimate({ kind: 'app', addOns: ['mpesa', 'booking', 'offline'], vat: true, support: 'tunza' });
      fill(sample,
        row('A website with nothing added', estimate({ kind: 'website' })),
        row('An app with payments, booking and offline sync', full, ` ${shillings(full.total)} with VAT, then ${shillings(full.plan.monthly)} a month.`),
        row('A business system with all six add-ons', estimate({ kind: 'system', addOns: ['mpesa', 'bilingual', 'booking', 'offline', 'notifications', 'training'] })),
      );
    };
    sync();
    return { sync };
  },

  backgrounds(body) {
    const tally = h('p', { class: 'muted' });
    const groups = [...PAGES, { key: 'all', name: 'Every page' }];

    const choice = (section) => {
      const path = `backgrounds.${section.key}`;
      const note = h('p', { class: 'field__note' });
      const element = h('div', { class: 'choice' },
        h('p', { class: 'choice__name', id: `c-${section.key}` }, section.name),
        h('div', { class: 'segments', role: 'radiogroup', 'aria-labelledby': `c-${section.key}` },
          BACKGROUNDS.map((mode) =>
            h('label', { class: 'segment' },
              h('input', {
                type: 'radio',
                name: path,
                value: mode.key,
                checked: (app.draft.backgrounds[section.key] ?? 'effect') === mode.key,
                onchange: () => {
                  set(app.draft, path, mode.key);
                  changed();
                },
              }),
              h('span', null, mode.name),
            ),
          ),
        ),
        note,
      );
      app.fields.set(path, { element, input: null, note });
      return element;
    };

    add(body,
      panel('What each one is',
        h('dl', { class: 'legend' },
          BACKGROUNDS.map((mode) => [h('dt', null, h('span', { class: `swatch swatch--${mode.key}`, 'aria-hidden': 'true' }), mode.name), h('dd', null, mode.note)])),
        h('p', { class: 'muted' },
          'A section takes over when its top passes the middle of the screen, and the chart fades to that section\'s setting. In a plain section the chart stops drawing altogether, which also saves battery on a phone. The row of selected work on the home page keeps the chart: each project there has its own look.'),
        tally,
      ),
      ...groups.map((page) => {
        const own = SECTIONS.filter((section) => section.page === page.key);
        return own.length ? panel(page.name, h('div', { class: 'choices' }, own.map(choice))) : null;
      }),
    );

    const sync = () => {
      const count = (mode) => SECTIONS.filter(({ key }) => (app.draft.backgrounds[key] ?? 'effect') === mode).length;
      tally.textContent = `Now: ${count('effect')} with the chart, ${count('soft')} soft, ${count('plain')} plain.`;
    };
    sync();
    return { sync };
  },

  search(body) {
    const index = h('input', {
      type: 'checkbox',
      id: 'f-seo-index',
      checked: app.draft.seo.index === true,
      onchange: () => {
        set(app.draft, 'seo.index', index.checked);
        changed();
      },
    });
    const indexNote = h('p', { class: 'field__note' });
    const indexState = h('p', { class: 'panel__text' });
    const indexField = h('div', { class: 'field' },
      h('label', { class: 'switch', for: 'f-seo-index' }, index, h('span', { class: 'switch__track', 'aria-hidden': 'true' }), h('span', null, 'Let search engines list this site')),
      indexNote,
    );
    app.fields.set('seo.index', { element: indexField, input: index, note: indexNote });

    const measure = (text) => expand(text, app.draft).trim();
    const snippets = new Map();

    add(body,
      panel('Listing', indexField, indexState),
      panel('Address',
        field({ path: 'seo.origin', label: 'Where the site lives', placeholder: 'https://altra-motion-lab.vercel.app', parse: (value) => value.trim(),
          hint: 'Used for the canonical address of every page, the sitemap and link previews. Change it when the site moves to its own domain.' }),
      ),
      ...PAGES.map((page) => {
        const snippet = h('div', { class: 'snippet', 'aria-hidden': 'true' },
          h('p', { class: 'snippet__url' }), h('p', { class: 'snippet__title' }), h('p', { class: 'snippet__text' }));
        snippets.set(page, snippet);
        return panel(page.name,
          field({ path: `seo.pages.${page.key}.title`, label: 'Title', counter: { best: LIMITS.title.best, measure } }),
          field({ path: `seo.pages.${page.key}.description`, label: 'Description', rows: 3, counter: { best: LIMITS.description.best, measure } }),
          h('p', { class: 'field__hint' }, 'How it can look in results:'),
          snippet,
        );
      }),
      panel('Quoting a price',
        h('p', { class: 'panel__text' }, 'Write ', h('code', null, '{{site.price.starter}}'), ' in a title or a description and the current price is put there, so the text stays right when the price changes. The names are: ',
          PRICES.map((item, at) => [at ? ', ' : '', h('code', null, item.key)]), '.'),
      ),
    );

    const sync = () => {
      const listed = app.draft.seo.index === true;
      indexState.textContent = listed
        ? 'Every page will say "index, follow", the build will write sitemap.xml, and robots.txt will point to it. Lighthouse stops marking the pages as blocked.'
        : 'Every page says "noindex", so search engines leave the site out. The titles, descriptions, canonical addresses and structured data below are still written, ready for the day this is switched on. Lighthouse counts noindex as a failed check, and that one check holds the SEO score down.';
      const host = String(app.draft.seo.origin ?? '').replace(/^https?:\/\//, '');
      for (const [page, snippet] of snippets) {
        const [url, title, text] = snippet.children;
        const entry = app.draft.seo.pages[page.key] ?? {};
        url.textContent = `${host}${page.path === '/' ? '' : ` › ${page.path.replaceAll('/', '')}`}`;
        title.textContent = measure(entry.title) || 'No title';
        text.textContent = measure(entry.description) || 'No description';
      }
    };
    sync();
    return { sync };
  },

  leads(body) {
    const result = h('p', { class: 'field__note', role: 'status' });
    const test = h('button', {
      class: 'btn btn--quiet',
      type: 'button',
      onclick: async () => {
        const projectId = app.draft.leads.projectId.trim();
        test.disabled = true;
        result.textContent = 'Sending a test record…';
        const record = leadRecord({
          name: 'Test from the Motion Lab admin',
          phone: formatPhone(app.draft.contact.person),
          type: 'Consultation',
          message: 'A test record, sent from the admin of the Motion Lab site to check that briefs reach this inbox. It can be deleted.',
          notes: `Test sent from ${window.location.host}/admin/`,
        });
        const answer = await saveLead(projectId, record);
        result.textContent = answer.ok
          ? `Saved as ${record.refCode}. Open the inbox, find "Test from the Motion Lab admin" and delete it.`
          : explain(answer);
        result.dataset.tone = answer.ok ? 'good' : 'bad';
        sync();
      },
    }, 'Send a test record');
    const state = h('p', { class: 'panel__text' });
    const open = h('p', { class: 'field__hint' });

    add(body,
      panel('Now', state),
      panel('The inbox of the main site',
        h('p', { class: 'panel__text' },
          'The main site keeps its leads in a Firebase project, in a collection called "inquiries" that anyone may add to and only the team may read. With the ID of that project here, a brief sent from this site is added to the same list, with a reference such as #ALT-4821 that is also written into the WhatsApp message.'),
        field({ path: 'leads.projectId', label: 'Firebase project ID', placeholder: 'altraware-1a2b3', parse: (value) => value.trim().toLowerCase(),
          hint: 'Firebase console, the gear beside Project Overview, Project settings, Project ID. It is not a secret: the main site already sends it to every visitor.' }),
        h('div', { class: 'row' }, test, result),
        h('p', { class: 'muted' }, 'The test writes one real record to that project, clearly named as a test. It works before you publish, so you can check the ID first.'),
      ),
      panel('What changes on the site when this is on',
        h('ul', { class: 'bullets' },
          h('li', null, 'The brief form gains a phone number field, and asks for a name and a number before it sends. The inbox needs both.'),
          h('li', null, 'The note under the button says the brief is saved by Altraware, instead of "Nothing is sent to a server".'),
          h('li', null, 'WhatsApp still opens with the message, whether or not the copy was saved. A failed save never blocks a visitor.'),
        ),
      ),
      panel('Reading the briefs',
        field({ path: 'leads.inbox', label: 'Address of the inbox', placeholder: 'https://altra.tanzaniareach.com/admin', parse: (value) => value.trim(),
          hint: 'Only a shortcut for this admin. Briefs are read there, under Leads & Inquiries, with the sign-in the main site already has.' }),
        open,
      ),
    );

    const sync = () => {
      const projectId = String(app.draft.leads.projectId ?? '');
      const usable = Boolean(projectId) && !app.report.errors.some((problem) => problem.path === 'leads.projectId');
      test.disabled = !usable;
      const live = app.saved.leads.projectId;
      state.textContent = live
        ? `On. Briefs open WhatsApp and are also saved in the Firebase project "${live}".`
        : 'Off. A brief opens WhatsApp with the message, and nothing is saved anywhere.';
      const usableInbox = app.draft.leads.inbox && !app.report.errors.some((problem) => problem.path === 'leads.inbox');
      fill(open, usableInbox ? external(app.draft.leads.inbox, 'Open the inbox') : null);
    };
    sync();
    return { sync };
  },

  history(body) {
    const list = h('ol', { class: 'history' });
    const status = h('p', { class: 'muted', role: 'status' }, 'Loading…');
    add(body, panel('', status, list));

    const load = async (commit, button) => {
      button.disabled = true;
      try {
        const { text } = await app.github.read(commit.sha);
        app.draft = tidy(JSON.parse(text));
        changed({ render: false });
        go('overview');
        notify(app.diff.length
          ? `Loaded the version from ${ago(commit.date)}. Nothing is published until you review it and press Publish.`
          : 'That version is the same as what is live.');
      } catch (error) {
        status.textContent = error.hint ?? `That version could not be read: ${error.message}`;
        button.disabled = false;
      }
    };

    const show = (commits) => {
      status.textContent = commits.length ? '' : 'No commits have touched the content file yet.';
      fill(list,
        ...commits.map((commit, at) =>
          h('li', { class: 'history__item' },
            h('div', null,
              h('p', { class: 'history__message' }, commit.message),
              h('p', { class: 'muted' }, `${ago(commit.date)}${commit.author ? ` · ${commit.author}` : ''} · `, external(commit.url, commit.sha.slice(0, 7))),
            ),
            at === 0
              ? h('span', { class: 'chip' }, 'Live')
              : h('button', { class: 'btn btn--quiet', type: 'button', onclick: (event) => load(commit, event.currentTarget) }, 'Load this version'),
          ),
        ),
      );
    };

    commitsOnce().then(show, (error) => {
      status.textContent = error.hint ?? error.message;
    });
    return null;
  },
};

// ---------- History and the last publish ----------

function commitsOnce() {
  app.commits ??= app.github.history().catch((error) => {
    app.commits = null; // ask again next time
    throw error;
  });
  return app.commits;
}

async function lastPublish(target) {
  if (!target) return;
  try {
    const [latest] = await commitsOnce();
    if (!target.isConnected) return;
    target.textContent = latest
      ? `Last publish ${ago(latest.date)}${latest.author ? ` by ${latest.author}` : ''}: ${latest.message}`
      : 'The content file has not been published from here yet.';
  } catch (error) {
    if (target.isConnected) target.textContent = error.hint ?? 'The history could not be read.';
    if (error.status === 401) signOut(error.hint);
  }
}

// ---------- Publishing ----------

function changeList(list, { jump = false } = {}) {
  return h('ul', { class: 'changes' },
    list.map((change) =>
      h('li', { class: 'changes__item' },
        h('span', { class: 'changes__name' }, nameOf(change.path)),
        h('span', { class: 'changes__from' }, showValue(change.path, change.from)),
        h('span', { class: 'changes__arrow', 'aria-hidden': 'true' }, icon('arrow')),
        h('span', { class: 'changes__to' }, showValue(change.path, change.to)),
        jump ? h('button', { class: 'link', type: 'button', onclick: () => go(tabOf(change.path)) }, 'Edit') : null,
      ),
    ),
  );
}

function discardDraft() {
  if (!window.confirm(`Throw away ${app.diff.length === 1 ? 'this change' : `these ${app.diff.length} changes`} and go back to what is live?`)) return;
  app.draft = structuredClone(app.saved);
  changed({ render: false });
  go(app.tab, { focus: false });
}

function openReview() {
  if (app.report.errors.length || !app.diff.length) return;

  const message = h('input', { id: 'commit-message', type: 'text', value: commitMessage(app.diff), maxLength: 120, autocomplete: 'off' });
  const status = h('p', { class: 'field__note', role: 'status' });
  const cancel = h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => dialog.close() }, 'Not yet');
  const confirm = h('button', { class: 'btn', type: 'submit' }, 'Publish');
  const turnsOnListing = app.diff.some((change) => change.path === 'seo.index' && change.to === true);
  const turnsOnLeads = app.diff.some((change) => change.path === 'leads.projectId' && !change.from && change.to);

  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'review-title', onclose: () => dialog.remove() },
    h('form', {
        method: 'dialog',
        onsubmit: async (event) => {
          event.preventDefault();
          confirm.disabled = true;
          cancel.disabled = true;
          status.textContent = 'Sending to GitHub…';
          try {
            await publish(message.value.trim() || commitMessage(app.diff));
            dialog.close();
          } catch (error) {
            if (error.status === 409) {
              status.textContent = await rebase();
            } else {
              status.textContent = error.hint ?? error.message;
              if (error.status === 401) {
                dialog.close();
                signOut(`${error.hint} Your unpublished changes are kept in this tab.`);
                return;
              }
            }
            confirm.disabled = false;
            cancel.disabled = false;
          }
        },
      },
      h('h2', { class: 'dialog__title', id: 'review-title' }, `Publish ${app.diff.length === 1 ? 'this change' : `these ${app.diff.length} changes`}?`),
      changeList(app.diff),
      turnsOnListing ? h('p', { class: 'dialog__warn' }, icon('alert'), 'This lets search engines list the site. It will then appear in results beside the main site.') : null,
      turnsOnLeads ? h('p', { class: 'dialog__warn' }, icon('alert'), 'This starts saving every brief in that Firebase project. Use "Send a test record" on the Leads page first if you have not.') : null,
      h('label', { class: 'field__label', for: 'commit-message' }, 'Note for the history'),
      message,
      h('p', { class: 'muted' }, `A commit to ${app.github.branch} in ${app.who.repo}. The site rebuilds from it in about a minute. Until then, and if the build fails, the version that is live stays up.`),
      status,
      h('div', { class: 'dialog__actions' }, cancel, confirm),
    ),
  );
  document.body.append(dialog);
  dialog.showModal();
}

async function publish(message) {
  const content = tidy(app.draft);
  if (check(content).errors.length) throw new Error('There are still problems to fix.');

  const result = await app.github.write(serialise(content), { sha: app.sha, message });
  app.saved = content;
  app.draft = structuredClone(content);
  app.sha = result.sha;
  app.commits = null;
  changed({ render: false });
  go(app.tab, { focus: false });
  follow(result.commit, result.url);
}

/**
 * Someone else published while this draft was open. Take their version as the
 * new starting point and put only the values edited here on top of it, so
 * nothing of theirs is undone by accident.
 */
async function rebase() {
  try {
    const { text, sha } = await app.github.read();
    const theirs = tidy(JSON.parse(text));
    const mine = changes(app.saved, app.draft);
    const merged = structuredClone(theirs);
    for (const change of mine) set(merged, change.path, change.to);
    app.saved = theirs;
    app.sha = sha;
    app.draft = merged;
    app.commits = null;
    changed({ render: false });
    go(app.tab, { focus: false });
    return 'The file was changed on GitHub while you were editing. Their version has been loaded and your changes kept on top of it. Close this, look at the list again, then publish.';
  } catch (error) {
    return error.hint ?? error.message;
  }
}

/** After a publish: ask what Vercel says about the commit until it is live or has failed. */
function follow(commit, url) {
  const started = Date.now();
  app.build = commit;
  const seeCommit = url ? external(url, 'See the commit') : null;
  notify('Published. Vercel is building the site, which takes about a minute.', 'info', seeCommit);

  const ask = async () => {
    if (app.build !== commit || !app.github) return; // a newer publish took over, or signed out
    let status = { state: 'none' };
    try {
      status = await app.github.deployment(commit);
    } catch (error) {
      if (app.build !== commit) return;
      if (error.status === 403 || error.status === 404) {
        // The publish went through. This token is only not allowed to watch the build.
        notify('Published. This token cannot see the build, so open the site in a minute or two to check it. To follow builds here, give the token "Commit statuses: Read-only".', 'info', seeCommit);
        return;
      }
      // Anything else is a blip. Ask again.
    }
    if (app.build !== commit) return;

    if (status.state === 'success') {
      notify('Live. The site now shows these changes.', 'good', external(`${app.saved.seo.origin}/`, 'Open the site'));
    } else if (status.state === 'failure' || status.state === 'error') {
      notify('The build failed, so the site still shows the version before this one.', 'bad', status.url ? external(status.url, 'See what Vercel says') : seeCommit);
    } else if (Date.now() - started > 6 * 60_000) {
      notify('Published. Vercel has not reported back yet. Look at the site in a minute or two.', 'info', seeCommit);
    } else {
      window.setTimeout(ask, 5000);
    }
  };
  window.setTimeout(ask, 4000);
}

// ---------- Start ----------

async function start() {
  const session = tab.get(SESSION_KEY);
  const fresh = session && Date.now() - session.started < SESSION.longest && Date.now() - session.seen < SESSION.idle;
  if (!fresh) {
    tab.drop(SESSION_KEY);
    showSignIn();
    return;
  }
  fill(root, h('p', { class: 'notice', role: 'status' }, 'Signing in…'));
  try {
    await enter(session);
  } catch (error) {
    signOut(error.hint ?? error.message);
  }
}

start();
