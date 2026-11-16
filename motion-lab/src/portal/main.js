// Studio OS: the studio's desk, and the client's view of the same desk.
//
//   gate       two doors (a password for the preview, Google for the real one)
//   shell      the rail, the search, the account
//   views      overview, projects, clients, invoices, mail, settings
//   data       the desk (store.js), the letters (src/lib/mail/template.js)
//
// One rule holds the roles apart: what a person may see is decided by their
// session, and every list on every screen asks the same three questions —
// projects(), invoices(), clients(). A client's answers are their own records.

import {
  MAIL_ENDPOINT,
  PREVIEW,
  STAGES,
  STUDIO,
  configured,
} from './config.js';
import { money, longDate, shortDate, whenDue, today, amountInWords } from './data.js';
import * as Auth from './auth.js';
import { fill, h, icon } from './dom.js';
import { STATUS, blankInvoice, printSheet, readLogo, sheet, statusOf, totals } from './invoice.js';
import { TEMPLATES } from '../lib/mail/template.js';
import { openDesk } from './store.js';

const gateHost = document.getElementById('gate');
const root = document.getElementById('app');

const app = {
  session: null,
  desk: null,
  view: 'overview',
  params: [],
  query: '',
  draft: null, // the invoice being written
  draftId: '', // which invoice that is, so a change of route starts a new one
  refs: {},
  paper: null,
};

// ---------- Who may see what ----------

const isAdmin = () => app.session?.role === 'admin';
const records = () => app.desk?.state ?? { clients: [], projects: [], invoices: [], meta: {} };
const byId = (list, id) => (list ?? []).find((one) => one.id === id);
const clientOf = (id) => byId(records().clients, id);
const projectOf = (id) => byId(records().projects, id);

/** Everything a client owns, or everything, for the studio. */
const mine = (list) => (isAdmin() ? list : (list ?? []).filter((one) => one.clientId === app.session?.clientId));
const projects = () => mine(records().projects);
const invoices = () => mine(records().invoices);
const clients = () => (isAdmin() ? records().clients : records().clients.filter((one) => one.id === app.session?.clientId));

const sum = (list, of) => (list ?? []).reduce((total, one) => total + (Number(of(one)) || 0), 0);

// ---------- Small things ----------

function toast(message, iconName = 'check') {
  document.querySelector('.toast')?.remove();
  const note = h('p', { class: 'toast', role: 'status' }, icon(iconName), message);
  document.body.append(note);
  window.setTimeout(() => note.remove(), 3600);
}

const chipFor = (status) => {
  const { name, tone } = STATUS[status] ?? STATUS.draft;
  return h('span', { class: `chip chip--${tone}` }, name);
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const firstName = () => (app.session?.who?.name ?? 'Studio').split(' ')[0];

/** A line drawn through the tiles, so a number looks earned. */
function spark(seed) {
  const points = Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin(index * 0.9 + seed) * 5 + Math.sin(index * 0.31 + seed * 2) * 2.4;
    return { x: (index / 13) * 100, y: 17 - wave };
  });
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'kpi__spark');
  svg.setAttribute('viewBox', '0 0 100 22');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', path);
  line.style.setProperty('--len', '220');
  svg.append(line);
  return svg;
}

const head = ({ eyebrow, title, lede, actions = [] }) =>
  h(
    'header',
    { class: 'view__head' },
    h('div', {}, h('p', { class: 'view__eyebrow' }, eyebrow), h('h1', {}, title), lede ? h('p', {}, lede) : null),
    actions.length ? h('div', { class: 'view__actions' }, actions) : null,
  );

// ---------- The way in ----------

function gateError(message) {
  return message;
}

function showGate(message = '') {
  gateHost.hidden = false;
  root.hidden = true;

  const username = h('input', { id: 'gate-user', name: 'username', type: 'text', autocomplete: 'username', placeholder: 'admin', required: true });
  const password = h('input', { id: 'gate-pass', name: 'password', type: 'password', autocomplete: 'current-password', placeholder: '••••••••', required: true });
  const trouble = h('p', { class: 'gate__error', role: 'alert' }, gateError(message));

  const form = h(
    'form',
    {
      onsubmit: (event) => {
        event.preventDefault();
        try {
          const result = Auth.signInWithPassword(username.value, password.value);
          enter(Auth.startSession(result));
        } catch (error) {
          trouble.textContent = error.message;
          password.select();
        }
      },
    },
    h('label', { class: 'field' }, h('span', {}, 'Username'), username),
    h('label', { class: 'field' }, h('span', {}, 'Password'), password),
    trouble,
    h('button', { class: 'btn btn--primary btn--wide', type: 'submit' }, icon('arrow'), 'Open the desk'),
  );

  const google = h(
    'button',
    {
      class: 'btn btn--wide',
      type: 'button',
      disabled: !configured(),
      title: configured() ? 'Sign in with Google' : 'Add the Firebase keys first',
      onclick: async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        trouble.textContent = '';
        try {
          const { who } = await Auth.signInWithGoogle();
          const { role, clientId } = Auth.resolveRole(who, records().clients);
          enter(Auth.startSession({ who, role, clientId }));
        } catch (error) {
          trouble.textContent = error.message;
        } finally {
          button.disabled = !configured();
        }
      },
    },
    icon('google'),
    configured() ? 'Continue with Google' : 'Google (needs the Firebase keys)',
  );

  const asClient = h(
    'button',
    {
      class: 'btn btn--ghost btn--wide',
      type: 'button',
      onclick: () => enter(Auth.startSession(Auth.signInWithPassword(PREVIEW.client.username, PREVIEW.client.password))),
    },
    icon('users'),
    'Look at it as a client',
  );

  fill(
    gateHost,
    h(
      'div',
      { class: 'gate__art' },
      h('div', { class: 'gate__orb gate__orb--one' }),
      h('div', { class: 'gate__orb gate__orb--two' }),
      h('p', { class: 'gate__mark' }, h('span', {}, 'A'), 'Altraware Technology'),
      h(
        'div',
        { class: 'gate__pitch' },
        h('p', { class: 'gate__eyebrow' }, 'Studio OS'),
        h('h1', { class: 'gate__title' }, 'The work, the client, and the ', h('em', {}, 'invoice'), '.'),
        h('p', { class: 'gate__lede' }, 'One desk for every project in flight, and a door of their own for the people it is for.'),
        h(
          'ul',
          { class: 'gate__ticks' },
          ...['Projects and stages', 'Invoices as A4 PDF', 'A client portal', 'Mail that looks like us'].map((word) => h('li', { class: 'gate__tick' }, icon('spark'), word)),
        ),
      ),
      h('p', { class: 'gate__ticks' }, h('span', { class: 'gate__tick' }, h('span', { class: 'mono' }, STUDIO.address[0]))),
    ),
    h(
      'div',
      { class: 'gate__form-wrap' },
      h(
        'div',
        { class: 'gate__card' },
        h('h2', {}, 'Karibu tena.'),
        h('p', {}, 'The studio desk, and the client portal, in one place.'),
        form,
        h('div', { class: 'gate__split' }, 'or'),
        google,
        asClient,
        h(
          'p',
          { class: 'gate__hint gate__hint--preview' },
          'Preview access, until the keys are added:',
          h('br'),
          h('code', {}, PREVIEW.admin.username),
          ' / ',
          h('code', {}, PREVIEW.admin.password),
          ' for the studio · ',
          h('code', {}, PREVIEW.client.username),
          ' / ',
          h('code', {}, PREVIEW.client.password),
          ' for a client.',
        ),
      ),
    ),
  );

  window.setTimeout(() => username.focus(), 60);
}

