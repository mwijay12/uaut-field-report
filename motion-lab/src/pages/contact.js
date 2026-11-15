// Contact page: turns the form into a WhatsApp message. The links carry the
// text, so the message reaches a person whether or not anything else works.
//
// When the admin has set a Firebase project (content/site.json, leads), a copy
// of the brief is also saved in the inbox of Altraware's main site. Then the
// form has a phone field, and asks for a name and a number before it sends.
//
// The page can be opened with a choice already made:
//   /contact/?need=web-starter                      a package
//   /contact/?need=other&about=Payment+integration  a topic that is not a package
//   /contact/?kind=app&with=mpesa,booking&vat=1     an estimate from the pricing page

import { compact, describe, estimate, fromQuery } from '../lib/estimate.js';
import { leadRecord, newRef, saveLead } from '../lib/leads.js';
import { ScrollTrigger, gsap, reducedMotion } from '../lib/motion.js';
import { write } from '../lib/stream.js';
import { site } from '../site.js';

// A brief asks for a written quote, so it goes to a person, not to the chatbot.
const WHATSAPP = site.person.whatsapp;
const EMAIL = site.email;
const INBOX = site.leads.on ? site.leads.projectId : '';
const STORE_KEY = 'altraware:brief';
const KEPT = ['name', 'phone', 'org', 'note']; // what a visitor typed, kept for this tab only

