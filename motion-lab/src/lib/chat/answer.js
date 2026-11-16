// Altra's answer: pick the note that fits the question, and hand back the words
// for the language the visitor is reading.
//
// This is the whole engine, and it is deliberately small. No model, no request,
// no key: a question is compared with the `when` words of every note in
// knowledge.js, and the note that matches best is the answer. A note that wins
// nothing is not guessed at — the fallback says it does not know and offers a
// person on WhatsApp, which is the honest reply and the useful one.
//
// It is a pure module: no DOM, no imports of the site's motion code, so
// `npm run check:chat` can run it in Node with no browser at all.

import { knowledge } from './knowledge.js';

/** The notes are built once per content object, not on every keystroke. */
let cached = { site: null, entries: [] };
function notes(site) {
  if (cached.site !== site) cached = { site, entries: knowledge(site) };
  return cached.entries;
}

/** The notes offered as buttons when the panel opens. */
export const STARTERS = ['services', 'price', 'process', 'start'];

/** Words that are Kiswahili and not English, and the other way round. */
const SWAHILI = new Set(
  `habari mambo hujambo salama niaje asante ahsante karibu nini gani vipi bei gharama kiasi pesa
  shilingi mnatoza mnajenga mnafanya kazi huduma mifumo mfumo tovuti apu muda wiki lini wapi mko
  ofisi saa ngapi nifuate nianze naomba tafadhali ndiyo hapana kwa yetu wetu yako kwako mtu watu
  kuhusu kama lakini pia sana vizuri sawa ndogo kubwa shule kliniki wateja nani wewe mimi sisi nina
  una tuna mna ni za wa ya la cha vya kwenye juu chini je zipi nyingine kiasi mafunzo wafanyakazi
  mnawafunza tunafunza mwanafunzi wanafunzi mwalimu ada mahudhurio mauzo hisa duka maduka biashara
  mradi miradi mnatoa tunatoa mnaweza tunaweza ninaweza ninahitaji tunahitaji nahitaji nataka
  tunataka mnayo hamna hakuna samahani poleni pongezi hongera hadi au ili hivyo vile hapa pale huko
  ndani nje mwezi mwaka leo kesho asubuhi jioni usiku mzuri nzuri mpya zamani kwanza moja mbili tatu
  tano kumi wenu wao ninyi kweli hiyo hilo hii yake zao chake kama wakati mahali hata bado tena
  lazima pengine hasa hiyo jambo mambo kitu vitu huyu huyo wale`
    .split(/\s+/)
    .filter(Boolean),
);
const ENGLISH = new Set(
  'the a an is are do does can could would should what which how when where who why price cost much does website app system services work project time long support internet payment contact email phone hello hi thanks please your you we our and for with about have has need want build built make'.split(
    ' ',
  ),
);

/** Letters and digits only, lower case, no accents: what a comparison can use. */
export function normalise(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Which language the visitor is writing in. Kiswahili first: a question with
 * two Kiswahili words in it is a Kiswahili question, even in a short sentence.
 */
export function detectLanguage(text, fallback = 'en') {
  const words = normalise(text).split(' ').filter(Boolean);
  let sw = 0;
  let en = 0;
  for (const word of words) {
    if (SWAHILI.has(word)) sw += 1;
    else if (ENGLISH.has(word)) en += 1;
  }
  if (sw === 0 && en === 0) return fallback;
  return sw >= 2 || sw > en ? 'sw' : 'en';
}

/** One word matches another: the same, a plural of it, or a longer form of it. */
function alike(a, b) {
  if (a === b) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length >= 4 && long.startsWith(short) && long.length - short.length <= 3) return true;
  return false;
}

