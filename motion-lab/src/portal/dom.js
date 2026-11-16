// The same small element helper the admin uses: text is always set as text, so
// a client name or a note typed into a field can never become markup.

const SVG = 'http://www.w3.org/2000/svg';

/**
 * h('label', { class: 'field' }, 'Name', h('input', { type: 'text' }))
 * Props starting with "on" are listeners. `data` is a map of data- attributes.
 */
export function h(tag, props, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key === 'data') Object.assign(element.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2), value);
    else if (key in element && !['list', 'form', 'role'].includes(key)) element[key] = value;
    else element.setAttribute(key, value === true ? '' : value);
  }
  return add(element, ...children);
}

const present = (children) => children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);

/** Adds children to an element, leaving out the ones that are not there. */
export function add(element, ...children) {
  element.append(...present(children));
  return element;
}

/** Replaces everything in an element. */
export function fill(element, ...children) {
  element.replaceChildren(...present(children));
  return element;
}

/** An icon from the sprite in portal/index.html. */
export function icon(name, className = '') {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', `#p-${name}`);
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
