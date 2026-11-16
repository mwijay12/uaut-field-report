// Altra, the assistant that floats over every page.
//
// It is mounted once, with the header and the curtain, outside the Barba
// container, so a page change does not restart the conversation. The words are
// English or Kiswahili, chosen by the visitor and guessed from what they type.
//
// What it does:
//   - answers from src/lib/chat/knowledge.js, in the browser, with no request
//     and no key (src/lib/chat/answer.js holds the matching)
//   - asks a model instead, if a model is ever put behind src/lib/chat/provider.js
//   - falls back to "I do not know, here is a person on WhatsApp" rather than
//     guessing, which is the only honest thing a script can do
//
// The panel is a dialog, not a modal: the page behind stays usable. Escape and
// the close button close it, focus returns to the button that opened it, and Tab
// stays inside while it is open.

import { site } from '../site.js';
import { gsap, reducedMotion } from './motion.js';
import { answer, digest, replyFor, starters } from './chat/answer.js';
import { ENDPOINT, ask } from './chat/provider.js';

const OPEN_KEY = 'aria-expanded';

export function createChat() {
  const root = document.querySelector('[data-chat]');
  if (!root) return { open() {}, close() {}, destroy() {} };

  const panel = root.querySelector('[data-chat-panel]');
  const launch = root.querySelector('[data-chat-open]');
  const closeButton = root.querySelector('[data-chat-close]');
  const log = root.querySelector('[data-chat-log]');
  const form = root.querySelector('[data-chat-form]');
  const input = root.querySelector('[data-chat-input]');
  const languages = [...root.querySelectorAll('[data-chat-lang]')];

  let lang = document.documentElement.lang === 'sw' ? 'sw' : 'en';
  let isOpen = false;
  let greeted = false;
  let busy = false;
  let destroyed = false;
  const history = [];

  // ---------- The log ----------

  /** One bubble. A bubble is never built from HTML: text is text. */
  function bubble(role, reply) {
    const item = document.createElement('div');
    item.className = `chat__msg chat__msg--${role}`;

    if (role === 'altra') {
      const mark = document.createElement('span');
      mark.className = 'chat__avatar';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = '<svg class="icon"><use href="#i-chat" /></svg>';
      item.append(mark);
    }

    const body = document.createElement('div');
    body.className = 'chat__bubble';

    const text = document.createElement('p');
    text.className = 'chat__text';
    text.textContent = reply.text;
    body.append(text);

    for (const link of reply.go ?? []) {
      const a = document.createElement('a');
      a.className = 'chat__link';
      a.href = link.href;
      a.textContent = link.label;
      if (/^https?:/i.test(link.href)) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      body.append(a);
    }

    item.append(body);
    log.append(item);
    log.scrollTop = log.scrollHeight;
    return item;
  }

  /** The buttons under a reply: questions this note knows how to answer. */
  function chips(items) {
    if (!items?.length) return;
    const row = document.createElement('div');
    row.className = 'chat__chips';
    for (const chip of items) {
      const button = document.createElement('button');
      button.className = 'chat__chip';
      button.type = 'button';
      button.dataset.chatAsk = chip.id;
      button.textContent = chip.label;
      row.append(button);
    }
    log.append(row);
    log.scrollTop = log.scrollHeight;
  }

  /** Three dots while a model thinks. The notes never need it; they are instant. */
  function thinking() {
    const item = document.createElement('div');
    item.className = 'chat__msg chat__msg--altra chat__msg--thinking';
    const mark = document.createElement('span');
    mark.className = 'chat__avatar';
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<svg class="icon"><use href="#i-chat" /></svg>';
    const body = document.createElement('div');
    body.className = 'chat__bubble';
    body.innerHTML = '<span class="chat__dots"><i></i><i></i><i></i></span>';
    item.append(mark, body);
    log.append(item);
    log.scrollTop = log.scrollHeight;
    return item;
  }

  function say(idOrReply, role = 'altra') {
    const reply = typeof idOrReply === 'string' ? replyFor(idOrReply, lang, site) : idOrReply;
    bubble(role, reply);
    if (role === 'altra') chips(reply.chips);
    history.push({ role, text: reply.text });
    if (history.length > 20) history.splice(0, history.length - 20);
    return reply;
  }

  // ---------- Asking ----------

  async function send(text) {
    const question = String(text ?? '').trim();
    if (!question || busy) return;
    input.value = '';
    say({ text: question }, 'you');

    busy = true;
    // With no model behind the provider the answer is instant, so there is
    // nothing to wait for and nothing to show. The dots are for the day a
    // route exists.
    const waiting = ENDPOINT ? thinking() : null;
    let model = null;
    try {
      model = await ask({
        question,
        lang,
        history,
        notes: digest(site, lang),
      });
    } finally {
      waiting?.remove();
      busy = false;
    }

    if (destroyed) return;
    if (model) {
      bubble('altra', { text: model.text, go: [], chips: [] });
      history.push({ role: 'altra', text: model.text });
      return;
    }
    const reply = answer(question, { lang, site });
    // The language of the answer follows the question, and the switch follows it,
    // so the next chip is in the language the visitor just wrote in.
    if (reply.lang !== lang) setLanguage(reply.lang, { quiet: true });
    say(reply);
  }

  // ---------- Language ----------

  function setLanguage(next, { quiet = false } = {}) {
    if (next === lang && !quiet) return;
    lang = next;
    for (const button of languages) {
      const on = button.dataset.chatLang === lang;
      button.setAttribute('aria-pressed', String(on));
    }
    input.placeholder = lang === 'sw' ? 'Bei, muda, tunachojenga…' : 'Prices, timelines, what we build…';
    if (quiet) return;
    // A switch mid-conversation says so in the new language, in a new bubble,
    // rather than rewriting what is already on the screen.
    say({ text: lang === 'sw' ? 'Sawa. Naendelea kwa Kiswahili.' : 'Right. I will answer in English.' });
    chips(starters(lang, site));
  }

  // ---------- Open and close ----------

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.hidden = false;
    launch.setAttribute(OPEN_KEY, 'true');
    root.classList.add('is-open');

    if (!greeted) {
      greeted = true;
      // The greeting brings its own buttons: the four questions worth starting
      // with, in the language the visitor is reading.
      say('hello');
    }

    if (reducedMotion) {
      input.focus({ preventScroll: true });
      return;
    }
    gsap.fromTo(
      panel,
      { y: 16, autoAlpha: 0, scale: 0.98 },
      {
        y: 0,
        autoAlpha: 1,
        scale: 1,
        duration: 0.34,
        ease: 'power3.out',
        clearProps: 'transform',
        onComplete: () => input.focus({ preventScroll: true }),
      },
    );
  }

  function close({ focus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;
    launch.setAttribute(OPEN_KEY, 'false');
    root.classList.remove('is-open');
    if (focus) launch.focus({ preventScroll: true });

    if (reducedMotion) {
      panel.hidden = true;
      return;
    }
    gsap.to(panel, {
      y: 12,
      autoAlpha: 0,
      scale: 0.98,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        panel.hidden = true;
        gsap.set(panel, { clearProps: 'all' });
      },
    });
  }

  const toggle = () => (isOpen ? close() : open());

  // ---------- Keys ----------

  const focusables = () =>
    [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
      (node) => node.getClientRects().length > 0,
    );

  function onKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      close();
      return;
    }
    // Tab stays inside an open panel: the page behind is still there, but it is
    // not what the reader is doing.
    if (event.key !== 'Tab' || !isOpen) return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // ---------- Wiring ----------

  launch.addEventListener('click', toggle);
  closeButton.addEventListener('click', () => close());
  panel.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-chat-ask]');
    if (!chip) return;
    say(chip.dataset.chatAsk);
    input.focus({ preventScroll: true });
  });
  for (const button of languages) {
    button.addEventListener('click', () => setLanguage(button.dataset.chatLang));
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    send(input.value);
  });
  document.addEventListener('keydown', onKeydown);

  return {
    open,
    close: () => close({ focus: false }),
    toggle,
    destroy() {
      destroyed = true;
      document.removeEventListener('keydown', onKeydown);
    },
  };
}