// ---------- Into the desk ----------

async function enter(session) {
  app.session = session;
  gateHost.hidden = true;
  gateHost.replaceChildren();
  root.hidden = false;
  root.replaceChildren(h('p', { class: 'notice' }, 'Opening the desk…'));

  app.desk = await openDesk(session, () => {
    if (app.session) render();
  });
  // A client's id comes back from Firestore; keep it on the session so every
  // list on every screen narrows the same way.
  if (app.desk.clientId && !session.clientId) session.clientId = app.desk.clientId;
  buildShell();
  render();

  // A Google session is re-established in the background, so the first press
  // of "Send it" already has a token to show the mail route.
  if (session.who?.via === 'google') void Auth.restore();

  if (app.desk.refused) {
    toast('Firestore would not let that account read the desk. Showing the preview records.', 'alert');
  }
}

function signOut() {
  Auth.endSession();
  app.session = null;
  app.desk = null;
  app.draft = null;
  app.draftId = '';
  app.query = '';
  root.replaceChildren();
  showGate('Signed out. The desk is closed.');
}

// ---------- The shell ----------

const NAV = [
  { key: 'overview', name: 'Overview', icon: 'grid' },
  { key: 'projects', name: 'Projects', icon: 'folder' },
  { key: 'clients', name: 'Clients', icon: 'users', admin: true },
  { key: 'invoices', name: 'Invoices', icon: 'receipt' },
  { key: 'mail', name: 'Mail', icon: 'mail', admin: true },
  { key: 'settings', name: 'Settings', icon: 'gear' },
];

function buildShell() {
  const counts = { projects: h('span', { class: 'rail__count' }), invoices: h('span', { class: 'rail__count' }) };
  app.refs = { counts, crumb: h('b'), mode: h('span', { class: `chip chip--${app.desk?.mode === 'cloud' ? 'good' : 'calm'}` }) , view: h('main', { class: 'view' }) };

  const links = NAV.filter((item) => !item.admin || isAdmin()).map((item) =>
    h(
      'a',
      { class: 'rail__link', href: `#/${item.key}`, 'aria-current': app.view === item.key ? 'page' : null, data: { view: item.key } },
      icon(item.icon),
      h('span', {}, item.name),
      counts[item.key] ?? null,
    ),
  );

  const search = h('input', {
    type: 'search',
    placeholder: 'Search the desk',
    'aria-label': 'Search the desk',
    value: app.query,
    oninput: (event) => {
      app.query = event.currentTarget.value;
      render();
    },
  });

  const who = app.session.who;
  const rail = h(
    'aside',
    { class: 'rail', 'aria-label': 'Sections' },
    h(
      'a',
      { class: 'rail__mark', href: '#/overview' },
      h('span', {}, 'A'),
      h('div', {}, h('b', {}, 'Studio OS'), h('small', {}, 'Altraware')),
    ),
    h('nav', { class: 'rail__group rail__group--nav', 'aria-label': 'Studio' }, ...links),
    h(
      'div',
      { class: 'rail__foot' },
      h(
        'div',
        { class: 'rail__who' },
        who.photo ? h('img', { src: who.photo, alt: '' }) : h('span', { class: 'rail__avatar' }, (who.name ?? 'A').slice(0, 1).toUpperCase()),
        h('div', {}, h('b', {}, who.name), h('small', {}, isAdmin() ? 'Studio admin' : 'Client')),
      ),
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: signOut }, icon('out'), 'Sign out'),
    ),
  );

  const topbar = h(
    'header',
    { class: 'topbar' },
    h('nav', { class: 'crumbs', 'aria-label': 'Where you are' }, h('span', {}, 'Studio OS'), h('span', { 'aria-hidden': 'true' }, '/'), app.refs.crumb),
    h('label', { class: 'search' }, icon('spark'), search),
    app.refs.mode,
  );

  fill(root, rail, h('div', { class: 'main' }, topbar, app.refs.view));
  app.refs.mode.textContent = app.desk?.mode === 'cloud' ? 'Firestore · live' : 'Preview desk';
}

