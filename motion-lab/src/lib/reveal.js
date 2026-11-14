// Reveals are declared in the HTML, so a new section needs no new JavaScript:
//
//   data-enter-split  heading whose lines rise when the page arrives
//   data-enter        block that fades up when the page arrives
//   data-split        heading whose lines rise when scrolled into view
//   data-reveal       block that fades up when scrolled into view (batched)
//
// With reduced motion none of this runs and the content is simply there.

import { DURATION, EASE, ScrollTrigger, SplitText, gsap, reducedMotion } from './motion.js';

const LINES = { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true };
const RISE = { yPercent: 115, duration: DURATION.slow, ease: EASE.out };

export function mountReveals(root) {
  if (reducedMotion) return { enter() {} };

  let entered = false;
  const arrivals = [];

  // Lines that rise on arrival. SplitText may split again when fonts load or
  // the window resizes, so the tween is rebuilt in onSplit and returned to it.
  gsap.utils.toArray('[data-enter-split]', root).forEach((heading, index) => {
    const lines = heading.querySelectorAll('.hero__line');
    SplitText.create(lines.length ? lines : heading, {
      ...LINES,
      onSplit(self) {
        arrivals[index] = gsap.from(self.lines, { ...RISE, stagger: 0.09, paused: !entered });
        return arrivals[index];
      },
    });
  });

  // GSAP warns about an empty target, and a page is free to use none of these.
  const arriving = gsap.utils.toArray('[data-enter]', root);
  if (arriving.length) gsap.set(arriving, { autoAlpha: 0, y: 24 });

  gsap.utils.toArray('[data-split]', root).forEach((heading) => {
    SplitText.create(heading, {
      ...LINES,
      onSplit(self) {
        return gsap.from(self.lines, {
          ...RISE,
          stagger: 0.08,
          scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
        });
      },
    });
  });

  const revealing = gsap.utils.toArray('[data-reveal]', root);
  if (revealing.length) {
    gsap.set(revealing, { autoAlpha: 0, y: 28 });
    ScrollTrigger.batch(revealing, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE.out, stagger: 0.07, overwrite: true }),
    });
  }

  return {
    /** Play the arrival: the heading first, the rest just behind it. */
    enter() {
      entered = true;
      arrivals.forEach((tween) => tween?.play());
      if (arriving.length) gsap.to(arriving, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE.out, stagger: 0.08, delay: 0.3 });
    },
  };
}
