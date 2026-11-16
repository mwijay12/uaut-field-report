// What content/site.json may hold. One description, read by three things:
// the build (vite.config.js), the site (src/site.js) and the admin (src/admin).
// It has no imports, so it runs the same in Node and in a browser.

export const PAGES = [
  { key: 'home', path: '/', name: 'Home' },
  { key: 'work', path: '/work/', name: 'Work' },
  { key: 'services', path: '/services/', name: 'Services' },
  { key: 'pricing', path: '/pricing/', name: 'Pricing' },
  { key: 'studio', path: '/studio/', name: 'Studio' },
  { key: 'contact', path: '/contact/', name: 'Contact' },
];

// Every section that sets a look for the chart, in page order. The key is the
// section's data-stage. The pinned row of work on the home page is not here:
// it changes its look per project, in src/pages/home.js.
export const SECTIONS = [
  { key: 'home-hero', page: 'home', name: 'Opening' },
  { key: 'home-statement', page: 'home', name: 'What we do' },
  { key: 'home-figures', page: 'home', name: 'Figures' },
  { key: 'home-services', page: 'home', name: 'What we build' },
  { key: 'home-route', page: 'home', name: 'How a project runs' },
  { key: 'home-cta', page: 'home', name: 'Closing call' },

  { key: 'work-hero', page: 'work', name: 'Opening' },
  { key: 'work-faida', page: 'work', name: 'Faida POS' },
  { key: 'work-caretrack', page: 'work', name: 'CareTrack' },
  { key: 'work-uaut', page: 'work', name: 'UAUT Connect' },
  { key: 'work-shule', page: 'work', name: 'Shule Altra' },
  { key: 'work-more', page: 'work', name: 'Five more projects' },
  { key: 'work-cta', page: 'work', name: 'Closing call' },

  { key: 'services-hero', page: 'services', name: 'Opening' },
  { key: 'services-list', page: 'services', name: 'The five services' },
  { key: 'services-serve', page: 'services', name: 'Who we serve' },
  { key: 'services-process', page: 'services', name: 'How a project runs' },
  { key: 'services-cta', page: 'services', name: 'Closing call' },

  { key: 'pricing-hero', page: 'pricing', name: 'Opening' },
  { key: 'pricing-packages', page: 'pricing', name: 'Packages' },
  { key: 'pricing-estimator', page: 'pricing', name: 'Estimator' },
  { key: 'pricing-support', page: 'pricing', name: 'Support plans' },
  { key: 'pricing-faq', page: 'pricing', name: 'Questions' },
  { key: 'pricing-cta', page: 'pricing', name: 'Closing call' },

  { key: 'studio-hero', page: 'studio', name: 'Opening' },
  { key: 'studio-story', page: 'studio', name: 'Story' },
  { key: 'studio-people', page: 'studio', name: 'Who you work with' },
  { key: 'studio-values', page: 'studio', name: 'Four things we hold to' },
  { key: 'studio-paper', page: 'studio', name: 'On paper' },
  { key: 'studio-cta', page: 'studio', name: 'Closing call' },

  { key: 'contact-hero', page: 'contact', name: 'Opening' },
  { key: 'contact-brief', page: 'contact', name: 'The brief' },
  { key: 'contact-reach', page: 'contact', name: 'Reach us directly' },

  { key: 'footer', page: 'all', name: 'Footer, on every page' },
];

// How much of the chart a section shows. `calm` is what the shader gets:
// 0 is the full chart, 1 is the flat page colour with nothing drawn on it.
export const BACKGROUNDS = [
  { key: 'effect', name: 'Chart', calm: 0, note: 'The moving chart, as drawn for that section.' },
  { key: 'soft', name: 'Soft', calm: 0.62, note: 'The chart at about a third of its strength.' },
  { key: 'plain', name: 'Plain', calm: 1, note: 'The flat page colour. Nothing moves behind the text.' },
];

