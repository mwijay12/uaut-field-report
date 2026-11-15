// Stickers: small doodles that sit on the page a little askew, on the corner
// of a picture or beside a heading. They are what gives a flat page depth:
// each one moves at its own pace as the page scrolls.
//
//   <section class="has-stickers">
//     <!-- @include sticker name="receipt" tone="night" place="build" depth="0.3" turn="14" -->
//
// name    which drawing: src/partials/art/sticker-<name>.html (made by scripts/stickers.mjs)
// tone    its colours: sun, lilac, violet, night or gold (src/styles/stickers.css)
// place   where it sits: the class sticker--<place>, also in stickers.css
// depth   how far it drifts while it crosses the screen, as a share of the
//         screen's height (a screen taller than 900 px counts as 900). Above 0
//         it moves faster than the page and reads as nearer. Below 0 it lags
//         and reads as further away. Default 0.2.
// turn    degrees it turns while it crosses the screen. Default 10.
//
// Each sticker does four things, and each is given to a different element so
// that no two of them ever move the same property of the same element:
//
//   .sticker          sits where the stylesheet puts it, at its resting tilt
//   .sticker__drift   drifts and turns with the scroll position
//   .sticker__body    pops in when the sticker comes into view, and out again
//   .doodle           leans with the speed of the scroll, then springs back.
//                     With a mouse, it also flinches when the pointer brushes it
//
// With reduced motion nothing here runs and every sticker is simply there.

import { FINE_POINTER, ScrollTrigger, gsap, reducedMotion } from './motion.js';

const LEAN = 16; // degrees a sticker leans when the page is scrolled at full speed
const NARROW = 900; // pixels: below this width a sticker drifts half as far
const TALLEST = 900; // pixels: a taller screen does not make a sticker drift further
const FULL_SPEED = 3000; // pixels a second that count as full speed

export function mountStickers(root, { media }) {
  const stickers = gsap.utils.toArray('[data-sticker]', root);
  if (!stickers.length || reducedMotion) return undefined;

  const leaners = [];
  // A sticker that is on screen when the page is mounted waits for the page's
  // arrival, so it pops after the heading has risen and not behind the curtain.
  let arrived = false;
  let gone = false;
  const waiting = new Set();

  for (const sticker of stickers) {
    const drift = sticker.querySelector('.sticker__drift');
    const body = sticker.querySelector('.sticker__body');
    const doodle = sticker.querySelector('.doodle');
    if (!drift || !body || !doodle) continue;

    const depth = Number(sticker.dataset.depth || 0.2);
    const turn = Number(sticker.dataset.turn || 10);

    // Arrival: the backing pops, then the pen draws the lines on it.
    const arrive = gsap.timeline({ paused: true });
    arrive.fromTo(body, { scale: 0, rotation: -turn * 3 }, { scale: 1, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.6)' });
    if (!doodle.classList.contains('doodle--solid')) {
      // Each line is hidden until its turn, or its round end shows as a dot on the backing.
      doodle.querySelectorAll('.doodle__ink path').forEach((path, index) => {
        const at = 0.1 + index * 0.06;
        gsap.set(path, { autoAlpha: 0 });
        arrive.set(path, { autoAlpha: 1 }, at);
        arrive.from(path, { drawSVG: '0%', duration: 0.5, ease: 'power2.inOut' }, at);
      });
    }
    ScrollTrigger.create({
      trigger: sticker,
      start: 'top 92%',
      onEnter: () => (arrived ? arrive.timeScale(1).play() : waiting.add(arrive)),
      onLeaveBack: () => {
        waiting.delete(arrive);
        arrive.timeScale(2.2).reverse();
      },
    });

    // Drift. A sticker further down the page is where the stylesheet put it at
    // the moment it crosses the middle of the screen. A sticker on the first
    // screen is where the stylesheet put it while the page is at the top, and
    // drifts away from there, so it never starts out of place.
    // Half as far on a narrow screen, where there is less room between the words.
    const reach = () => depth * Math.min(window.innerHeight, TALLEST) * (window.innerWidth < NARROW ? 0.25 : 0.5);
    const onFirstScreen = () => sticker.getBoundingClientRect().top + window.scrollY < window.innerHeight;
    gsap.fromTo(
      drift,
      { y: () => (onFirstScreen() ? 0 : reach()), rotation: () => (onFirstScreen() ? 0 : -turn / 2) },
      {
        y: () => (onFirstScreen() ? -1.5 * reach() : -reach()),
        rotation: () => (onFirstScreen() ? turn * 0.75 : turn / 2),
        ease: 'none',
        scrollTrigger: { trigger: sticker, start: 'clamp(top bottom)', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
      },
    );

    // Lean: only the stickers on screen are told about the speed.
    const leaner = { sticker, lean: gsap.quickTo(doodle, 'rotation', { duration: 0.9, ease: 'elastic.out(1, 0.35)' }), seen: false, touched: false };
    leaners.push(leaner);
    ScrollTrigger.create({
      trigger: sticker,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        leaner.seen = self.isActive;
        if (!self.isActive) leaner.lean(0);
      },
    });
  }

  const tell = (degrees) => leaners.forEach((leaner) => leaner.seen && leaner.lean(degrees));
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => tell(gsap.utils.clamp(-1, 1, self.getVelocity() / FULL_SPEED) * LEAN),
  });

  // The last update of a scroll still carries some speed. This says it has stopped.
  const rest = () => tell(0);
  ScrollTrigger.addEventListener('scrollEnd', rest);

  // A sticker lets clicks through, so it cannot hear the pointer itself. The
  // window does the listening, and tells a sticker when the pointer crosses it.
  media.add(FINE_POINTER, () => {
    const onMove = (event) => {
      for (const leaner of leaners) {
        if (!leaner.seen) continue;
        const box = leaner.sticker.getBoundingClientRect();
        const inside = event.clientX > box.left && event.clientX < box.right && event.clientY > box.top && event.clientY < box.bottom;
        if (inside && !leaner.touched) {
          // Flinch away from the side the pointer came in on, then settle.
          const side = event.clientX < box.left + box.width / 2 ? 1 : -1;
          leaner.lean(side * LEAN);
          gsap.delayedCall(0.14, () => !gone && leaner.lean(0));
        }
        leaner.touched = inside;
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  });

  return {
    /** The page has arrived: pop the stickers that were waiting for it. */
    enter() {
      arrived = true;
      [...waiting].forEach((arrive, index) => {
        gsap.delayedCall(0.75 + index * 0.12, () => !gone && waiting.delete(arrive) && arrive.timeScale(1).play());
      });
    },
    destroy() {
      gone = true;
      ScrollTrigger.removeEventListener('scrollEnd', rest);
    },
  };
}
