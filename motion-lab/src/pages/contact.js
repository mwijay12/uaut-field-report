// Contact page: turns the form into a WhatsApp message. Nothing is sent to a
// server. The links simply carry the text.
//
// The page can be opened with a choice already made:
//   /contact/?need=web-starter                      a package
//   /contact/?need=other&about=Payment+integration  a topic that is not a package
//   /contact/?kind=app&with=mpesa,booking&vat=1     an estimate from the pricing page

import { compact, describe, estimate, fromQuery } from '../lib/estimate.js';
import { site } from '../site.js';

// A brief asks for a written quote, so it goes to a person, not to the chatbot.
const WHATSAPP = site.person.whatsapp;
const EMAIL = site.email;
const STORE_KEY = 'altraware:brief';
const KEPT = ['name', 'org', 'note']; // what a visitor typed, kept for this tab only

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    return {}; // storage can be blocked, or hold something unreadable
  }
}

function save(values) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(values));
  } catch {
    // Nothing to do: the form simply starts empty next time.
  }
}

export function mountContact(root) {
  const form = root.querySelector('[data-brief]');
  if (!form) return undefined;

  const preview = form.querySelector('[data-brief-preview]');
  const whatsapp = form.querySelector('[data-brief-whatsapp]');
  const email = form.querySelector('[data-brief-email]');
  const attached = form.querySelector('[data-brief-estimate]');
  const remove = form.querySelector('[data-brief-estimate-remove]');

  const query = new URLSearchParams(window.location.search);
  const wanted = query.get('need');
  const about = (query.get('about') || '').slice(0, 80);
  let choice = fromQuery(query); // null when no estimate came with the link

  const picked = [...form.elements.need].find((input) => input.value === wanted);
  if (picked) picked.checked = true;

  // Bring back what was typed earlier in this tab.
  const kept = load();
  KEPT.forEach((name) => {
    if (typeof kept[name] === 'string') form.elements[name].value = kept[name];
  });

  function showEstimate() {
    attached.hidden = !choice;
    if (!choice) return;
    const result = estimate(choice);
    const extras = result.addOns.map((item) => item.label.toLowerCase());
    attached.querySelector('[data-brief-estimate-range]').textContent = `${compact(result.low)} to ${compact(result.high)}`;
    attached.querySelector('[data-brief-estimate-text]').textContent =
      `${result.kind.label}${extras.length ? ` with ${extras.join(', ')}` : ''}. About ${result.weeks[0]} to ${result.weeks[1]} weeks.`;
  }

  const clean = (value) => value.replace(/\s+/g, ' ').trim();

  function compose() {
    const selected = form.querySelector('input[name="need"]:checked');
    const undecided = selected.value === 'other';
    const need = undecided && about ? about : selected.dataset.summary;
    const name = clean(form.elements.name.value);
    const org = clean(form.elements.org.value);
    const note = form.elements.note.value.trim();

    const lines = ['Habari Altraware,', '', 'I would like to start a project.'];
    // With an estimate attached and no package picked, the estimate says what is needed.
    if (!(choice && undecided && !about)) lines.push(`Need: ${need}`);
    if (choice) lines.push(describe(choice));
    if (name) lines.push(`Name: ${name}`);
    if (org) lines.push(`Business: ${org}`);
    if (note) lines.push(`Note: ${note}`);
    return lines.join('\n');
  }

  function update() {
    const message = compose();
    preview.textContent = message;
    whatsapp.href = `${WHATSAPP}?text=${encodeURIComponent(message)}`;
    email.href = `mailto:${EMAIL}?subject=${encodeURIComponent('New project')}&body=${encodeURIComponent(message)}`;
    save(Object.fromEntries(KEPT.map((name) => [name, form.elements[name].value])));
  }

  const onRemove = () => {
    choice = null;
    showEstimate();
    update();
  };

  const onSubmit = (event) => {
    event.preventDefault();
    whatsapp.click();
  };

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', onSubmit);
  remove.addEventListener('click', onRemove);
  showEstimate();
  update();

  return () => {
    form.removeEventListener('input', update);
    form.removeEventListener('change', update);
    form.removeEventListener('submit', onSubmit);
    remove.removeEventListener('click', onRemove);
  };
}
