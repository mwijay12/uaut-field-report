// Services page: the five services are a stack of cards. Each one stays put
// while the next slides over it, and settles back a little as it is covered.
// Only where the stylesheet makes the cards sticky (wide, tall screens).

import { gsap } from '../lib/motion.js';

const STACKED = '(min-width: 1000px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)';

export function mountServices(root, { media }) {
  media.add(STACKED, () => {
    const cards = gsap.utils.toArray('[data-stack]', root);
    cards.forEach((card, index) => {
      const next = cards[index + 1];
      if (!next) return;
      // Scale only. A covered card must stay opaque, or the cards under it show through.
      gsap.to(card, {
        scale: 0.95,
        ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true },
      });
    });
  });
}
