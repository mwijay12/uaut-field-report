// An invoice: the arithmetic, the page it is printed on, and the two things
// that make it look like the studio rather than a template — the client's own
// logo, and the total said again in words.
//
// The page is a real A4 sheet (210 by 297 mm) drawn in millimetres, so what is
// on screen is what comes out of "Save as PDF". No library, no second file:
// the browser's own print is the PDF writer, and @media print in portal.css
// leaves nothing on the paper but this.

import { STUDIO, STAGES } from './config.js';
import { addDays, amountInWords, longDate, money, monogram, today } from './data.js';
import { h } from './dom.js';

// ---------- The arithmetic ----------

/** What one invoice adds up to. Every screen shows these, and only these. */
export function totals(invoice) {
  const lines = (invoice?.items ?? []).map((item) => ({
    ...item,
    amount: Math.max(0, Math.round((Number(item.qty) || 0) * (Number(item.unit) || 0))),
  }));
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const discount = Math.min(Math.max(0, Math.round(Number(invoice?.discount) || 0)), subtotal);
  const net = subtotal - discount;
  const taxRate = Math.max(0, Number(invoice?.taxRate) || 0);
  const tax = Math.round(net * taxRate);
  return { lines, subtotal, discount, net, taxRate, tax, total: net + tax };
}

/** The next number in the book: INV-2026-019 after INV-2026-018. */
export function nextNumber(invoices = [], year = new Date().getFullYear()) {
  const most = invoices.reduce((top, invoice) => {
    const found = /^INV-(\d{4})-(\d+)$/.exec(invoice?.number ?? '');
    if (!found || Number(found[1]) !== year) return top;
    return Math.max(top, Number(found[2]));
  }, 0);
  return `INV-${year}-${String(most + 1).padStart(3, '0')}`;
}

/**
 * paid, draft, overdue or sent. "Sent" is not stored as overdue: whether a
 * date has passed changes every morning, so it is worked out when shown.
 */
export function statusOf(invoice) {
  if (invoice?.status === 'paid' || invoice?.status === 'draft') return invoice.status;
  return invoice?.due && invoice.due < today() ? 'overdue' : 'sent';
}

export const STATUS = {
  paid: { name: 'Paid', tone: 'good' },
  sent: { name: 'Awaiting payment', tone: 'warn' },
  overdue: { name: 'Overdue', tone: 'bad' },
  draft: { name: 'Draft', tone: 'calm' },
};

/** A new invoice, filled in the way the studio starts one. */
export function blankInvoice(invoices, clientId = '') {
  const issued = today();
  return {
    id: `i-${Math.random().toString(36).slice(2, 8)}`,
    number: nextNumber(invoices),
    clientId,
    projectId: '',
    issued,
    due: addDays(issued, 14),
    status: 'draft',
    taxRate: STUDIO.vat,
    discount: 0,
    reference: '',
    items: [{ label: '', detail: '', qty: 1, unit: 0 }],
    notes: '',
  };
}

