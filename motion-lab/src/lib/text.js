// Text effects, declared in the HTML.
//
//   data-type-words="a|b|c"   types each phrase, holds it, deletes it, moves to the next
//   data-scramble             the text resolves out of random letters when scrolled into view
//   data-scrub                the words of a paragraph light up as you scroll through it
//
// data-scramble replaces the element's content, so put it on an element that
// holds plain text only. None of this runs with reduced motion: the HTML
// already holds the readable text.

import { ScrollTrigger, SplitText, gsap, reducedMotion } from './motion.js';

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

// Words that are not lit yet stay readable: these levels keep large text at
// 3 to 1 against the page, on the dark theme and on the light one.
const DIM = { night: 0.4, day: 0.5 };

function scrub(element) {
  // Cut into words, a paragraph reads badly on a phone's screen reader, which
  // stops at every word. So the cut copy is hidden from it, and a copy that
  // reads as one piece is put in front.
  const whole = element.cloneNode(true);
  whole.removeAttribute('data-scrub');
  whole.className = 'sr-only';
  element.before(whole);

  const dim = DIM[element.closest('[data-theme]')?.dataset.theme] ?? DIM.day;
  SplitText.create(element, {
    type: 'words',
    wordsClass: 'word',
    aria: 'hidden',
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(
        self.words,
        { opacity: dim },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: { trigger: element, start: 'top 84%', end: 'bottom 52%', scrub: true },
        },
      );
    },
  });
}

export function mountText(root) {
  if (reducedMotion) return;
  gsap.utils.toArray('[data-type-words]', root).forEach(typeWords);
  gsap.utils.toArray('[data-scramble]', root).forEach(scramble);
  gsap.utils.toArray('[data-scrub]', root).forEach(scrub);
}
