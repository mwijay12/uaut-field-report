// What differs between the content that is live and the draft in the admin,
// and how to say it in words.

import { BACKGROUNDS, PAGES, PRICES, SECTIONS, SOCIAL, formatAmount } from '../../content/schema.js';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Every value that differs, as { path, from, to }. Paths look like "prices.starter". */
export function changes(saved, draft) {
  const found = [];
  const walk = (before, after, path) => {
    if (isObject(before) || isObject(after)) {
      const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
      for (const key of keys) walk(before?.[key], after?.[key], path ? `${path}.${key}` : key);
    } else if (before !== after && !(Number.isNaN(before) && Number.isNaN(after))) {
      found.push({ path, from: before, to: after });
    }
  };
  walk(saved, draft, '');
  return found;
}

// Which page of the admin a value is edited on.
const TABS = { contact: 'lines', social: 'social', prices: 'prices', backgrounds: 'backgrounds', seo: 'search', leads: 'leads' };
export const tabOf = (path) => TABS[path.split('.')[0]] ?? 'overview';

/** "Web Starter", "Home · How a project runs", "Pricing title". */
export function nameOf(path) {
  const [group, first, second, third] = path.split('.');
  if (group === 'contact') return { chatbot: 'Chatbot line', person: 'Person line', email: 'Email' }[first] ?? path;
  if (group === 'social') return SOCIAL.find((item) => item.key === first)?.name ?? path;
  if (group === 'prices') return PRICES.find((item) => item.key === first)?.name ?? path;
  if (group === 'backgrounds') {
    const section = SECTIONS.find((item) => item.key === first);
    if (!section) return path;
    const page = PAGES.find((item) => item.key === section.page);
    return page ? `${page.name} · ${section.name}` : section.name;
  }
  if (group === 'seo') {
    if (first === 'index') return 'Search listing';
    if (first === 'origin') return 'Site address';
    if (first === 'pages') return `${PAGES.find((item) => item.key === second)?.name ?? second} ${third}`;
  }
  if (group === 'leads') return { projectId: 'Firebase project ID', inbox: 'Inbox address' }[first] ?? path;
  return path;
}

/** A value the way a person would write it: "TSh 350,000", "Plain", "Hidden". */
export function showValue(path, value) {
  if (value === undefined || value === null || value === '') return 'empty';
  const group = path.split('.')[0];
  if (group === 'prices') return Number.isInteger(value) ? `TSh ${formatAmount(value)}` : 'not a number';
  if (group === 'backgrounds') return BACKGROUNDS.find((item) => item.key === value)?.name ?? String(value);
  if (path === 'seo.index') return value ? 'Listed' : 'Hidden';
  return String(value);
}

const short = (text, most = 28) => (text.length > most ? `${text.slice(0, most - 1)}…` : text);

/** A commit message for a set of changes. One line, readable in the history. */
export function commitMessage(list) {
  if (list.length === 1) {
    const [{ path, from, to }] = list;
    return `Admin: ${nameOf(path)}, ${short(showValue(path, from))} to ${short(showValue(path, to))}`;
  }
  const pages = [...new Set(list.map((item) => tabOf(item.path)))];
  return `Admin: ${pages.join(', ')} (${list.length} changes)`;
}
