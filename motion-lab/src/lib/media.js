// Pictures and pointer effects, declared in the HTML.
//
//   data-media          on a <figure>: the picture is unveiled when scrolled into view
//   data-parallax="8"   the element drifts by up to 8% of its own height as it crosses the screen
//   data-magnetic       the element leans towards the pointer (mouse only)
//
// A picture with data-parallax must be taller than its frame. The stylesheet
// does that for an <img data-parallax> inside .media__frame.

import { DURATION, EASE, FINE_POINTER, gsap, reducedMotion } from './motion.js';

const PULL = 0.28; // how much of the pointer's offset a magnetic element follows

export function mountMedia(root, { media }) {
  if (reducedMotion) return;

  gsap.utils.toArray('[data-media]', root).forEach((figure) => {
    const frame = figure.querySelector('.media__frame') ?? figure;
    const image = frame.querySelector('img');
    const reveal = gsap.timeline({ scrollTrigger: { trigger: figure, start: 'top 90%', once: true } });

    reveal.fromTo(
      frame,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: DURATION.slow, ease: EASE.inOut, clearProps: 'clipPath' },
    );
    if (image) reveal.fromTo(image, { scale: 1.2 }, { scale: 1, duration: 1.7, ease: EASE.out }, 0);
  });

  gsap.utils.toArray('[data-parallax]', root).forEach((element) => {
    const amount = Number(element.dataset.parallax) || 8;
    gsap.fromTo(
      element,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: {
          trigger: element.closest('[data-media]') ?? element.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
  });

  media.add(FINE_POINTER, () => {
    const cleanups = gsap.utils.toArray('[data-magnetic]', root).map((element) => {
      const moveX = gsap.quickTo(element, 'x', { duration: 0.5, ease: EASE.out });
      const moveY = gsap.quickTo(element, 'y', { duration: 0.5, ease: EASE.out });

      const onMove = (event) => {
        const box = element.getBoundingClientRect();
        moveX((event.clientX - (box.left + box.width / 2)) * PULL);
        moveY((event.clientY - (box.top + box.height / 2)) * PULL);
      };
      const onLeave = () => {
        moveX(0);
        moveY(0);
      };

      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
      return () => {
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  });
}
