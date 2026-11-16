// The desk's data: what a project and an invoice look like, the arithmetic
// every screen shares, and the demo desk that is there before any key is.
//
// Everything here is plain JSON so the same objects go into localStorage on a
// first look and into Firestore once Firebase is wired. Nothing is computed on
// read except the totals, so a document is always what was typed.

/** TSh 1,800,000 — the way a person reads a price in Tanzania. */
export function money(value, { sign = false } = {}) {
  const number = Math.round(Number(value) || 0);
  const body = Math.abs(number).toLocaleString('en-GB');
  const mark = number < 0 ? '−' : sign && number > 0 ? '+' : '';
  return `${mark}TSh ${body}`;
}

/** TSh 4.8M — for a tile that has no room for the whole number. */
export function shortMoney(value) {
  const number = Math.round(Number(value) || 0);
  if (Math.abs(number) >= 1_000_000) return `TSh ${(number / 1_000_000).toFixed(number % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(number) >= 1_000) return `TSh ${Math.round(number / 1000)}k`;
  return money(number);
}

// ---------- Numbers written out ----------
// An invoice that says the total twice, once in figures and once in words, is
// harder to alter and easier to read out over the phone. Nothing here is
// clever: the same rules every schoolbook gives.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = [
  [1_000_000_000, 'billion'],
  [1_000_000, 'million'],
  [1_000, 'thousand'],
];

function underThousand(value) {
  const parts = [];
  const hundreds = Math.floor(value / 100);
  let rest = value % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest) {
    if (rest < 20) parts.push(ONES[rest]);
    else parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : ''));
  }
  return parts.join(' ');
}

/** 1250000 → "one million two hundred fifty thousand" */
export function words(value) {
  let number = Math.round(Number(value) || 0);
  if (number === 0) return 'zero';
  if (number < 0) return `minus ${words(-number)}`;
  const parts = [];
  for (const [scale, name] of SCALES) {
    if (number >= scale) {
      const count = Math.floor(number / scale);
      parts.push(`${words(count)} ${name}`);
      number %= scale;
    }
  }
  if (number) parts.push(underThousand(number));
  return parts.join(' ');
}

/** "One million two hundred fifty thousand shillings only." */
export function amountInWords(value) {
  const number = Math.round(Number(value) || 0);
  const body = words(number);
  return `${body.charAt(0).toUpperCase()}${body.slice(1)} shillings only.`;
}

// ---------- Dates ----------
// Dates are kept as "2026-11-02", which sorts, and written out when shown. The
// desk reads them in Dar es Salaam's time, not the browser's.

export const today = () => new Date().toISOString().slice(0, 10);

export function longDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function shortDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

/** How many days from today to that date. Negative when it has passed. */
export function daysUntil(iso) {
  if (!iso) return 0;
  const from = new Date(`${today()}T12:00:00Z`).getTime();
  const to = new Date(`${iso}T12:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "due in 5 days", "5 days late", "due today". */
export function whenDue(iso) {
  const days = daysUntil(iso);
  if (days === 0) return 'due today';
  if (days > 0) return `due in ${days} ${days === 1 ? 'day' : 'days'}`;
  const late = -days;
  return `${late} ${late === 1 ? 'day' : 'days'} late`;
}

// ---------- If a logo is not uploaded ----------
// A client with no logo of their own still needs a mark on an invoice. These
// are drawn in the page, and are replaced the moment a real one is uploaded.

export function monogram(name, { ink = '#10265c', ground = '#eef2fb' } = {}) {
  const letters = String(name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${ground}"/><text x="32" y="41" font-family="Georgia,serif" font-size="26" font-weight="700" fill="${ink}" text-anchor="middle">${letters}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------- The demo desk ----------
// Four clients, four jobs at different stages, four invoices in four states.
// It is here so the desk can be read before any key exists, and it is replaced
// the first time a real one is saved.

export function demoDesk() {
  const clients = [
    {
      id: 'c-shule',
      name: 'Shule Direct',
      trade: 'EdTech · Dar es Salaam',
      contact: 'Amina Mwakalinga',
      email: 'hello@shuledirect.co.tz',
      phone: '+255 754 220 118',
      since: '2025-03-14',
      address: 'Msasani Peninsula, Dar es Salaam',
      logo: monogram('Shule Direct', { ink: '#0b6b4f', ground: '#e7f6ef' }),
      note: 'Learning portal and the teacher side of it.',
    },
    {
      id: 'c-faida',
      name: 'Faida Logistics',
      trade: 'Freight · Dar es Salaam',
      contact: 'Joseph Kimaro',
      email: 'joseph@faidalogistics.co.tz',
      phone: '+255 715 908 442',
      since: '2025-08-02',
      address: 'Kurasini, Dar es Salaam',
      logo: null,
      note: 'Site, WhatsApp ordering, and the tracking page.',
    },
    {
      id: 'c-caretrack',
      name: 'CareTrack',
      trade: 'Health · Arusha',
      contact: 'Dr. Neema Swai',
      email: 'neema@caretrack.co.tz',
      phone: '+255 787 331 020',
      since: '2024-11-19',
      address: 'Njiro Road, Arusha',
      logo: monogram('CareTrack', { ink: '#1e3a8a', ground: '#e8edfb' }),
      note: 'Patient follow-up, offline first, nurses on tablets.',
    },
    {
      id: 'c-kilimo',
      name: 'Kilimo Bora',
      trade: 'Agritech · Morogoro',
      contact: 'Baraka Mushi',
      email: 'baraka@kilimobora.co.tz',
      phone: '+255 762 114 905',
      since: '2026-06-08',
      address: 'Kilosa, Morogoro',
      logo: null,
      note: 'Field app that works with no signal.',
    },
  ];

  const projects = [
    {
      id: 'p-shule-portal',
      clientId: 'c-shule',
      name: 'Learning portal rebuild',
      stage: 'build',
      progress: 62,
      value: 4_850_000,
      started: '2026-09-08',
      due: '2026-12-05',
      brief: 'Three roles, offline lessons, and a teacher dashboard that loads on a 2G phone.',
      tasks: [
        { label: 'Design system and page templates', done: true },
        { label: 'Student sign-in and lesson player', done: true },
        { label: 'Teacher dashboard', done: false },
        { label: 'Content migration (412 lessons)', done: false },
      ],
      activity: [
        { at: '2026-11-11', what: 'Teacher dashboard: filters agreed with Amina' },
        { at: '2026-11-04', what: 'Lesson player handed to their team for review' },
        { at: '2026-10-21', what: 'Design system signed off' },
      ],
    },
    {
      id: 'p-faida-site',
      clientId: 'c-faida',
      name: 'Site and WhatsApp ordering',
      stage: 'launch',
      progress: 88,
      value: 2_150_000,
      started: '2026-08-18',
      due: '2026-11-28',
      brief: 'Six pages, a quote form that lands in their inbox, and WhatsApp on every screen.',
      tasks: [
        { label: 'Pages and copy', done: true },
        { label: 'Quote form and inbox', done: true },
        { label: 'Tracking page', done: true },
        { label: 'Handover and training', done: false },
      ],
      activity: [
        { at: '2026-11-09', what: 'Went live on their domain' },
        { at: '2026-11-02', what: 'Tracking page wired to their sheet' },
      ],
    },
    {
      id: 'p-caretrack',
      clientId: 'c-caretrack',
      name: 'Patient follow-up system',
      stage: 'design',
      progress: 34,
      value: 6_400_000,
      started: '2026-10-14',
      due: '2027-02-12',
      brief: 'Nurses on tablets, appointments that survive a dead zone, and a report for the district.',
      tasks: [
        { label: 'Workflow interviews (three clinics)', done: true },
        { label: 'Screen designs', done: true },
        { label: 'Offline sync design', done: false },
        { label: 'Pilot plan', done: false },
      ],
      activity: [{ at: '2026-11-06', what: 'Screen designs in review with Dr. Neema' }],
    },
    {
      id: 'p-kilimo',
      clientId: 'c-kilimo',
      name: 'Field app, offline first',
      stage: 'discovery',
      progress: 12,
      value: 5_200_000,
      started: '2026-11-05',
      due: '2027-03-30',
      brief: 'Plots, yields and photos, collected where there is no signal and sent when there is.',
      tasks: [
        { label: 'Field visit, Kilosa', done: true },
        { label: 'Data model', done: false },
      ],
      activity: [{ at: '2026-11-05', what: 'Kick-off at their Kilosa office' }],
    },
  ];

  const invoices = [
    {
      id: 'i-018',
      number: 'INV-2026-018',
      clientId: 'c-shule',
      projectId: 'p-shule-portal',
      issued: '2026-11-02',
      due: '2026-11-16',
      status: 'sent',
      taxRate: 0.18,
      discount: 0,
      reference: 'PO-SD-4471',
      items: [
        { label: 'Design system and templates', detail: '16 screens, tokens, components', qty: 1, unit: 1_200_000 },
        { label: 'Portal build, second sprint', detail: 'Student sign-in, lesson player', qty: 1, unit: 1_650_000 },
        { label: 'Content migration', detail: 'Per 100 lessons', qty: 4, unit: 120_000 },
        { label: 'Teacher training', detail: 'Half day, on site', qty: 2, unit: 200_000 },
      ],
      notes: 'Milestone 2 of 3. The teacher dashboard is billed with the next invoice.',
    },
    {
      id: 'i-017',
      number: 'INV-2026-017',
      clientId: 'c-faida',
      projectId: 'p-faida-site',
      issued: '2026-10-20',
      due: '2026-11-03',
      status: 'paid',
      taxRate: 0.18,
      discount: 50_000,
      reference: 'FDL-2026/07',
      items: [
        { label: 'Site build', detail: 'Six pages, quote form, WhatsApp', qty: 1, unit: 1_750_000 },
        { label: 'Tracking page', detail: 'Their sheet, read live', qty: 1, unit: 350_000 },
        { label: 'Care, first three months', detail: '', qty: 3, unit: 90_000 },
      ],
      notes: 'Settled by M-Pesa on 30 October. Thank you.',
    },
    {
      id: 'i-016',
      number: 'INV-2026-016',
      clientId: 'c-caretrack',
      projectId: 'p-caretrack',
      issued: '2026-09-30',
      due: '2026-10-14',
      status: 'sent',
      taxRate: 0.18,
      discount: 0,
      reference: 'CT-PH1',
      items: [
        { label: 'Discovery, three clinics', detail: 'Interviews, workflow map', qty: 1, unit: 1_800_000 },
        { label: 'Screen designs', detail: '24 screens', qty: 1, unit: 2_400_000 },
      ],
      notes: 'Phase one. The offline sync work is on the next invoice.',
    },
    {
      id: 'i-015',
      number: 'INV-2026-015',
      clientId: 'c-kilimo',
      projectId: 'p-kilimo',
      issued: '2026-08-12',
      due: '2026-08-26',
      status: 'paid',
      taxRate: 0.18,
      discount: 0,
      reference: 'KB-114',
      items: [{ label: 'Field research, Kilosa', detail: 'Four days, two facilitators', qty: 1, unit: 1_450_000 }],
      notes: 'Paid on 22 August by bank transfer.',
    },
  ];

  return { clients, projects, invoices, meta: { version: 1, seeded: true } };
}