/** Counts in the rail, and the name of the page in the top bar. */
function paintShell() {
  const item = NAV.find((one) => one.key === app.view);
  app.refs.crumb.textContent = item?.name ?? 'Overview';
  for (const link of root.querySelectorAll('.rail__link')) {
    const key = link.dataset.view;
    if (key === app.view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const inFlight = projects().filter((one) => one.stage !== 'care').length;
  const due = invoices().filter((one) => ['sent', 'overdue'].includes(statusOf(one))).length;
  if (app.refs.counts.projects) app.refs.counts.projects.textContent = String(inFlight || '');
  if (app.refs.counts.invoices) app.refs.counts.invoices.textContent = String(due || '');
  document.title = `${item?.name ?? 'Overview'} | Studio OS`;
}

function render() {
  if (!app.session || !app.desk || !app.refs.view) return;
  // The address is read first, so the rail and the crumbs already know where
  // the person is when they are painted.
  const view = route();
  paintShell();
  let content;
  try {
    content = view();
  } catch (error) {
    content = h('div', { class: 'view' }, h('p', { class: 'notice' }, `Something on this screen refused: ${error.message}`));
  }
  fill(app.refs.view, content);
}

/** Which screen the hash asks for. Anything unknown is the overview. */
function route() {
  const [key = 'overview', ...rest] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  app.view = NAV.some((item) => item.key === key) || key === 'invoice' ? key : 'overview';
  app.params = rest;
  if (app.view === 'overview') return overviewView;
  if (app.view === 'projects') return projectsView;
  if (app.view === 'clients') return isAdmin() ? clientsView : overviewView;
  if (app.view === 'invoices') return app.params.length ? invoiceView : invoicesView;
  if (app.view === 'invoice') return invoiceView;
  if (app.view === 'mail') return isAdmin() ? mailView : overviewView;
  return settingsView;
}

const go = (path) => {
  location.hash = `#/${path}`;
};

// ---------- Overview ----------

function overviewView() {
  const awaitingList = invoices().filter((one) => ['sent', 'overdue'].includes(statusOf(one)));
  const awaiting = sum(awaitingList, (one) => totals(one).total);
  const paid = invoices().filter((one) => statusOf(one) === 'paid');
  const inFlight = projects().filter((one) => one.stage !== 'care');

  const tiles = isAdmin()
    ? [
        { label: 'In flight', value: String(inFlight.length), note: `of ${projects().length} in the book`, spark: 1 },
        { label: 'Awaiting payment', value: money(awaiting), note: `${awaitingList.length} invoice${awaitingList.length === 1 ? '' : 's'}`, spark: 2 },
        { label: 'Collected', value: money(sum(paid, (one) => totals(one).total)), note: `${paid.length} settled`, spark: 3 },
        { label: 'Clients', value: String(records().clients.length), note: 'on the desk', spark: 4 },
      ]
    : [
        { label: 'Your project', value: projects()[0]?.name ?? 'Being set up', note: projects()[0] ? `stage · ${STAGES.find((one) => one.key === projects()[0].stage)?.name}` : 'we will be in touch', spark: 1 },
        { label: 'Progress', value: `${projects()[0]?.progress ?? 0}%`, note: projects()[0] ? `due ${longDate(projects()[0].due)}` : '', spark: 2 },
        { label: 'Awaiting payment', value: money(awaiting), note: `${awaitingList.length} invoice${awaitingList.length === 1 ? '' : 's'}`, spark: 3 },
        { label: 'Paid to date', value: money(sum(paid, (one) => totals(one).total)), note: `${paid.length} settled`, spark: 4 },
      ];

  const greetingTitle = isAdmin() ? `${greeting()}, ${firstName()}.` : `${greeting()}, ${firstName()}.`;
  const lede = isAdmin()
    ? `${inFlight.length} job${inFlight.length === 1 ? '' : 's'} in flight · ${awaitingList.length} invoice${awaitingList.length === 1 ? '' : 's'} waiting · ${records().clients.length} clients`
    : 'Your work, its stage, and every invoice — the same desk the studio works from.';

  const actions = isAdmin()
    ? [
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => go('invoices/new') }, icon('receipt'), 'New invoice'),
        h('button', { class: 'btn', type: 'button', onclick: () => addProject() }, icon('plus'), 'New project'),
      ]
    : [h('button', { class: 'btn', type: 'button', onclick: () => go('invoices') }, icon('receipt'), 'Your invoices')];

  const pipeline = h(
    'section',
    { class: 'card' },
    h('div', { class: 'card__head' }, h('h2', {}, 'Pipeline'), h('p', {}, 'Where every job stands today')),
    h(
      'div',
      { class: 'card__body' },
      h(
        'div',
        { class: 'pipeline' },
        ...STAGES.map((stage) => {
          const here = projects().filter((one) => one.stage === stage.key);
          return h('div', { class: 'pipeline__stage', style: { cursor: 'pointer' }, onclick: () => go('projects') }, h('b', {}, String(here.length)), h('span', {}, stage.name));
        }),
      ),
    ),
  );

  const workRows = inFlight.slice(0, 5).map((project, index) =>
    h(
      'button',
      { class: 'row', type: 'button', style: { '--i': index }, onclick: () => openProject(project.id) },
      h('span', { class: 'row__dot' }),
      h('div', { class: 'row__main' }, h('b', {}, project.name), h('small', {}, `${clientOf(project.clientId || app.session.clientId)?.name ?? 'Your project'} · ${whenDue(project.due)}`)),
      h('span', { class: 'row__amount' }, `${project.progress}%`),
      h('span', { class: 'chip chip--calm' }, STAGES.find((one) => one.key === project.stage)?.name ?? '—'),
    ),
  );

  const nudge = invoices()
    .filter((one) => ['sent', 'overdue'].includes(statusOf(one)))
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))
    .slice(0, 4)
    .map((invoice, index) =>
      h(
        'button',
        { class: 'row', type: 'button', style: { '--i': index }, onclick: () => go(`invoices/${invoice.id}`) },
        h('span', { class: 'row__dot', style: { background: statusOf(invoice) === 'overdue' ? 'var(--bad)' : 'var(--warn)' } }),
        h('div', { class: 'row__main' }, h('b', {}, invoice.number), h('small', {}, `${clientOf(invoice.clientId)?.name ?? '—'} · ${whenDue(invoice.due)}`)),
        h('span', { class: 'row__amount' }, money(totals(invoice).total)),
        chipFor(statusOf(invoice)),
      ),
    );

  const activity = projects()
    .flatMap((project) => (project.activity ?? []).map((entry) => ({ ...entry, project: project.name })))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 4)
    .map((entry) =>
      h('li', {}, entry.what, h('small', {}, `${entry.project} · ${shortDate(entry.at)}`)),
    );

  return h(
    'div',
    {},
    head({ eyebrow: `Studio desk · ${longDate(today())}`, title: greetingTitle, lede, actions }),
    h(
      'div',
      { class: 'kpis' },
      ...tiles.map((tile, index) =>
        h(
          'article',
          { class: 'kpi', style: { '--i': index } },
          h('p', { class: 'kpi__label' }, tile.label),
          h('p', { class: 'kpi__value' }, tile.value),
          spark(tile.spark),
          h('div', { class: 'kpi__row' }, h('span', {}, tile.note)),
        ),
      ),
    ),
    pipeline,
    h(
      'div',
      { class: 'grid-2' },
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'card__head' }, h('h2', {}, isAdmin() ? 'Work in flight' : 'Your work'), h('p', {}, 'Newest first')),
        workRows.length ? h('div', { class: 'rows' }, ...workRows) : h('p', { class: 'card__body' }, h('span', { class: 'chip chip--calm' }, 'Nothing in flight')),
      ),
      h(
        'div',
        { style: { display: 'grid', gap: '1rem' } },
        h(
          'section',
          { class: 'card' },
          h('div', { class: 'card__head' }, h('h2', {}, 'Needs a nudge'), h('p', {}, isAdmin() ? 'Oldest first' : 'Your open invoices')),
          nudge.length ? h('div', { class: 'rows' }, ...nudge) : h('p', { class: 'card__body' }, h('span', { class: 'chip chip--good' }, 'All settled')),
        ),
        h(
          'section',
          { class: 'card' },
          h('div', { class: 'card__head' }, h('h2', {}, 'Recent'), h('p', {}, 'From the projects')),
          activity.length ? h('ol', { class: 'timeline', style: { margin: '0 1.15rem 1.15rem' } }, ...activity) : h('p', { class: 'card__body' }, 'Nothing logged yet.'),
        ),
      ),
    ),
  );
}

// ---------- Projects ----------

function projectCard(project, index) {
  return h(
    'button',
    { class: 'ticket', type: 'button', style: { '--i': index }, onclick: () => openProject(project.id) },
    h('b', {}, project.name),
    h('small', {}, clientOf(project.clientId)?.name ?? '—'),
    h('div', { class: 'meter', style: { '--p': `${project.progress}%` } }, h('span')),
    h('small', { style: { marginTop: '0.4rem' } }, `${project.progress}% · ${whenDue(project.due)}`),
  );
}