export const PRICES = [
  { key: 'starter', group: 'Packages', name: 'Web Starter', note: 'Also the starting price for a website in the estimator.' },
  { key: 'growth', group: 'Packages', name: 'Growth Business Site' },
  { key: 'portal', group: 'Packages', name: 'Pro Web Portal' },
  { key: 'app', group: 'Packages', name: 'Custom web or mobile app', note: 'Shown as a "from" price.' },
  { key: 'system', group: 'Packages', name: 'Turnkey business system', note: 'Shown as a "from" price.' },

  { key: 'mpesa', group: 'Add-ons', name: 'Payment integration' },
  { key: 'bilingual', group: 'Add-ons', name: 'Kiswahili and English' },
  { key: 'booking', group: 'Add-ons', name: 'Booking and orders' },
  { key: 'offline', group: 'Add-ons', name: 'Offline-first sync' },
  { key: 'notifications', group: 'Add-ons', name: 'Smart notifications' },
  { key: 'training', group: 'Add-ons', name: 'Team training and manuals' },

  { key: 'tunza', group: 'Support, each month', name: 'Essential Support (Tunza)' },
  { key: 'kuza', group: 'Support, each month', name: 'Growth Support (Kuza)' },
];

export const LIMITS = {
  title: { best: 60, most: 110 },
  description: { least: 70, best: 160, most: 320 },
  price: { most: 1_000_000_000 },
};

// The profiles a visitor can follow, and the host each one must live on. The
// footer shows an icon for every one of them, so an empty address is an error
// and not a default: the row would be a link to nowhere.
export const SOCIAL = [
  { key: 'instagram', name: 'Instagram', host: 'instagram.com', example: 'https://www.instagram.com/yourname/' },
  { key: 'linkedin', name: 'LinkedIn', host: 'linkedin.com', example: 'https://www.linkedin.com/company/yourname/' },
];

// ---------- Phone numbers ----------

/** The digits of a number, in international form. 0790 942 616 is read as a Tanzanian number. */
export function phoneDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) ? `255${digits.slice(1)}` : digits;
}

/** +255 790 942 616 */
export function formatPhone(value) {
  const digits = phoneDigits(value);
  if (/^255\d{9}$/.test(digits)) return `+255 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  return digits ? `+${digits}` : '';
}

// ---------- Amounts ----------

/** 350000 -> 350,000 */
export const formatAmount = (value) => Math.round(value).toLocaleString('en-US');

// A title or description can quote a price, so it stays right when the price
// changes: "Packages from TSh {{site.price.starter}}".
const PRICE_TOKEN = /\{\{\s*site\.price\.(\w+)\s*\}\}/g;

/** Replaces every {{site.price.key}} with that price. A key that does not exist is left as it is. */
export function expand(text, content) {
  return String(text ?? '').replace(PRICE_TOKEN, (token, key) =>
    Number.isInteger(content?.prices?.[key]) ? formatAmount(content.prices[key]) : token,
  );
}

// ---------- Checking ----------

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;
// Firebase project IDs: 6 to 30 characters, lower-case letters, digits and hyphens, starting with a letter.
const PROJECT_ID = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
// Text that ends up in HTML attributes. The build escapes it, and it has no reason to hold markup anyway.
const MARKUP = /[<>]/;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isHttps = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * A profile address the way these hosts write it: https, www, no tracking query,
 * a slash at the end. What is pasted from the address bar — ?hl=en,
 * ?viewAsMember=true — is dropped, because it is about the visitor and not
 * about us. Anything that does not parse is left alone for check() to report.
 */
export function cleanProfile(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (url.protocol !== 'https:') return text;
    const host = url.host.replace(/^(www\.|m\.)/i, '').toLowerCase();
    const path = url.pathname.replace(/\/+$/, '');
    return `https://www.${host}${path}/`;
  } catch {
    return text;
  }
}

/**
 * Looks for problems in a content object.
 *   errors  must be fixed: the build refuses them and the admin will not publish them
 *   advice  worth a look, never in the way
 * Each entry is { path: 'seo.pages.home.title', message: '...' }.
 */
