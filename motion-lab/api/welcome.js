// POST /api/welcome — the studio's mail, sent from the server.
//
// The browser never holds a mail password. It sends the recipient and the
// facts; this route writes the letter (src/lib/mail/template.js) and hands it
// to the SMTP account named in the environment.
//
// Who may send
//   1. A signed-in studio admin: an Authorization: Bearer <Firebase ID token>,
//      checked with the project's own API key, whose address is in
//      ADMIN_EMAILS. This is how Studio OS sends.
//   2. The studio's own automation: Authorization: Bearer <PORTAL_MAIL_SECRET>,
//      compared in constant time. Nothing else.
//
// Keys, all set in Vercel (never in the repo):
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
//   FIREBASE_API_KEY        the same web key the build uses
//   ADMIN_EMAILS            who is allowed to send, comma separated
//   PORTAL_MAIL_SECRET      optional, for scripts
//   SITE_ORIGIN             https://altra-motion-lab.vercel.app
//
// A missing key answers with 503 and the exact name that is missing, so the
// desk can say what to add instead of "something went wrong".

import { createHash, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { TEMPLATES } from '../src/lib/mail/template.js';

const ORIGIN = (process.env.SITE_ORIGIN || 'https://altra-motion-lab.vercel.app').replace(/\/$/, '');
const DESK = `${ORIGIN}/portal/`;
const MAX_BODY = 64 * 1024; // far more than a welcome mail, far less than a flood

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const emailish = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value ?? '').trim());

/** Equal time, whether the strings match or not. */
function sameSecret(given, expected) {
  if (!given || !expected) return false;
  const a = createHash('sha256').update(String(given)).digest();
  const b = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(a, b);
}

/** Is this Firebase ID token real, and is the person one of the studio's? */
async function firebaseSender(authorization) {
  const key = process.env.FIREBASE_API_KEY;
  if (!key) return { ok: false, reason: 'FIREBASE_API_KEY is not set' };
  const token = authorization.replace(/^Bearer\s+/i, '');
  const answer = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  if (!answer.ok) return { ok: false, reason: 'That sign-in is not valid any more. Sign in again.' };
  const data = await answer.json();
  const email = (data?.users?.[0]?.email ?? '').toLowerCase();
  if (!email) return { ok: false, reason: 'That account has no address on it.' };
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((one) => one.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return { ok: false, reason: 'ADMIN_EMAILS is not set, so no one may send.' };
  if (!allowed.includes(email)) return { ok: false, reason: `${email} may not send from the studio.` };
  return { ok: true, email };
}

async function maySend(req) {
  const authorization = req.headers.authorization ?? '';
  if (!authorization.startsWith('Bearer ')) return { ok: false, status: 401, reason: 'Sign in to send a mail.' };
  if (sameSecret(authorization, `Bearer ${process.env.PORTAL_MAIL_SECRET}`)) return { ok: true, email: 'automation' };
  try {
    return await firebaseSender(authorization);
  } catch (error) {
    return { ok: false, status: 502, reason: `Firebase could not be asked: ${error.message}` };
  }
}

/** The SMTP account, or the name of the key that is missing. */
function transport() {
  const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].filter((key) => !process.env[key]);
  if (missing.length) return { missing };
  const port = Number(process.env.SMTP_PORT);
  return {
    sender: nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // A studio in Dar es Salaam on a slow line: give the greeting time.
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    }),
    from: process.env.SMTP_FROM,
  };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error('That letter is too large for this route.');
  }
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 204, {});
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 405, { ok: false, reason: 'Use POST.' });
  }

  const permission = await maySend(req);
  if (!permission.ok) return json(res, permission.status ?? 403, { ok: false, reason: permission.reason });

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return json(res, 400, { ok: false, reason: error.message });
  }

  const template = TEMPLATES[body.template ?? 'welcome'];
  if (!template) return json(res, 400, { ok: false, reason: `There is no "${body.template}" mail.` });

  const to = String(body.to ?? '').trim();
  if (!emailish(to)) return json(res, 400, { ok: false, reason: 'That is not an email address.' });

  const post = transport();
  if (post.missing) {
    return json(res, 503, {
      ok: false,
      reason: `The studio's mailbox is not set up yet. Add ${post.missing.join(', ')} in Vercel and send again.`,
      missing: post.missing,
    });
  }

  // Only the names the template reads, so a body cannot add a header of its own.
  const facts = {
    name: typeof body.name === 'string' ? body.name.slice(0, 80) : '',
    who: typeof body.who === 'string' ? body.who.slice(0, 60) : 'The studio',
    site: ORIGIN,
    desk: DESK,
    client: body.client && typeof body.client === 'object' ? { name: String(body.client.name ?? '').slice(0, 80), email: String(body.client.email ?? '').slice(0, 120), contact: String(body.client.contact ?? '').slice(0, 80) } : null,
    project: typeof body.project === 'string' ? body.project.slice(0, 120) : '',
    invoice: body.invoice && typeof body.invoice === 'object' ? { number: String(body.invoice.number ?? '').slice(0, 40), due: String(body.invoice.due ?? '').slice(0, 40) } : null,
    totals: body.totals && typeof body.totals === 'object' ? { total: Number(body.totals.total) || 0, subtotal: Number(body.totals.subtotal) || 0, tax: Number(body.totals.tax) || 0, taxRate: Number(body.totals.taxRate) || 0, discount: Number(body.totals.discount) || 0, lines: Array.isArray(body.totals.lines) ? body.totals.lines.slice(0, 30).map((line) => ({ label: String(line.label ?? ''), detail: String(line.detail ?? ''), amount: Number(line.amount) || 0 })) : [] } : null,
  };

  const letter = template(facts);

  try {
    const info = await post.sender.sendMail({
      from: post.from,
      to,
      replyTo: process.env.SMTP_FROM,
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
      headers: {
        'X-Altraware-Studio': body.template ?? 'welcome',
        'X-Entity-Ref-ID': `${Date.now()}`,
      },
    });
    return json(res, 200, { ok: true, id: info.messageId ?? null, to, subject: letter.subject, sentBy: permission.email });
  } catch (error) {
    // The mailbox's own words are more useful than a generic failure.
    const reason = error?.response?.includes('535')
      ? 'The mailbox refused the login. SMTP_USER and SMTP_PASS do not match.'
      : error?.code === 'EAUTH'
        ? 'The mailbox refused the login. Check SMTP_USER and SMTP_PASS.'
        : error?.code === 'ECONNECTION' || error?.code === 'ETIMEDOUT'
          ? `Could not reach ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}. Check the host and the port.`
          : error?.message ?? 'The mail did not go.';
    return json(res, 502, { ok: false, reason });
  }
}