// The inbox of the main site files a lead under one of these.
const TYPES = {
  'web-starter': 'Website',
  'growth-site': 'Website',
  'pro-portal': 'Website',
  'custom-app': 'Custom Software',
  'turnkey-system': 'Custom Software',
  other: 'Consultation',
};

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
  const status = form.querySelector('[data-brief-status]');
  const statusText = form.querySelector('[data-brief-status-text]');
  const tick = status.querySelectorAll('.brief__tick > *');
  const kept = KEPT.filter((name) => form.elements[name]); // the phone field exists only with the inbox on

  const query = new URLSearchParams(window.location.search);
  const wanted = query.get('need');
  const about = (query.get('about') || '').slice(0, 80);
  let choice = fromQuery(query); // null when no estimate came with the link

  // With the inbox on, each brief carries a reference the team can find it by.
  let ref = INBOX ? newRef() : '';
  let savedBody = null; // the brief that was last saved, so the same one is not saved twice

  const picked = [...form.elements.need].find((input) => input.value === wanted);
  if (picked) picked.checked = true;

  // Bring back what was typed earlier in this tab.
  const before = load();
  kept.forEach((name) => {
    if (typeof before[name] === 'string') form.elements[name].value = before[name];
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
  const value = (name) => clean(form.elements[name]?.value ?? '');
  const selected = () => form.querySelector('input[name="need"]:checked');

  /** The message, without the reference: two briefs with the same body are the same brief. */
  function body() {
    const need = selected();
    const undecided = need.value === 'other';
    const note = form.elements.note.value.trim();

    const lines = ['Habari Altraware,', '', 'I would like to start a project.'];
    // With an estimate attached and no package picked, the estimate says what is needed.
    if (!(choice && undecided && !about)) lines.push(`Need: ${undecided && about ? about : need.dataset.summary}`);
    if (choice) lines.push(describe(choice));
    if (value('name')) lines.push(`Name: ${value('name')}`);
    if (value('phone')) lines.push(`Phone: ${value('phone')}`);
    if (value('org')) lines.push(`Business: ${value('org')}`);
    if (note) lines.push(`Note: ${note}`);
    return lines.join('\n');
  }

  // The message is typed, not swapped: all of it when it first comes into
  // view, and after that each change, in the place where it changed.
  const TYPING = { words: false, rate: 90 };
  let typing = null;
  let seen = false; // the message has come into view

  function showMessage(message) {
    const before = preview.textContent;
    // One choice can report twice (an input event, then a change event). The
    // second time nothing is new, and what is being typed carries on.
    if (typing && before === message) return;
    typing?.stop();
    preview.textContent = message;
    if (reducedMotion) return;
    if (!seen) {
      typing = write(preview, { ...TYPING, paused: true }); // waits, unseen, for the reader to get there
      return;
    }

    const shorter = Math.min(before.length, message.length);
    let from = 0;
    while (from < shorter && before[from] === message[from]) from += 1;
    let same = 0; // how much of the end is unchanged
    while (same < shorter - from && before.at(-1 - same) === message.at(-1 - same)) same += 1;
    const to = message.length - same;
    if (to > from) typing = write(preview, { ...TYPING, from, to });
  }

  function say(text, tone = '') {
    status.hidden = !text;
    status.dataset.tone = tone;
    statusText.textContent = text;
    if (tone === 'done' && !reducedMotion) {
      gsap.fromTo(tick, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.inOut', stagger: 0.25, overwrite: true });
    }
  }

  function update() {
    const text = body();
    // A brief that was saved and then changed is a new brief, with its own reference.
    if (savedBody !== null && text !== savedBody) {
      savedBody = null;
      ref = newRef();
      say('');
    }
    const message = ref ? `${text}\nRef: ${ref}` : text;
    showMessage(message);
    whatsapp.href = `${WHATSAPP}?text=${encodeURIComponent(message)}`;
    email.href = `mailto:${EMAIL}?subject=${encodeURIComponent(ref ? `New project ${ref}` : 'New project')}&body=${encodeURIComponent(message)}`;
    save(Object.fromEntries(kept.map((name) => [name, form.elements[name].value])));
  }

  /** With the inbox on: the first field that still needs filling, or null. */
  function missing() {
    const wants = [
      ['name', value('name').length >= 2, 'Add your name, so we know who to answer.'],
      ['phone', value('phone').replace(/\D/g, '').length >= 9, 'Add a phone or WhatsApp number we can reach you on.'],
    ];
    let first = null;
    for (const [name, ok, message] of wants) {
      form.elements[name].setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !first) first = { input: form.elements[name], message };
    }
    return first;
  }

  /** Saves the brief in the inbox, once per brief. WhatsApp has already been opened by the link itself. */
  async function keepCopy() {
    const text = body();
    if (text === savedBody) return;
    savedBody = text;
    const sentAs = ref;

    const need = selected();
    const result = choice ? estimate(choice) : null;
    const pack = need.closest('.package');
    const record = leadRecord({
      refCode: sentAs,
      name: value('name'),
      phone: value('phone'),
      org: value('org'),
      type: result && need.value === 'other' ? (choice.kind === 'website' ? 'Website' : 'Custom Software') : TYPES[need.value],
      message: text,
      budget: result ? `${compact(result.low)} to ${compact(result.high)}` : need.value === 'other' ? '' : clean(pack.querySelector('.package__price').textContent),
      timeline: result ? `About ${result.weeks[0]} to ${result.weeks[1]} weeks` : need.value === 'other' ? '' : clean(pack.querySelector('.package__time').textContent),
      notes: `Sent from the brief form on ${window.location.host}`,
    });

    say('Saving a copy in our inbox…');
    const answer = await saveLead(INBOX, record, { keepalive: true });
    if (savedBody !== text) return; // the form was changed while this was on its way
    if (answer.ok) {
      say(`Saved in our inbox as ${sentAs}. WhatsApp has the message ready: press send there.`, 'done');
    } else {
      savedBody = null; // so pressing the button again tries once more
      say('WhatsApp has the message ready: press send there. A copy could not be saved in our inbox this time.', 'done');
    }
  }

  const onSend = (event) => {
    if (!INBOX) {
      say(event.currentTarget === email ? 'Your mail app has the message ready: press send there.' : 'WhatsApp has the message ready: press send there.', 'done');
      return;
    }
    const gap = missing();
    if (gap) {
      event.preventDefault(); // the link does not open until the inbox has what it needs
      say(gap.message, 'missing');
      gap.input.focus();
      return;
    }
    keepCopy();
  };

  const onInput = (event) => {
    if (event.target.getAttribute?.('aria-invalid') === 'true') {
      event.target.setAttribute('aria-invalid', 'false');
      if (status.dataset.tone === 'missing') say('');
    }
    update();
  };

  const onRemove = () => {
    choice = null;
    showEstimate();
    update();
  };

  const onSubmit = (event) => {
    event.preventDefault();
    whatsapp.click();
  };

  form.addEventListener('input', onInput);
  form.addEventListener('change', update);
  form.addEventListener('submit', onSubmit);
  whatsapp.addEventListener('click', onSend);
  email.addEventListener('click', onSend);
  remove.addEventListener('click', onRemove);
  showEstimate();
  update();

  if (!reducedMotion) {
    ScrollTrigger.create({
      trigger: preview,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        seen = true;
        typing?.play();
      },
    });
  }

  return () => {
    typing?.stop();
    form.removeEventListener('input', onInput);
    form.removeEventListener('change', update);
    form.removeEventListener('submit', onSubmit);
    whatsapp.removeEventListener('click', onSend);
    email.removeEventListener('click', onSend);
    remove.removeEventListener('click', onRemove);
  };
}
