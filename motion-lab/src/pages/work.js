// Work page: each platform name drifts sideways a little as its chapter passes.

import { gsap } from '../lib/motion.js';

export function mountWork(root, { media }) {
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.utils.toArray('.product', root).forEach((product) => {
      gsap.fromTo(
        product.querySelector('.product__name'),
        { xPercent: 3 },
        {
          xPercent: -5,
          ease: 'none',
          scrollTrigger: { trigger: product, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
  });
}
