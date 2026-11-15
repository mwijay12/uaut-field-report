// The curtain that covers the screen between two pages.
//
// It is two SVG shapes, a thin gold one leading a violet one. One edge of each
// shape is pinned to the top or bottom of the screen. The other edge is a
// curve whose middle runs ahead of its ends, which is what makes it look like
// cloth rather than a box. GSAP tweens two numbers and the path is rebuilt
// from them on every frame.

import { EASE, gsap } from './motion.js';
import { ROUTES } from './routes.js';

const SWEEP = 0.75; // seconds for one shape to cross the screen
const LAG = 0.09; // how far the second shape trails the first

export function createCurtain() {
  const element = document.querySelector('[data-curtain]');
  const back = element.querySelector('[data-curtain-back]');
  const front = element.querySelector('[data-curtain-front]');
  const word = element.querySelector('[data-curtain-word]');
  const label = element.querySelector('[data-curtain-label]');
  const count = element.querySelector('[data-curtain-count]');

  // `anchor` is the pinned edge (0 top, 100 bottom). `edge` is where the free
  // edge meets the sides and `middle` is where its centre is.
  const draw = (path, anchor, edge, middle) => {
    path.setAttribute('d', `M 0 ${anchor} H 100 V ${edge} Q 50 ${2 * middle - edge} 0 ${edge} Z`);
  };

  function sweep(path, anchor, from, to) {
    const shape = { edge: from, middle: from };
    // The lead is a share of the screen's height. On a tall, narrow screen the
    // same share would turn the curve into a spike, so it shrinks with the shape.
    const lead = Math.min(1, window.innerWidth / window.innerHeight);
    const update = () => draw(path, anchor, shape.edge, shape.edge + (shape.middle - shape.edge) * lead);
    update();
    return gsap
      .timeline({ onUpdate: update })
      .to(shape, { edge: to, duration: SWEEP, ease: EASE.inOut }, 0)
      .to(shape, { middle: to, duration: SWEEP * 0.8, ease: 'power2.inOut' }, 0);
  }

  return {
    /**
     * Cover the screen and show where we are going.
     * `direction` is 1 to rise from the bottom, -1 to fall from the top.
     */
    cover({ direction, route }) {
      const anchor = direction === 1 ? 100 : 0;
      const far = 100 - anchor;
      const position = String(ROUTES.indexOf(route) + 1).padStart(2, '0');

      word.textContent = route.word;
      label.textContent = route.label;
      count.textContent = `${position} / ${String(ROUTES.length).padStart(2, '0')}`;
      gsap.set(element, { autoAlpha: 1 });

      return gsap
        .timeline()
        .add(sweep(back, anchor, anchor, far), 0)
        .add(sweep(front, anchor, anchor, far), LAG)
        .fromTo(word, { yPercent: 112 * direction }, { yPercent: 0, duration: 0.55, ease: EASE.out }, 0.34)
        .fromTo([count, label], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none', stagger: 0.06 }, 0.46)
        .to(label, { duration: 0.4, ease: 'none', scrambleText: { text: route.label, chars: 'upperCase', speed: 0.7 } }, 0.48);
    },

    /** Lift the curtain off the new page, travelling the same way it came. */
    reveal({ direction }) {
      const anchor = direction === 1 ? 0 : 100;
      const far = 100 - anchor;

      return gsap
        .timeline()
        .to(word, { yPercent: -112 * direction, duration: 0.42, ease: EASE.inOut }, 0)
        .to([count, label], { autoAlpha: 0, duration: 0.18, ease: 'none' }, 0)
        .add(sweep(front, anchor, far, anchor), 0.1)
        .add(sweep(back, anchor, far, anchor), 0.1 + LAG)
        .set(element, { autoAlpha: 0 });
    },
  };
}