function projectsView() {
  const query = app.query.trim().toLowerCase();
  const list = projects().filter((one) => !query || `${one.name} ${clientOf(one.clientId)?.name ?? ''}`.toLowerCase().includes(query));

  const actions = isAdmin() ? [h('button', { class: 'btn btn--primary', type: 'button', onclick: () => addProject() }, icon('plus'), 'New project')] : [];

  const board = h(
    'div',
    { class: 'board' },
    ...STAGES.map((stage) => {
      const here = list.filter((one) => one.stage === stage.key);
      return h(
        'section',
        { class: 'column' },
        h('div', { class: 'column__head' }, h('span', {}, stage.name), h('span', {}, String(here.length))),
        h('div', { class: 'column__list' }, ...here.map(projectCard)),
      );
    }),
  );

  return h(
    'div',
    {},
    head({
      eyebrow: 'Projects',
      title: isAdmin() ? 'The book' : 'Your work',
      lede: isAdmin() ? 'Every job, the stage it is at, and how far along it is.' : 'Everything we are building for you, in the open.',
      actions,
    }),
    board,
  );
}

function addProject() {
  const project = {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    clientId: records().clients[0]?.id ?? '',
    name: 'New project',
    stage: 'discovery',
    progress: 0,
    value: 0,
    started: today(),
    due: today(),
    brief: '',
    tasks: [],
    activity: [{ at: today(), what: 'Project opened' }],
  };
  app.desk.save('projects', project);
  toast('Project added. Fill it in.');
  openProject(project.id);
}

function openProject(id) {
  const project = projectOf(id) ?? projects().find((one) => one.id === id);
  if (!project) return;
  const edit = { ...project, tasks: (project.tasks ?? []).map((task) => ({ ...task })), activity: [...(project.activity ?? [])] };
  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': project.name });
  const close = () => {
    drawer.remove();
    render();
  };

  const save = () => {
    app.desk.save('projects', edit);
    toast('Project saved.');
    close();
  };

  const fields = [
    { key: 'name', label: 'Project', type: 'text' },
    { key: 'due', label: 'Due', type: 'date' },
    { key: 'value', label: 'Value (TSh)', type: 'number' },
    { key: 'progress', label: 'Progress %', type: 'number' },
  ];

  const form = h(
    'div',
    { class: 'facts', style: { display: 'grid', gap: '0.2rem' } },
    isAdmin()
      ? h(
          'label',
          { class: 'field' },
          h('span', {}, 'Client'),
          h('select', { value: edit.clientId, oninput: (event) => (edit.clientId = event.currentTarget.value) }, ...records().clients.map((client) => h('option', { value: client.id, selected: client.id === edit.clientId }, client.name))),
        )
      : null,
    ...fields.map((field) =>
      h(
        'label',
        { class: 'field' },
        h('span', {}, field.label),
        h('input', {
          type: field.type,
          value: String(edit[field.key] ?? ''),
          disabled: !isAdmin(),
          oninput: (event) => (edit[field.key] = field.type === 'number' ? Number(event.currentTarget.value) : event.currentTarget.value),
        }),
      ),
    ),
    h(
      'label',
      { class: 'field' },
      h('span', {}, 'Stage'),
      h(
        'select',
        { value: edit.stage, disabled: !isAdmin(), oninput: (event) => (edit.stage = event.currentTarget.value) },
        ...STAGES.map((stage) => h('option', { value: stage.key, selected: stage.key === edit.stage }, stage.name)),
      ),
    ),
    h('label', { class: 'field' }, h('span', {}, 'The brief'), h('textarea', { value: edit.brief ?? '', disabled: !isAdmin(), oninput: (event) => (edit.brief = event.currentTarget.value) })),
  );

  const tasks = h(
    'ul',
    { style: { display: 'grid', gap: '0.45rem' } },
    ...(edit.tasks.length ? edit.tasks : [{ label: 'Nothing listed yet', done: false }]).map((task, index) =>
      h(
        'li',
        { style: { display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.84rem', color: task.done ? 'var(--ink-dim)' : '#e6ecf9' } },
        h('input', {
          type: 'checkbox',
          checked: task.done,
          disabled: !isAdmin() || !edit.tasks.length,
          onchange: (event) => {
            edit.tasks[index].done = event.currentTarget.checked;
            edit.progress = Math.round((edit.tasks.filter((one) => one.done).length / Math.max(1, edit.tasks.length)) * 100);
            app.desk.save('projects', edit);
            close();
          },
        }),
        h('span', { style: { textDecoration: task.done ? 'line-through' : 'none' } }, task.label),
      ),
    ),
  );

  fill(
    drawer,
    h(
      'div',
      { class: 'drawer__head' },
      h('div', {}, h('p', { class: 'view__eyebrow' }, `Project · ${clientOf(edit.clientId)?.name ?? '—'}`), h('h2', {}, edit.name)),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: close }, icon('close')),
    ),
    h('div', { class: 'meter', style: { '--p': `${edit.progress}%` } }, h('span')),
    form,
    h('section', {}, h('p', { class: 'kpi__label' }, 'Milestones'), tasks),
    h('section', {}, h('p', { class: 'kpi__label', style: { marginBottom: '0.5rem' } }, 'Recent'), h('ol', { class: 'timeline' }, ...edit.activity.slice(0, 5).map((entry) => h('li', {}, entry.what, h('small', {}, shortDate(entry.at)))))),
    h(
      'div',
      { style: { display: 'flex', gap: '0.5rem', marginTop: 'auto' } },
      isAdmin() ? h('button', { class: 'btn btn--primary', type: 'button', onclick: save }, icon('check'), 'Save') : null,
      isAdmin() ? h('button', { class: 'btn', type: 'button', onclick: () => { close(); go('invoices/new'); } }, icon('receipt'), 'Invoice this') : null,
    ),
  );

  document.body.append(drawer);
  drawer.querySelector('input, select, textarea')?.focus();
}

// ---------- Clients ----------

