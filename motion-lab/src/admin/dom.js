// A small helper for building elements. Text is always set as text, never as
// HTML, so nothing typed into the admin or read from GitHub can become markup.

const SVG = 'http://www.w3.org/2000/svg';

/**
 * h('label', { class: 'field' }, 'Name', h('input', { type: 'text' }))
 * Props starting with "on" are listeners. `data` is a map of data- attributes.
 */
export function h(tag, props, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined) continue;
    if (key === 'class') element.className = value;
    else if (key === 'data') Object.assign(element.dataset, value);
    else if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (key in element && !['list', 'form', 'role'].includes(key)) element[key] = value;
    else if (value !== false) element.setAttribute(key, value === true ? '' : value);
  }
  return add(element, ...children);
}

// append() would write the word "null" for a missing child, so these two leave
// out anything that is not there. Arrays of children are flattened.
const present = (children) => children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);

/** Adds children to an element. */
export function add(element, ...children) {
  element.append(...present(children));
  return element;
}

/** Replaces everything in an element. */
export function fill(element, ...children) {
  element.replaceChildren(...present(children));
  return element;
}

/** An icon from the sprite in admin/index.html. */
export function icon(name) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', `#a-${name}`);
  svg.append(use);
  return svg;
}

/** "3 minutes ago", "yesterday", "12 Nov 2026". */
export function ago(date, now = Date.now()) {
  const seconds = Math.round((now - new Date(date).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'a minute ago';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
