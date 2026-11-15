// Text effects, declared in the HTML.
//
//   data-type-words="a|b|c"   types each phrase, holds it, deletes it, moves to the next
//   data-scramble             the text resolves out of random letters when scrolled into view
//   data-scrub                the words of a paragraph light up as you scroll through it
//   data-write                the text is written out word by word, as if it were being
//                             generated. Once, when scrolled into view. With data-enter
//                             beside it: when the page arrives. Inside a <details>: each
//                             time it is opened.
//   data-write="type"         the same, letter by letter, like a typewriter
//
// data-scramble replaces the element's content, so put it on an element that
// holds plain text only. data-write keeps links and line breaks (src/lib/stream.js).
// None of this runs with reduced motion: the HTML already holds the readable text.

import { ScrollTrigger, SplitText, gsap, reducedMotion } from './motion.js';
import { write } from './stream.js';

const TYPE = 0.05; // seconds per character typed
const ERASE = 0.026; // seconds per character deleted
const HOLD = 1.6; // seconds a finished phrase stays

function typeWords(element) {
  const phrases = element.dataset.typeWords
    .split('|')
    .map((phrase) => phrase.trim())
    .filter(Boolean);
  if (phrases.length < 2) return;

  let phrase = phrases[0];
  const cursor = { at: phrase.length };
  const show = () => {
    element.textContent = phrase.slice(0, Math.round(cursor.at));
  };

  const loop = gsap.timeline({ repeat: -1, paused: true });
  phrases.forEach((from, index) => {
    const next = phrases[(index + 1) % phrases.length];
    loop
      .to({}, { duration: HOLD })
      .to(cursor, { at: 0, duration: from.length * ERASE, ease: 'none', onUpdate: show })
      .call(() => {
        phrase = next;
      })
      .to(cursor, { at: next.length, duration: next.length * TYPE, ease: 'none', onUpdate: show });
  });

  // Only type while the line is on screen.
  ScrollTrigger.create({
    trigger: element,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => loop.paused(!self.isActive),
  });
}

function scramble(element) {
  const text = element.textContent;
  gsap.to(element, {
    duration: Math.min(1.3, 0.45 + text.length * 0.03),
    ease: 'none',
    scrambleText: { text, chars: 'upperCase', speed: 0.6, revealDelay: 0.12 },
    scrollTrigger: { trigger: element, start: 'top 94%', once: true },
  });
}

function scrub(element) {
  // Cut into words, a paragraph reads badly on a phone's screen reader, which
  // stops at every word. So the cut copy is hidden from it, and a copy that
  // reads as one piece is put in front.
  const whole = element.cloneNode(true);
  whole.removeAttribute('data-scrub');
  whole.className = 'sr-only';
  element.before(whole);

  // Each word goes from 0 to 1 in --lit. How dim an unlit word is depends on
  // the theme, so the stylesheet turns --lit into an opacity (.scrub__word in
  // components.css). A word then stays readable when the theme changes under it.
  SplitText.create(element, {
    type: 'words',
    wordsClass: 'scrub__word',
    aria: 'hidden',
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(
        self.words,
        { '--lit': 0 },
        {
          '--lit': 1,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: { trigger: element, start: 'top 84%', end: 'bottom 52%', scrub: true },
        },
      );
    },
  });
}

// On arrival the block fades up first (reveal.js), then its text is written.
const AFTER_FADE = 0.55;

function writeOut(element, arrivals, cleanups) {
  const options = { words: element.dataset.write !== 'type' };
  const details = element.closest('details');
  let writing = null;

  const begin = (more) => {
    writing?.stop();
    writing = write(element, { ...options, ...more });
  };
  cleanups.push(() => writing?.stop());

  if (details) {
    // A click reaches the summary before the question opens, so the answer is
    // never seen whole and then taken away. Opened some other way (find in
    // page, a script), the toggle event is the first to know.
    const onClick = () => {
      if (!details.open) begin();
    };
    const onToggle = () => {
      if (!details.open) writing?.stop();
      else if (!writing?.busy) begin();
    };
    const summary = details.querySelector('summary');
    summary?.addEventListener('click', onClick);
    details.addEventListener('toggle', onToggle);
    cleanups.push(() => {
      summary?.removeEventListener('click', onClick);
      details.removeEventListener('toggle', onToggle);
    });
    if (!details.open) return; // nothing to see until it is opened
  }

  if (element.hasAttribute('data-enter')) {
    begin({ paused: true, delay: AFTER_FADE });
    arrivals.push(() => writing.play());
  } else {
    begin({ paused: true });
    ScrollTrigger.create({ trigger: element, start: 'top 90%', once: true, onEnter: () => writing.play() });
  }
}

export function mountText(root) {
  const arrivals = [];
  const cleanups = [];

  if (!reducedMotion) {
    gsap.utils.toArray('[data-type-words]', root).forEach(typeWords);
    gsap.utils.toArray('[data-scramble]', root).forEach(scramble);
    gsap.utils.toArray('[data-scrub]', root).forEach(scrub);
    gsap.utils.toArray('[data-write]', root).forEach((element) => writeOut(element, arrivals, cleanups));
  }

  return {
    /** The page has arrived: write what was waiting for that. */
    enter: () => arrivals.forEach((arrive) => arrive()),
    destroy: () => cleanups.forEach((cleanup) => cleanup()),
  };
}