function clientsView() {
  const query = app.query.trim().toLowerCase();
  const list = clients().filter((one) => !query || `${one.name} ${one.trade ?? ''} ${one.contact ?? ''}`.toLowerCase().includes(query));

  const card = (client, index) => {
    const theirProjects = records().projects.filter((one) => one.clientId === client.id);
    const billed = sum(records().invoices.filter((one) => one.clientId === client.id), (one) => totals(one).total);
    const upload = h('input', {
      type: 'file',
      accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
      hidden: true,
      onchange: async (event) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        try {
          const { dataUrl } = await readLogo(file);
          app.desk.save('clients', { ...client, logo: dataUrl });
          toast(`${client.name}: logo saved. It is on the next invoice.`);
        } catch (error) {
          toast(error.message, 'alert');
        }
      },
    });

    return h(
      'article',
      { class: 'client-card', style: { '--i': index } },
      h(
        'div',
        { class: 'client-card__top' },
        h('span', { class: 'logo' }, client.logo ? h('img', { src: client.logo, alt: '' }) : (client.name ?? '?').slice(0, 2).toUpperCase()),
        h('div', {}, h('b', {}, client.name), h('small', {}, client.trade ?? '—')),
      ),
      h(
        'div',
        { class: 'client-card__meta' },
        h('span', { class: 'chip chip--calm' }, `${theirProjects.length} project${theirProjects.length === 1 ? '' : 's'}`),
        h('span', { class: 'chip chip--calm' }, money(billed)),
      ),
      h('p', { style: { fontSize: '0.8rem', color: 'var(--ink-dim)' } }, client.note ?? client.email ?? ''),
      h(
        'div',
        { class: 'client-card__foot' },
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => upload.click() }, icon('upload'), 'Logo'),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => openClient(client.id) }, icon('gear'), 'Edit'),
        upload,
      ),
    );
  };

  return h(
    'div',
    {},
    head({
      eyebrow: 'Clients',
      title: 'Who we build for',
      lede: 'Their logo, their people, and what they have been billed.',
      actions: [h('button', { class: 'btn btn--primary', type: 'button', onclick: () => addClient() }, icon('plus'), 'New client')],
    }),
    list.length ? h('div', { class: 'clients' }, ...list.map(card)) : h('p', { class: 'notice' }, 'No client matches that search.'),
  );
}

function addClient() {
  const client = { id: `c-${Math.random().toString(36).slice(2, 8)}`, name: 'New client', trade: '', contact: '', email: '', phone: '', since: today(), address: '', logo: null, note: '' };
  app.desk.save('clients', client);
  toast('Client added. Add their details and logo.');
  openClient(client.id);
}

function openClient(id) {
  const client = clientOf(id);
  if (!client) return;
  const edit = { ...client };
  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': client.name });
  const close = () => {
    drawer.remove();
    render();
  };

  const fields = [
    ['name', 'Name', 'text'],
    ['trade', 'Trade', 'text'],
    ['contact', 'Person', 'text'],
    ['email', 'Email', 'email'],
    ['phone', 'Phone', 'tel'],
    ['address', 'Address', 'text'],
    ['since', 'Client since', 'date'],
  ];

  const logoInput = h('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
    hidden: true,
    onchange: async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      try {
        const { dataUrl } = await readLogo(file);
        edit.logo = dataUrl;
        preview.replaceChildren(h('img', { src: dataUrl, alt: 'Chosen logo' }));
        toast('Logo ready. Save to keep it.');
      } catch (error) {
        toast(error.message, 'alert');
      }
    },
  });
  const preview = h('span', { class: 'logo', style: { width: '3.4rem', height: '3.4rem' } }, edit.logo ? h('img', { src: edit.logo, alt: '' }) : (edit.name ?? '?').slice(0, 2).toUpperCase());

  fill(
    drawer,
    h(
      'div',
      { class: 'drawer__head' },
      h('div', {}, h('p', { class: 'view__eyebrow' }, 'Client'), h('h2', {}, edit.name)),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: close }, icon('close')),
    ),
    h(
      'div',
      { style: { display: 'flex', gap: '0.8rem', alignItems: 'center' } },
      preview,
      h('button', { class: 'btn', type: 'button', onclick: () => logoInput.click() }, icon('upload'), 'Their logo'),
      edit.logo ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { edit.logo = null; preview.textContent = (edit.name ?? '?').slice(0, 2).toUpperCase(); } }, 'Remove') : null,
      logoInput,
    ),
    h('p', { style: { fontSize: '0.74rem', color: 'var(--ink-dim)' } }, 'PNG, JPG or SVG. Anything large is shrunk to 560 px and kept with the client, so it prints on every invoice.'),
    ...fields.map(([key, label, type]) =>
      h('label', { class: 'field' }, h('span', {}, label), h('input', { type, value: String(edit[key] ?? ''), oninput: (event) => (edit[key] = event.currentTarget.value) })),
    ),
    h('label', { class: 'field' }, h('span', {}, 'Note'), h('textarea', { value: edit.note ?? '', oninput: (event) => (edit.note = event.currentTarget.value) })),
    h(
      'div',
      { style: { display: 'flex', gap: '0.5rem', marginTop: 'auto' } },
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => { app.desk.save('clients', edit); toast('Client saved.'); close(); } }, icon('check'), 'Save'),
      h('button', { class: 'btn', type: 'button', onclick: () => { close(); app.invoiceClient = edit.id; go('invoices/new'); } }, icon('receipt'), 'Invoice'),
    ),
  );

  document.body.append(drawer);
  drawer.querySelector('input')?.focus();
}

// ---------- Invoices ----------

function invoicesView() {
  const query = app.query.trim().toLowerCase();
  const list = invoices()
    .filter((one) => !query || `${one.number} ${clientOf(one.clientId)?.name ?? ''}`.toLowerCase().includes(query))
    .slice()
    .sort((a, b) => String(b.issued).localeCompare(String(a.issued)));

  const counts = { all: list.length };
  for (const key of ['paid', 'sent', 'overdue', 'draft']) counts[key] = list.filter((one) => statusOf(one) === key).length;

  const rows = list.map((invoice, index) => {
    const status = statusOf(invoice);
    const client = clientOf(invoice.clientId);
    return h(
      'button',
      { class: 'row', type: 'button', style: { '--i': index }, onclick: () => go(`invoices/${invoice.id}`) },
      h('span', { class: 'row__dot', style: { background: status === 'overdue' ? 'var(--bad)' : status === 'paid' ? 'var(--good)' : 'var(--violet)' } }),
      h(
        'div',
        { class: 'row__main' },
        h('b', {}, invoice.number, h('span', { style: { color: 'var(--ink-dim)', fontWeight: '400' } }, ` · ${client?.name ?? '—'}`)),
        h('small', {}, `Issued ${longDate(invoice.issued)} · ${invoice.items?.length ?? 0} lines · ${whenDue(invoice.due)}`),
      ),
      h('span', { class: 'row__amount' }, money(totals(invoice).total)),
      chipFor(status),
    );
  });

  const chips = ['all', 'sent', 'overdue', 'paid', 'draft'].map((key) =>
    h(
      'span',
      { class: 'chip chip--calm' },
      `${key === 'all' ? 'All' : STATUS[key].name} · ${counts[key]}`,
    ),
  );

  return h(
    'div',
    {},
    head({
      eyebrow: 'Invoices',
      title: isAdmin() ? 'The book, in figures' : 'What you have been billed',
      lede: isAdmin() ? 'Every invoice, its VAT, and the total in words. Any of them prints as a PDF in one press.' : 'Each one opens on the same paper the studio printed.',
      actions: isAdmin() ? [h('button', { class: 'btn btn--primary', type: 'button', onclick: () => go('invoices/new') }, icon('plus'), 'New invoice')] : [],
    }),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' } }, ...chips),
    h('section', { class: 'card' }, rows.length ? h('div', { class: 'rows' }, ...rows) : h('p', { class: 'card__body' }, 'Nothing here yet.')),
  );
}