export function check(content) {
  const errors = [];
  const advice = [];
  const bad = (path, message) => errors.push({ path, message });
  const hint = (path, message) => advice.push({ path, message });

  if (!isObject(content)) return { errors: [{ path: '', message: 'The content file must hold one JSON object.' }], advice };

  // Contact
  const contact = isObject(content.contact) ? content.contact : {};
  for (const key of ['chatbot', 'person']) {
    const digits = phoneDigits(contact[key]);
    if (!digits) bad(`contact.${key}`, 'Add a phone number.');
    else if (digits.length < 10 || digits.length > 15) bad(`contact.${key}`, 'Write the full number with its country code, like +255 790 942 616.');
  }
  if (phoneDigits(contact.chatbot) && phoneDigits(contact.chatbot) === phoneDigits(contact.person)) {
    hint('contact.person', 'This is the same number as the chatbot. Briefs ask for a written quote, so they should reach a person.');
  }
  if (typeof contact.email !== 'string' || !EMAIL.test(contact.email)) bad('contact.email', 'Add an email address, like name@example.com.');

  // Prices
  const prices = isObject(content.prices) ? content.prices : {};
  for (const { key, name } of PRICES) {
    const value = prices[key];
    if (!Number.isInteger(value)) bad(`prices.${key}`, `${name}: write the price in shillings, digits only.`);
    else if (value <= 0) bad(`prices.${key}`, `${name}: the price must be more than zero.`);
    else if (value > LIMITS.price.most) bad(`prices.${key}`, `${name}: that is more than TSh 1,000,000,000.`);
    else if (value % 1000) hint(`prices.${key}`, `${name}: this is not a round thousand. Check for a slip of the finger.`);
  }
  if (Number.isInteger(prices.starter) && Number.isInteger(prices.growth) && Number.isInteger(prices.portal)) {
    if (!(prices.starter < prices.growth && prices.growth < prices.portal)) {
      hint('prices.growth', 'The three website packages usually rise in price: Starter, Growth, Portal.');
    }
  }
  if (Number.isInteger(prices.tunza) && Number.isInteger(prices.kuza) && prices.tunza >= prices.kuza) {
    hint('prices.kuza', 'Growth Support usually costs more than Essential Support.');
  }

  // Backgrounds
  const backgrounds = isObject(content.backgrounds) ? content.backgrounds : {};
  const modes = new Set(BACKGROUNDS.map((item) => item.key));
  const sections = new Set(SECTIONS.map((item) => item.key));
  for (const [key, value] of Object.entries(backgrounds)) {
    if (!sections.has(key)) bad(`backgrounds.${key}`, `There is no section called "${key}".`);
    else if (!modes.has(value)) bad(`backgrounds.${key}`, `Choose one of: ${[...modes].join(', ')}.`);
  }
  for (const page of PAGES) {
    const own = SECTIONS.filter((item) => item.page === page.key);
    if (own.length && own.every((item) => backgrounds[item.key] === 'plain')) {
      hint(`backgrounds.${own[0].key}`, `Every section of ${page.name} is plain, so that page has no chart at all.`);
    }
  }

  // Search
  const seo = isObject(content.seo) ? content.seo : {};
  if (typeof seo.index !== 'boolean') bad('seo.index', 'Choose whether search engines may list the site.');
  if (typeof seo.origin !== 'string' || !isHttps(seo.origin)) bad('seo.origin', 'Write the address of the site, starting with https://');
  else if (new URL(seo.origin).pathname !== '/' || /[?#]/.test(seo.origin) || seo.origin.endsWith('/')) {
    bad('seo.origin', 'Only the address itself, with nothing after it: https://example.com');
  }
  const pages = isObject(seo.pages) ? seo.pages : {};
  const titles = new Map();
  for (const page of PAGES) {
    const entry = isObject(pages[page.key]) ? pages[page.key] : {};
    for (const field of ['title', 'description']) {
      const path = `seo.pages.${page.key}.${field}`;
      const text = typeof entry[field] === 'string' ? expand(entry[field], content).trim() : '';
      if (!text) bad(path, `${page.name} needs a ${field}.`);
      else if (MARKUP.test(text)) bad(path, 'Plain text only, without < or >.');
      // A price that is itself wrong leaves its token unfilled. That is reported once, at the price.
      else if (/\{\{|\}\}/.test(text.replace(PRICE_TOKEN, (token, key) => (PRICES.some((item) => item.key === key) ? '' : token)))) {
        bad(path, 'Only prices can be quoted, written like {{site.price.starter}}.');
      }
      else if (text.length > LIMITS[field].most) bad(path, `Too long: ${text.length} characters. Keep it under ${LIMITS[field].most}.`);
      else if (text.length > LIMITS[field].best) hint(path, `${text.length} characters. Search results cut it at about ${LIMITS[field].best}.`);
      else if (field === 'description' && text.length < LIMITS.description.least) hint(path, `${text.length} characters. A sentence or two reads better in search results.`);
    }
    const title = typeof entry.title === 'string' ? expand(entry.title, content).trim().toLowerCase() : '';
    if (title && titles.has(title)) hint(`seo.pages.${page.key}.title`, `Same title as ${titles.get(title)}. Each page should have its own.`);
    else if (title) titles.set(title, page.name);
  }

  // Social profiles
  const social = isObject(content.social) ? content.social : {};
  for (const { key, name, host, example } of SOCIAL) {
    const value = typeof social[key] === 'string' ? social[key].trim() : '';
    const path = `social.${key}`;
    if (!value) bad(path, `${name}: add the address, or take the icon out of the footer. ${example}`);
    else if (!isHttps(value)) bad(path, `${name}: write the full address, starting with https:// — ${example}`);
    else {
      const url = new URL(value);
      const server = url.host.replace(/^(www\.|m\.)/i, '').toLowerCase();
      if (server !== host && !server.endsWith(`.${host}`)) bad(path, `${name}: this is not a ${host} address. ${example}`);
      else if (url.pathname.replace(/\/+$/, '') === '') hint(path, `${name}: this is the front page of ${host}. Link the profile itself.`);
      if (url.search || url.hash) hint(path, `${name}: drop the part after the address. It is tracking from your browser, not part of the profile.`);
      if (value !== cleanProfile(value)) hint(path, `${name}: publish it as ${cleanProfile(value)}.`);
    }
  }

  // Leads
  const leads = isObject(content.leads) ? content.leads : {};
  if (typeof leads.projectId !== 'string') bad('leads.projectId', 'Leave it empty, or write the Firebase project ID.');
  else if (leads.projectId && !PROJECT_ID.test(leads.projectId)) {
    bad('leads.projectId', 'A Firebase project ID has 6 to 30 lower-case letters, digits and hyphens, like altraware-1a2b3.');
  }
  if (typeof leads.inbox !== 'string') bad('leads.inbox', 'Leave it empty, or write the address of the inbox.');
  else if (leads.inbox && !isHttps(leads.inbox)) bad('leads.inbox', 'Write the full address, starting with https://');

  return { errors, advice };
}

/** A tidy copy: numbers formatted, text trimmed, every section given a background. Unknown keys are kept. */
export function tidy(content) {
  const copy = structuredClone(content);
  copy.contact ??= {};
  for (const key of ['chatbot', 'person']) copy.contact[key] = formatPhone(copy.contact[key]);
  copy.contact.email = String(copy.contact.email ?? '').trim();

  copy.backgrounds ??= {};
  copy.backgrounds = Object.fromEntries(SECTIONS.map(({ key }) => [key, copy.backgrounds[key] ?? 'effect']));

  copy.seo ??= {};
  copy.seo.origin = String(copy.seo.origin ?? '').trim();
  copy.seo.pages ??= {};
  for (const page of PAGES) {
    const entry = (copy.seo.pages[page.key] ??= {});
    entry.title = String(entry.title ?? '').trim();
    entry.description = String(entry.description ?? '').trim();
  }

  copy.social ??= {};
  for (const { key } of SOCIAL) copy.social[key] = cleanProfile(copy.social[key]);

  copy.leads ??= {};
  copy.leads.projectId = String(copy.leads.projectId ?? '').trim();
  copy.leads.inbox = String(copy.leads.inbox ?? '').trim();
  return copy;
}

/** The text of the file as the admin saves it: two spaces, one trailing newline. */
export const serialise = (content) => `${JSON.stringify(content, null, 2)}\n`;
