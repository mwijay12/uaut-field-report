// The studio's mail, written once and used twice: by api/welcome.js to send it,
// and by Studio OS to show exactly what will go out. No framework and no
// templating language — a function that returns a string, so what is previewed
// is byte for byte what is sent.
//
// Email clients are not browsers. So: tables for the layout, styles written on
// the elements, no external font, no background image, and a dark header that
// still reads when a client strips the colour.

import { amountInWords as words } from '../../portal/data.js';

const BRAND = 'Altraware Technology';
const INK = '#0a1735';
const SOFT = '#5b6785';
const PAPER = '#f4f6fb';
const VIOLET = '#7c3aed';

const esc = (text) =>
  String(text ?? '').replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

const money = (value) => `TSh ${Math.round(Number(value) || 0).toLocaleString('en-GB')}`;

/** The shell both mails share: a dark head, a paper body, a quiet foot. */
function shell({ preheader, title, kicker, body, footerNote, site = 'https://altra-motion-lab.vercel.app' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};padding:28px 14px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px -42px rgba(10,23,53,0.55);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

      <!-- The head: the studio, and the one thing this mail is about. -->
      <tr>
        <td style="padding:30px 34px 26px;background:${INK};background-image:linear-gradient(135deg,#0a1735 0%,#1b1064 62%,#3b1a8f 100%);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:40px;height:40px;background:#7c3aed;border-radius:11px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:bold;text-align:center;vertical-align:middle;">A</td>
                    <td style="padding-left:12px;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.02em;">
                      ${BRAND}
                      <div style="color:#b9c2dc;font-size:10px;font-weight:400;letter-spacing:0.18em;text-transform:uppercase;padding-top:3px;">Studio OS</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" style="color:#f5c518;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;vertical-align:middle;">${esc(kicker)}</td>
            </tr>
          </table>
          <div style="padding-top:26px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.2;letter-spacing:-0.02em;">${esc(title)}</div>
        </td>
      </tr>

      <!-- The body. -->
      <tr><td style="padding:30px 34px 8px;color:${INK};font-size:15px;line-height:1.62;">${body}</td></tr>

      <!-- The foot: who wrote, how to answer, and what this is. -->
      <tr>
        <td style="padding:24px 34px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e3e8f2;">
            <tr><td style="padding-top:18px;color:${SOFT};font-size:12px;line-height:1.7;">
              ${footerNote ? `<p style="margin:0 0 12px;">${footerNote}</p>` : ''}
              <b style="color:${INK};">${BRAND}</b> · Dar es Salaam, Tanzania<br />
              <a href="tel:+255790942616" style="color:${INK};text-decoration:none;">+255 790 942 616</a> ·
              <a href="mailto:altrawaretechnology@gmail.com" style="color:${INK};text-decoration:none;">altrawaretechnology@gmail.com</a><br />
              <a href="${esc(site)}" style="color:${VIOLET};text-decoration:none;">${esc(site.replace(/^https?:\/\//, ''))}</a>
            </td></tr>
          </table>
          <p style="margin:14px 0 0;color:#98a2b8;font-size:10px;line-height:1.6;letter-spacing:0.04em;">Rooted at home. Engineered for the world.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** A row of three things the client gets, drawn as a table so it holds up. */
function steps(items) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;">
    ${items
      .map(
        (item, index) => `<tr>
      <td style="width:30px;vertical-align:top;padding:${index ? '14px' : '0'} 0 0;">
        <div style="width:24px;height:24px;border-radius:8px;background:#f0ebfe;color:${VIOLET};font-size:12px;font-weight:700;text-align:center;line-height:24px;">${index + 1}</div>
      </td>
      <td style="padding:${index ? '14px' : '0'} 0 0 12px;color:${INK};font-size:14px;line-height:1.55;">
        <b style="font-weight:600;">${esc(item.title)}</b>
        <div style="color:${SOFT};font-size:13px;padding-top:2px;">${esc(item.body)}</div>
      </td>
    </tr>`,
      )
      .join('')}
  </table>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 6px;">
    <tr><td style="border-radius:12px;background:${VIOLET};">
      <a href="${esc(href)}" style="display:inline-block;padding:13px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

/**
 * The welcome: the first thing a new client reads.
 *
 *   welcomeEmail({ name, client, project, who, site, desk })
 */
export function welcomeEmail({ name, client, project, who = 'The studio', site = 'https://altra-motion-lab.vercel.app', desk = `${site}/portal/` }) {
  const person = name || client?.contact || 'there';
  const subject = `${person.split(' ')[0]}, karibu — ${client?.name ?? 'your project'} is with Altraware`;
  const body = `
    <p style="margin:0 0 14px;">Karibu ${esc(person.split(' ')[0])},</p>
    <p style="margin:0 0 14px;color:${SOFT};">
      Thank you for trusting ${BRAND} with <b style="color:${INK};">${esc(project || 'your project')}</b>.
      Everything from here lives in one place, and you can see it yourself at any hour.
    </p>
    ${steps([
      { title: 'Your desk is open', body: 'Sign in with this address and Google. Your project, its stage and its invoices are there.' },
      { title: 'One person answers', body: `${who} writes to you here, and replies on WhatsApp the same day.` },
      { title: 'No surprise on the bill', body: 'Every invoice carries each line, the VAT and the total in words.' },
    ])}
    ${button(desk, 'Open your desk')}
    <p style="margin:16px 0 0;color:${SOFT};font-size:13px;">
      The button signs you in with <b style="color:${INK};">${esc(client?.email ?? 'the address this mail reached')}</b>.
      If it does not open, copy this address into a browser:<br />
      <span style="color:${VIOLET};">${esc(desk)}</span>
    </p>
    <p style="margin:20px 0 0;color:${INK};">Hongera kwa kuanza,<br /><b>${esc(who)}</b></p>`;
  return {
    subject,
    preheader: `Your desk at ${BRAND} is open, and ${project || 'your project'} is already in it.`,
    html: shell({
      preheader: `Your desk at ${BRAND} is open.`,
      title: `Karibu, ${person.split(' ')[0]}.`,
      kicker: 'Welcome',
      body,
      site,
      footerNote: 'You are reading this because you began a project with us. One mail, no list, no newsletter.',
    }),
    text: `Karibu ${person.split(' ')[0]},

Thank you for trusting ${BRAND} with ${project || 'your project'}.

Your desk: ${desk}
Sign in with ${client?.email ?? 'your email'} and Google to see the work, the stage it is at and every invoice.

${who}
${BRAND} · Dar es Salaam
+255 790 942 616 · altrawaretechnology@gmail.com`,
  };
}

/**
 * The invoice, in the post. The paper itself prints from the client's desk; this
 * is the note around it, with the figure they will look for first.
 *
 *   invoiceEmail({ client, project, invoice, totals, who, site })
 */
export function invoiceEmail({ client, project, invoice, totals, who = 'The studio', site = 'https://altra-motion-lab.vercel.app', desk = `${site}/portal/` }) {
  const person = client?.contact || 'there';
  const total = totals?.total ?? 0;
  const due = invoice?.due ?? '';
  const subject = `${invoice?.number ?? 'Invoice'} · ${money(total)} · ${client?.name ?? 'Altraware'}`;
  const row = (label, value, strong = false) =>
    `<tr><td style="padding:7px 0;color:${strong ? INK : SOFT};font-size:${strong ? '15px' : '13px'};${strong ? 'font-weight:600;' : ''}">${esc(label)}</td>
     <td align="right" style="padding:7px 0;color:${strong ? INK : SOFT};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:${strong ? '16px' : '13px'};${strong ? 'font-weight:600;' : ''}">${esc(value)}</td></tr>`;

  const lines = (totals?.lines ?? [])
    .map((line) => `<tr>
      <td style="padding:9px 0;border-top:1px solid #eef1f7;color:${INK};font-size:13px;">
        <b style="font-weight:600;">${esc(line.label || 'Item')}</b>
        ${line.detail ? `<div style="color:${SOFT};font-size:12px;padding-top:2px;">${esc(line.detail)}</div>` : ''}
      </td>
      <td align="right" style="padding:9px 0;border-top:1px solid #eef1f7;color:${SOFT};font-family:ui-monospace,Menlo,monospace;font-size:13px;white-space:nowrap;">${esc(money(line.amount))}</td>
    </tr>`)
    .join('');

  const body = `
    <p style="margin:0 0 14px;">Habari ${esc(person.split(' ')[0])},</p>
    <p style="margin:0 0 18px;color:${SOFT};">
      Here is <b style="color:${INK};">${esc(invoice?.number ?? 'the invoice')}</b> for
      ${esc(project || client?.name || 'the work')}. The paper itself is on your desk, and its figures are below.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};border-radius:14px;padding:4px;">
      <tr><td style="padding:18px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row('Subtotal', money(totals?.subtotal ?? 0))}
          ${totals?.discount ? row('Discount', `− ${money(totals.discount)}`) : ''}
          ${totals?.tax ? row(`VAT ${Math.round((totals.taxRate ?? 0) * 100)}%`, money(totals.tax)) : ''}
          ${row('Total due', money(total), true)}
        </table>
        <div style="padding-top:10px;color:${SOFT};font-size:12px;">${esc(words(total))}</div>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
      ${lines}
    </table>
    ${due ? `<p style="margin:18px 0 0;color:${SOFT};font-size:13px;">Payable by <b style="color:${INK};">${esc(due)}</b> by M-Pesa on +255 790 942 616 or CRDB 0150 4472 9900, quoting ${esc(invoice?.number ?? 'the number')}.</p>` : ''}
    ${button(desk, 'See it on your desk')}
    <p style="margin:16px 0 0;color:${INK};">${esc(who)}</p>`;

  return {
    subject,
    preheader: `${invoice?.number ?? 'Invoice'} · ${money(total)} · payable by ${due || 'the date on the invoice'}.`,
    html: shell({
      preheader: `${invoice?.number ?? 'Invoice'}: ${money(total)}`,
      title: money(total),
      kicker: invoice?.number ?? 'Invoice',
      body,
      site,
      footerNote: 'The invoice prints as an A4 PDF from your desk, with the logo and every line on it — so nothing has to be taken on trust.',
    }),
    text: `${invoice?.number ?? 'Invoice'} — ${money(total)}
${words(total)}

Subtotal ${money(totals?.subtotal ?? 0)}
${totals?.discount ? `Discount − ${money(totals.discount)}\n` : ''}${totals?.tax ? `VAT ${Math.round((totals.taxRate ?? 0) * 100)}% ${money(totals.tax)}\n` : ''}

Payable by ${due || 'the date on the invoice'}.
M-Pesa +255 790 942 616 · CRDB 0150 4472 9900
${desk}
${who} · ${BRAND}`,
  };
}

/** The route's two templates, by name. */
export const TEMPLATES = { welcome: welcomeEmail, invoice: invoiceEmail };