function invoiceView() {
  if (!isAdmin()) {
    const invoice = invoices().find((one) => one.id === app.params[0]);
    if (!invoice) return h('div', {}, head({ eyebrow: 'Invoice', title: 'Not on your desk', lede: 'That invoice is not one of yours.' }), h('p', { class: 'notice' }, 'Ask the studio to send it again.'));
    return h('div', {}, head({ eyebrow: invoice.number, title: money(totals(invoice).total), lede: `${clientOf(invoice.clientId)?.name ?? ''} · ${whenDue(invoice.due)}`, actions: [h('button', { class: 'btn btn--gold', type: 'button', onclick: () => printSheet() }, icon('print'), 'Save as PDF')] }), paper(invoice));
  }

  const wantedId = app.params[0] === 'new' || !app.params[0] ? 'new' : app.params[0];
  if (app.draftId !== wantedId) {
    if (wantedId === 'new') {
      app.draft = blankInvoice(records().invoices, app.invoiceClient ?? '');
      app.invoiceClient = '';
    } else {
      const found = records().invoices.find((one) => one.id === wantedId);
      app.draft = found ? JSON.parse(JSON.stringify(found)) : blankInvoice(records().invoices);
    }
    app.draftId = wantedId;
  }

  const draft = app.draft;
  const fresh = !records().invoices.some((one) => one.id === draft.id);
  const summary = h('div', { class: 'totals' });
  const paperHost = h('div', { class: 'paper-scale' });

  const paint = () => {
    const sum = totals(draft);
    fill(
      summary,
      h('div', { class: 'totals__line' }, h('span', {}, 'Subtotal'), h('b', {}, money(sum.subtotal))),
      sum.discount ? h('div', { class: 'totals__line' }, h('span', {}, 'Discount'), h('b', {}, `− ${money(sum.discount)}`)) : null,
      sum.tax ? h('div', { class: 'totals__line' }, h('span', {}, `VAT ${Math.round(sum.taxRate * 100)}%`), h('b', {}, money(sum.tax))) : null,
      h('div', { class: 'totals__line totals__line--grand' }, h('span', {}, 'Total due'), h('b', {}, money(sum.total))),
      h('p', { style: { marginTop: '0.3rem', font: 'italic 400 0.8rem/1.5 var(--font-display)', color: 'var(--ink-dim)' } }, amountInWords(sum.total)),
    );
    const page = sheet(draft, clientOf(draft.clientId), projectOf(draft.projectId));
    fill(paperHost, page);
    app.paper = page;
    requestAnimationFrame(() => fitPaper(paperHost, page));
  };

  const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);
  const onText = (key, cast = (value) => value) => (event) => {
    draft[key] = cast(event.currentTarget.value);
    paint();
  };

  const items = h('div', { class: 'items' });
  const paintItems = () => {
    fill(
      items,
      ...draft.items.map((item, index) =>
        h(
          'div',
          { class: 'item-row' },
          h('input', { type: 'text', placeholder: 'Item and scope', value: item.label ?? '', 'aria-label': `Line ${index + 1} item`, oninput: (event) => { item.label = event.currentTarget.value; paint(); } }),
          h('input', { type: 'number', min: '0', step: '1', value: String(item.qty ?? 1), 'aria-label': `Line ${index + 1} quantity`, oninput: (event) => { item.qty = Number(event.currentTarget.value); paint(); } }),
          h('input', { type: 'number', min: '0', step: '1000', value: String(item.unit ?? 0), 'aria-label': `Line ${index + 1} unit price`, oninput: (event) => { item.unit = Number(event.currentTarget.value); paint(); } }),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Remove line ${index + 1}`, onclick: () => { draft.items.splice(index, 1); paintItems(); paint(); } }, icon('close')),
        ),
      ),
      h('button', { class: 'btn btn--ghost', type: 'button', style: { justifySelf: 'start', marginTop: '0.3rem' }, onclick: () => { draft.items.push({ label: '', detail: '', qty: 1, unit: 0 }); paintItems(); paint(); } }, icon('plus'), 'Add a line'),
    );
  };
  paintItems();

  const save = (then) => {
    app.desk.save('invoices', draft);
    // A first save gives the invoice its own address, so "New invoice" after
    // this one starts a blank page instead of reopening this one.
    if (app.draftId === 'new') {
      app.draftId = draft.id;
      window.history.replaceState(null, '', `#/invoices/${draft.id}`);
    }
    toast(`${draft.number} saved.`);
    if (then) then();
  };

  const form = h(
    'section',
    { class: 'card' },
    h('div', { class: 'card__head' }, h('h2', {}, fresh ? 'A new invoice' : draft.number), h('p', {}, 'Type once; the paper follows')),
    h(
      'div',
      { class: 'card__body builder__form' },
      h(
        'div',
        { class: 'form-row' },
        field('Client', h('select', { value: draft.clientId, oninput: (event) => { draft.clientId = event.currentTarget.value; paint(); } }, h('option', { value: '' }, 'Choose a client'), ...records().clients.map((client) => h('option', { value: client.id, selected: client.id === draft.clientId }, client.name)))),
        field('Project', h('select', { value: draft.projectId, oninput: (event) => { draft.projectId = event.currentTarget.value; paint(); } }, h('option', { value: '' }, 'No project'), ...records().projects.filter((one) => !draft.clientId || one.clientId === draft.clientId).map((one) => h('option', { value: one.id, selected: one.id === draft.projectId }, one.name)))),
      ),
      h(
        'div',
        { class: 'form-row' },
        field('Issued', h('input', { type: 'date', value: draft.issued, oninput: onText('issued') })),
        field('Due', h('input', { type: 'date', value: draft.due, oninput: onText('due') })),
      ),
      h(
        'div',
        { class: 'form-row' },
        field('Reference', h('input', { type: 'text', placeholder: 'PO, LPO, or a note to match', value: draft.reference ?? '', oninput: onText('reference') })),
        field(
          'Status',
          h(
            'select',
            { value: draft.status, oninput: onText('status') },
            ...['draft', 'sent', 'paid'].map((key) => h('option', { value: key, selected: key === draft.status }, STATUS[key].name)),
          ),
        ),
      ),
      h('p', { class: 'kpi__label', style: { marginTop: '1rem' } }, 'Lines'),
      h('div', { class: 'item-head' }, h('span', {}, 'Item'), h('span', { style: { textAlign: 'right' } }, 'Qty'), h('span', { style: { textAlign: 'right' } }, 'Unit'), h('span')),
      items,
      h(
        'div',
        { class: 'form-row', style: { marginTop: '0.9rem' } },
        field('Discount (TSh)', h('input', { type: 'number', min: '0', step: '1000', value: String(draft.discount ?? 0), oninput: onText('discount', Number) })),
        field('VAT', h('select', { value: String(draft.taxRate ?? 0), oninput: (event) => { draft.taxRate = Number(event.currentTarget.value); paint(); } }, h('option', { value: '0.18', selected: Number(draft.taxRate) === 0.18 }, '18% (standard)'), h('option', { value: '0', selected: Number(draft.taxRate) === 0 }, 'None'))),
      ),
      field('Note on the paper', h('textarea', { value: draft.notes ?? '', oninput: onText('notes') })),
      summary,
      h(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' } },
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => save() }, icon('check'), 'Save'),
        h('button', { class: 'btn btn--gold', type: 'button', onclick: () => save(() => window.setTimeout(printSheet, 150)) }, icon('print'), 'Save & PDF'),
        h('button', { class: 'btn', type: 'button', onclick: () => save(() => { app.mailInvoice = draft.id; go('mail'); }) }, icon('mail'), 'Email it'),
      ),
    ),
  );

  return h(
    'div',
    {},
    head({
      eyebrow: `Invoice · ${clientOf(draft.clientId)?.name ?? 'no client yet'}`,
      title: money(totals(draft).total),
      lede: `${draft.number} · ${draft.items.length} line${draft.items.length === 1 ? '' : 's'} · ${whenDue(draft.due)}`,
      actions: [h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => go('invoices') }, icon('arrow'), 'All invoices')],
    }),
    h('div', { class: 'builder' }, form, paper(draft, paperHost)),
  );
}