/** "INV-2026-018 — Shule Direct" for the name of a saved PDF. */
export function invoiceFileName(invoice, client) {
  const who = (client?.name ?? 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${(invoice?.number ?? 'invoice').toLowerCase()}-${who}.pdf`;
}

// ---------- The page ----------

const cell = (tag, className, text) => h(tag, className ? { class: className } : {}, text);

/**
 * The whole invoice as an element. `scale` is the width of the column it goes
 * into: an A4 page is 794 px at 96 dpi, and it is shrunk to fit.
 */
export function sheet(invoice, client, project) {
  const sum = totals(invoice);
  const status = statusOf(invoice);
  const stage = STAGES.find((item) => item.key === project?.stage);

  const logo = h('span', { class: 'logo' });
  if (client?.logo) logo.append(h('img', { src: client.logo, alt: `${client.name} logo` }));
  else logo.textContent = (client?.name ?? '?').slice(0, 2).toUpperCase();

  const header = h(
    'header',
    { class: 'sheet__top' },
    h(
      'div',
      { class: 'brandmark' },
      h('div', { class: 'brandmark__glyph', 'aria-hidden': 'true' }, 'A'),
      h('div', {}, h('b', {}, STUDIO.name), h('small', {}, 'Studio OS · Dar es Salaam')),
    ),
    h('div', { class: 'sheet__title' }, h('h1', {}, 'Invoice'), h('p', {}, invoice.number)),
  );

  const meta = h(
    'section',
    { class: 'sheet__meta' },
    h(
      'div',
      {},
      h('h2', {}, 'Billed to'),
      h(
        'div',
        { class: 'logo-well' },
        logo,
        h(
          'div',
          {},
          h('div', { class: 'big' }, client?.name ?? '—'),
          client?.address ? h('p', {}, client.address) : null,
          h('p', { class: 'muted' }, [client?.email, client?.phone].filter(Boolean).join(' · ') || '—'),
        ),
      ),
    ),
    h(
      'div',
      {},
      h('h2', {}, 'Issued'),
      h('div', { class: 'big' }, longDate(invoice.issued)),
      h('p', {}, `Due ${longDate(invoice.due)}`),
      h('p', { class: 'muted' }, invoice.reference ? `Reference ${invoice.reference}` : `Page 1 of 1`),
    ),
    h(
      'div',
      {},
      h('h2', {}, 'From'),
      h('div', { class: 'big' }, STUDIO.name),
      h('p', {}, STUDIO.address[0]),
      h('p', { class: 'muted' }, `${STUDIO.phone} · ${STUDIO.email}`),
    ),
  );

  const table = h(
    'table',
    { class: 'lines' },
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        cell('th', '', 'Item and scope'),
        cell('th', 'num', 'Qty'),
        cell('th', 'num', 'Unit'),
        cell('th', 'num', 'Amount'),
      ),
    ),
    h(
      'tbody',
      {},
      ...sum.lines.map((line) =>
        h(
          'tr',
          {},
          h(
            'td',
            {},
            h('b', {}, line.label || 'Item'),
            line.detail ? h('span', { class: 'detail' }, line.detail) : null,
            project && line === sum.lines[0] ? h('span', { class: 'detail' }, project.name) : null,
          ),
          cell('td', 'num', String(line.qty ?? 1)),
          cell('td', 'num', money(line.unit)),
          cell('td', 'num', money(line.amount)),
        ),
      ),
    ),
  );

  const sumBox = h('div', { class: 'sum' }, h('div', { class: 'sum__line' }, h('span', {}, 'Subtotal'), h('b', {}, money(sum.subtotal))));
  if (sum.discount) sumBox.append(h('div', { class: 'sum__line' }, h('span', {}, 'Discount'), h('b', {}, `− ${money(sum.discount)}`)));
  if (sum.tax) sumBox.append(h('div', { class: 'sum__line' }, h('span', {}, `VAT ${Math.round(sum.taxRate * 100)}%`), h('b', {}, money(sum.tax))));
  sumBox.append(h('div', { class: 'sum__line sum__line--total' }, h('span', {}, 'Total due'), h('b', {}, money(sum.total))));
  if (status === 'paid') sumBox.append(h('div', { class: 'paid-stamp' }, 'Paid'));

  const foot = h(
    'footer',
    { class: 'sheet__foot' },
    h(
      'div',
      {},
      h('h3', {}, 'How to pay'),
      h('p', {}, h('b', {}, `${STUDIO.mobile.name} `), `${STUDIO.mobile.number} — ${STUDIO.mobile.holder}`),
      h('p', {}, h('b', {}, `${STUDIO.bank.name} `), `${STUDIO.bank.account} — ${STUDIO.bank.holder}`),
      h('p', { class: 'muted' }, `Quote ${invoice.number} on the transfer so it can be matched.`),
    ),
    h(
      'div',
      {},
      h('h3', {}, 'Terms'),
      h('p', {}, STUDIO.terms),
      invoice.notes ? h('p', {}, h('b', {}, 'Note · '), invoice.notes) : null,
    ),
  );

  const end = h(
    'div',
    { class: 'sheet__end' },
    h('span', {}, `${STUDIO.name} · ${STUDIO.registration}`),
    h('span', {}, [stage ? stage.name : null, invoice.number].filter(Boolean).join(' · ')),
  );

  return h(
    'article',
    { class: 'sheet', 'aria-label': `Invoice ${invoice.number}` },
    header,
    meta,
    table,
    h(
      'div',
      { class: 'sheet__sum' },
      h('div', { class: 'words' }, h('b', {}, 'In words'), amountInWords(sum.total)),
      sumBox,
    ),
    foot,
    end,
  );
}

/**
 * Prints one invoice. Everything else on the desk is hidden by @media print,
 * so the browser's "Save as PDF" writes this page and nothing else.
 */
export function printSheet() {
  window.print();
}

// ---------- A client's logo ----------

const MAX_EDGE = 560;
const MAX_BYTES = 180_000;

/**
 * Reads a chosen image and hands back a small data URL, so a logo can be kept
 * with its client without a bucket of its own. Big files are shrunk: a logo on
 * a page is 17 mm wide, and 560 px is already more than a printer can use.
 * (For a logo that has to stay sharp at billboard size, upload it to Cloudinary
 * and paste the URL instead — see docs/studio-os.md.)
 */
export function readLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file chosen.'));
    if (!/^image\/(png|jpe?g|svg\+xml|webp|gif)$/.test(file.type)) return reject(new Error('Choose a PNG, JPG, SVG or WebP image.'));
    if (file.size > 6_000_000) return reject(new Error('That image is over 6 MB. Try a smaller one.'));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.onload = () => {
      // An SVG is already small and stays sharp: keep it as it is.
      if (file.type === 'image/svg+xml' && String(reader.result).length < MAX_BYTES) {
        return resolve({ dataUrl: String(reader.result), shrunk: false });
      }
      const image = new Image();
      image.onerror = () => reject(new Error('That image could not be opened.'));
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const paint = canvas.getContext('2d');
        paint.imageSmoothingQuality = 'high';
        paint.drawImage(image, 0, 0, canvas.width, canvas.height);
        let dataUrl = canvas.toDataURL('image/png');
        if (dataUrl.length > MAX_BYTES) {
          // A photograph on white, smaller, rather than a transparent file that
          // is too big to keep with the client.
          paint.globalCompositeOperation = 'destination-over';
          paint.fillStyle = '#ffffff';
          paint.fillRect(0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        }
        resolve({ dataUrl, shrunk: true, width: canvas.width, height: canvas.height });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** The logo a client has, or a monogram drawn from their name. */
export const logoOf = (client) => client?.logo || monogram(client?.name ?? '?');
