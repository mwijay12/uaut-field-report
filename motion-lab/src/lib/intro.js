// The short intro on the first visit of a session. Anime.js draws the ring,
// brings in the mark and resolves the coordinates out of scrambled digits.

import { createTimeline, scrambleText, svg } from 'animejs';
import { reducedMotion } from './motion.js';

const SEEN_KEY = 'altraware:intro-seen';

function seenBefore() {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return true;
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage can be blocked. Then the intro simply plays on every load.
  }
  return false;
}

/** Plays the intro when it should, and resolves when the page may appear. */
export function playIntro() {
  const intro = document.querySelector('[data-intro]');
  if (!intro || reducedMotion || seenBefore()) return Promise.resolve();

  const ring = intro.querySelector('.intro__ring');
  const mark = intro.querySelector('.intro__mark');
  const coords = intro.querySelector('[data-intro-coords]');
  const [circle] = svg.createDrawable(ring.querySelector('circle'));

  intro.classList.add('is-playing');
  ring.style.opacity = '1';

  return new Promise((resolve) => {
    createTimeline({
      defaults: { ease: 'inOutQuart' },
      onComplete() {
        intro.classList.remove('is-playing');
        intro.style.display = 'none';
        resolve();
      },
    })
      .add(circle, { draw: ['0 0', '0 1'], duration: 1000 }, 0)
      .add(mark, { opacity: { from: 0, to: 1 }, scale: { from: 0.86, to: 1 }, duration: 700, ease: 'outQuart' }, 120)
      .add(coords, { opacity: { from: 0, to: 1 }, duration: 250, ease: 'linear' }, 200)
      .add(coords, { innerHTML: scrambleText({ chars: '0-9', settleDuration: 260 }), duration: 800, ease: 'linear' }, 200)
      .add(intro, { opacity: { from: 1, to: 0 }, scale: { from: 1, to: 1.06 }, duration: 420, ease: 'inQuart' }, 1250);
  });
}