/** The A4 page, at the size of the column it is in. */
function paper(invoice, host) {
  const page = sheet(invoice, clientOf(invoice.clientId), projectOf(invoice.projectId));
  app.paper = page;
  const scale = host ?? h('div', { class: 'paper-scale' });
  if (!host) fill(scale, page);
  else paintPaperInto(host, page);

  const wrap = h(
    'div',
    { class: 'paper-wrap' },
    h(
      'div',
      { class: 'paper-tools' },
      h('span', { class: 'chip chip--calm' }, 'A4 · 210 × 297 mm'),
      h(
        'div',
        { style: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' } },
        h('button', { class: 'btn btn--gold', type: 'button', onclick: () => printSheet() }, icon('print'), 'Save as PDF'),
        isAdmin() && invoice.id ? h('button', { class: 'btn', type: 'button', onclick: () => { app.mailInvoice = invoice.id; go('mail'); } }, icon('mail'), 'Email') : null,
      ),
    ),
    scale,
    h('p', { style: { fontSize: '0.72rem', color: 'var(--ink-dim)', textAlign: 'center', maxWidth: '26rem' } }, '“Save as PDF” opens the print dialog: choose Save as PDF, and A4, and the studio’s colours are kept. The client’s logo prints where it is drawn above.'),
  );

  const observer = new ResizeObserver(() => fitPaper(scale, app.paper));
  observer.observe(scale);
  window.setTimeout(() => fitPaper(scale, app.paper), 0);
  return wrap;
}

function paintPaperInto(host, page) {
  host.replaceChildren(page);
}

/**
 * 210 mm at 96 dpi is 794 px. The page is shrunk to the column, never enlarged,
 * and on a narrow screen it stops shrinking at 0.62 and is panned instead —
 * a page shrunk to a phone's width cannot be read, and a printed one can.
 */
function fitPaper(scale, page) {
  if (!scale?.isConnected || !page) return;
  const styles = getComputedStyle(scale);
  const room = scale.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const raw = room / 794;
  const fit = raw >= 1 ? 1 : raw < 0.62 && room < 520 ? 0.62 : Math.max(0.3, raw);
  page.style.setProperty('--fit', fit.toFixed(3));
}

// ---------- Mail ----------

function mailView() {
  const clientList = records().clients;
  const chosen = clientOf(app.mailClientId) ?? clientList[0] ?? null;
  const invoiceList = records().invoices.filter((one) => !chosen || one.clientId === chosen.id);
  const invoice = byId(records().invoices, app.mailInvoice) ?? invoiceList[0] ?? null;
  const letter = { template: app.mailTemplate ?? (app.mailInvoice ? 'invoice' : 'welcome') };

  const frame = h('iframe', { class: 'preview-frame', title: 'The mail as it will arrive', sandbox: 'allow-same-origin' });
  const subjectLine = h('p', { class: 'mono', style: { fontSize: '0.78rem', color: 'var(--ink-dim)' } });
  const note = h('p', { class: 'kpi__label', style: { marginTop: '0.8rem' } }, configured() ? 'Ready to send from the studio mailbox.' : 'Preview. Sending needs SMTP keys and a Google sign-in — both are listed in Settings.');

  const facts = () => {
    const target = clientOf(app.mailClientId) ?? clientList[0] ?? null;
    const project = records().projects.find((one) => one.clientId === target?.id);
    const inv = byId(records().invoices, app.mailInvoice) ?? records().invoices.find((one) => one.clientId === target?.id) ?? null;
    return {
      template: app.mailTemplate ?? (app.mailInvoice ? 'invoice' : 'welcome'),
      client: target,
      project,
      invoice: inv,
      totals: inv ? totals(inv) : null,
    };
  };

  const repaint = () => {
    const data = facts();
    const build = TEMPLATES[data.template] ?? TEMPLATES.welcome;
    const rendered = build({
      name: data.client?.contact ?? '',
      client: data.client,
      project: data.project?.name ?? '',
      invoice: data.invoice ? { number: data.invoice.number, due: longDate(data.invoice.due) } : null,
      totals: data.totals,
      who: 'Davie, Altraware',
      site: `${location.origin}`,
      desk: `${location.origin}/portal/`,
    });
    frame.srcdoc = rendered.html;
    subjectLine.textContent = rendered.subject;
    return rendered;
  };
  repaint();

  const select = (label, control) => h('label', { class: 'field' }, h('span', {}, label), control);

  const send = async (event) => {
    const button = event.currentTarget;
    const data = facts();
    const to = data.client?.email;
    if (!to) {
      toast('That client has no email address yet.', 'alert');
      return;
    }
    button.disabled = true;
    note.textContent = 'Sending…';
    try {
      const token = await Auth.idToken();
      if (!token) throw new Error('Sign in with Google first: the mailbox only accepts the studio’s own accounts.');
      const answer = await fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          template: data.template,
          to,
          name: data.client?.contact,
          client: data.client,
          project: data.project?.name,
          invoice: data.invoice ? { number: data.invoice.number, due: longDate(data.invoice.due) } : null,
          totals: data.totals,
        }),
      });
      const reply = await answer.json().catch(() => ({}));
      if (!answer.ok || !reply.ok) throw new Error(reply.reason ?? `The route answered ${answer.status}.`);
      note.textContent = `Sent to ${reply.to}. ${reply.id ? `Mail id ${reply.id}` : ''}`;
      toast('The mail is on its way.');
    } catch (error) {
      note.textContent = /fetch|404|Failed/i.test(error.message)
        ? 'No mail route here. It lives on Vercel at /api/welcome, once the SMTP keys are added.'
        : error.message;
      toast('The mail did not go.', 'alert');
    } finally {
      button.disabled = false;
    }
  };

  const card = h(
    'section',
    { class: 'card' },
    h('div', { class: 'card__head' }, h('h2', {}, 'A letter, not a template'), h('p', {}, 'Written once in src/lib/mail/template.js')),
    h(
      'div',
      { class: 'card__body' },
      select(
        'What is it',
        h(
          'select',
          { value: letter.template, oninput: (event) => { app.mailTemplate = event.currentTarget.value; render(); } },
          h('option', { value: 'welcome', selected: letter.template === 'welcome' }, 'Welcome — the first mail a client gets'),
          h('option', { value: 'invoice', selected: letter.template === 'invoice' }, 'Invoice — the total, its words, and the paper'),
        ),
      ),
      select(
        'Who is it for',
        h(
          'select',
          { value: chosen?.id ?? '', oninput: (event) => { app.mailClientId = event.currentTarget.value; app.mailInvoice = ''; render(); } },
          ...clientList.map((client) => h('option', { value: client.id, selected: client.id === chosen?.id }, `${client.name} — ${client.email || 'no email'}`)),
        ),
      ),
      letter.template === 'invoice'
        ? select(
            'Which invoice',
            h(
              'select',
              { value: invoice?.id ?? '', oninput: (event) => { app.mailInvoice = event.currentTarget.value; render(); } },
              ...invoiceList.map((one) => h('option', { value: one.id, selected: one.id === invoice?.id }, `${one.number} — ${money(totals(one).total)}`)),
            ),
          )
        : null,
      h('div', { style: { marginTop: '1rem', padding: '0.8rem', border: '1px solid var(--line)', borderRadius: '0.7rem', background: 'rgba(0,0,0,0.18)' } }, h('p', { class: 'kpi__label' }, 'Subject'), subjectLine),
      h('button', { class: 'btn btn--primary btn--wide', type: 'button', onclick: send }, icon('mail'), 'Send it'),
      note,
    ),
  );

  return h(
    'div',
    {},
    head({ eyebrow: 'Mail', title: 'Letters that look like us', lede: 'The welcome mail, and the invoice mail, exactly as they arrive in a client’s inbox.' }),
    h('div', { class: 'mails' }, card, h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', {}, 'As it arrives'), h('p', {}, 'Live preview')), h('div', { class: 'card__body' }, frame))),
  );
}