/** How much one note fits the question. A phrase is worth more than a word. */
function score(entry, words, padded) {
  let total = 0;
  let hits = 0;
  for (const keyword of entry.when) {
    const parts = keyword.split(' ');
    // One word matches its own forms: system, systems, systematic is too far.
    // More than one word has to appear as that phrase, in that order, or
    // "what do you do" would answer a question about technology.
    const found = parts.length === 1 ? words.some((word) => alike(word, parts[0])) : padded.includes(` ${keyword} `);
    if (!found) continue;
    hits += 1;
    // Two words are worth more than one, and a phrase that appears whole,
    // in order, is worth more again.
    let weight = 3 + parts.length;
    if (parts.length > 1) weight *= 1.5;
    total += weight;
  }
  return hits ? total : 0;
}

/**
 * @typedef {{ label: string, href: string }} Link
 * @typedef {{ id: string, text: string, lang: 'en' | 'sw', go: Link[], chips: { id: string, label: string }[] }} Reply
 */

/**
 * The reply to a question.
 * @param {string} question
 * @param {{ lang?: 'en' | 'sw', site: any, notes?: string }} options
 *        `notes` is anything extra a model would see; the local answer ignores it.
 * @returns {Reply}
 */
export function answer(question, { lang = 'en', site } = {}) {
  const entries = notes(site);
  const words = normalise(question).split(' ').filter(Boolean);
  const padded = ` ${words.join(' ')} `;
  const wanted = detectLanguage(question, lang);

  let best = null;
  let bestScore = 0;
  for (const entry of entries) {
    const value = score(entry, words, padded);
    if (value > bestScore) {
      best = entry;
      bestScore = value;
    }
  }

  if (!best || bestScore < 4) return fallback(wanted, entries, site);
  return reply(best, wanted, entries);
}

/** The reply for a note by name, for a button that asks a fixed question. */
export function replyFor(id, lang, site) {
  const entries = notes(site);
  const entry = entries.find((item) => item.id === id);
  return entry ? reply(entry, lang, entries) : fallback(lang, entries, site);
}

/** The reply for a note, in one language, with the notes worth asking next. */
export function reply(entry, lang, entries) {
  const chips = (entry.next ?? [])
    .map((id) => entries.find((item) => item.id === id))
    .filter((item) => item && item.chip)
    .map((item) => ({ id: item.id, label: item.chip[lang] }));
  return { id: entry.id, text: entry[lang], lang, go: entry.go ?? [], chips };
}

/** The buttons offered when the panel opens, in one language. */
export function starters(lang, site) {
  const entries = notes(site);
  return STARTERS.map((id) => entries.find((item) => item.id === id))
    .filter((item) => item && item.chip)
    .map((item) => ({ id: item.id, label: item.chip[lang] }));
}

/** Every note as one block of text: the context a model would be given. */
export function digest(site, lang = 'en') {
  return notes(site)
    .map((entry) => `- ${entry[lang]}`)
    .join('\n');
}

/** Nothing matched. Say so, and open the shortest way to a person. */
export function fallback(lang, entries, site) {
  const chips = STARTERS.map((id) => entries.find((item) => item.id === id))
    .filter((item) => item && item.chip)
    .map((item) => ({ id: item.id, label: item.chip[lang] }));
  return {
    id: 'unknown',
    lang,
    text:
      lang === 'sw'
        ? 'Sina jibu la hakika kwa hilo, na sipendi kubuni. Nikupeleke kwa mtu wa timu? Tuma brief kwenye ukurasa wa "Anza mradi", au WhatsApp moja kwa moja — bei iliyoandikwa inatoka kwa mtu, sio kwangu.'
        : 'I do not have a reliable answer for that, and I would rather not invent one. The quickest way to a real answer is a person on the team: send the brief on the Start a project page, or open WhatsApp directly. A written quote comes from a person, not from me.',
    go: [
      { label: lang === 'sw' ? 'Anza mradi' : 'Start a project', href: '/contact/' },
      { label: `WhatsApp ${site?.person?.number ?? ''}`.trim(), href: site?.person?.whatsapp ?? '/contact/' },
    ],
    chips,
  };
}