// ---------- Settings ----------

function settingsView() {
  const row = (label, value, tone = 'calm') =>
    h('div', { class: 'fact' }, h('dt', {}, label), h('dd', {}, h('span', { class: `chip chip--${tone}` }, value)));

  const keys = [
    ['VITE_FIREBASE_API_KEY', 'Google sign-in and Firestore'],
    ['VITE_FIREBASE_AUTH_DOMAIN', 'the same project'],
    ['VITE_FIREBASE_PROJECT_ID', 'the same project'],
    ['VITE_ADMIN_EMAILS', 'who sees every client'],
    ['FIREBASE_API_KEY', 'the server, to check a sign-in'],
    ['SMTP_HOST · SMTP_PORT · SMTP_USER · SMTP_PASS · SMTP_FROM', 'the mailbox'],
    ['ADMIN_EMAILS', 'who may send mail'],
    ['SITE_ORIGIN', 'the desk’s own address, in links'],
  ];

  return h(
    'div',
    {},
    head({ eyebrow: 'Settings', title: 'What the desk is made of', lede: 'The keys it waits for, and the way out.' }),
    h(
      'div',
      { class: 'grid-2' },
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'card__head' }, h('h2', {}, 'Connections'), h('p', {}, 'Read from this build')),
        h(
          'div',
          { class: 'card__body' },
          h(
            'dl',
            { class: 'facts' },
            row('Records', app.desk?.mode === 'cloud' ? 'Firestore, live' : 'This device (preview)', app.desk?.mode === 'cloud' ? 'good' : 'calm'),
            row('Google sign-in', configured() ? 'In the build' : 'Not in the build', configured() ? 'good' : 'warn'),
            row('Admin addresses', (import.meta.env.VITE_ADMIN_EMAILS ?? '').trim() || 'not set', (import.meta.env.VITE_ADMIN_EMAILS ?? '').trim() ? 'good' : 'warn'),
            row('Mail route', 'POST /api/welcome', 'calm'),
            row('Signed in as', app.session.who.email || app.session.who.name, 'calm'),
            row('Role', isAdmin() ? 'Studio admin' : 'Client', isAdmin() ? 'good' : 'calm'),
          ),
          h('p', { style: { marginTop: '1rem', fontSize: '0.8rem', color: 'var(--ink-dim)' } }, 'docs/studio-os.md has the console steps, the Firestore rules and the SMTP settings, in order.'),
        ),
      ),
      h(
        'div',
        { style: { display: 'grid', gap: '1rem' } },
        h(
          'section',
          { class: 'card' },
          h('div', { class: 'card__head' }, h('h2', {}, 'Keys, and what each one turns on'), h('p', {}, 'Set in Vercel')),
          h(
            'div',
            { class: 'card__body' },
            h(
              'ul',
              { style: { display: 'grid', gap: '0.5rem' } },
              ...keys.map(([name, what]) =>
                h(
                  'li',
                  { style: { display: 'grid', gap: '0.1rem', paddingBottom: '0.45rem', borderBottom: '1px solid var(--line)' } },
                  h('code', { style: { font: '500 0.74rem/1.5 var(--font-mono)', color: '#c4b5fd' } }, name),
                  h('span', { style: { fontSize: '0.78rem', color: 'var(--ink-dim)' } }, what),
                ),
              ),
            ),
          ),
        ),
        h(
          'section',
          { class: 'card' },
          h('div', { class: 'card__head' }, h('h2', {}, 'Elsewhere'), h('p', {}, 'The other door')),
          h(
            'div',
            { class: 'card__body', style: { display: 'grid', gap: '0.5rem' } },
            app.desk?.mode === 'cloud' && isAdmin() && !records().clients.length
              ? h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { await app.desk.seed(); toast('The four preview clients are in Firestore now.'); } }, icon('upload'), 'Fill the empty desk with the preview records')
              : null,
            h('a', { class: 'btn', href: '/admin/' }, icon('out'), 'The content admin (GitHub)'),
            h('a', { class: 'btn', href: '/' }, icon('out'), 'The site'),
            app.desk?.mode !== 'cloud'
              ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { app.desk.reset(); toast('The preview desk is back to its four clients.'); } }, icon('spark'), 'Reset the preview records')
              : null,
            h('button', { class: 'btn btn--ghost', type: 'button', onclick: signOut }, icon('out'), 'Sign out'),
          ),
        ),
      ),
    ),
  );
}

// ---------- Boot ----------

window.addEventListener('hashchange', () => {
  if (app.session) render();
});

// Signed in, and then idle: the session is dropped after half an hour, and the
// desk is closed rather than left open on a shared laptop.
window.addEventListener('pointerdown', () => Auth.touchSession());
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') document.querySelector('.drawer')?.remove();
  Auth.touchSession();
});

const existing = Auth.readSession();
if (existing) enter(existing);
else showGate();

export { render, showGate };
