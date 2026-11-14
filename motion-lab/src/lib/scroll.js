// Smooth scrolling with Lenis, kept in step with ScrollTrigger.
// With reduced motion there is no Lenis at all: the browser scrolls natively.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { ScrollTrigger, reducedMotion } from './motion.js';

export function createScroll() {
  // Barba swaps pages without a reload, so the browser must not restore scroll by itself.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const lenis = reducedMotion ? null : new Lenis({ lerp: 0.1, anchors: true, autoRaf: false });
  lenis?.on('scroll', ScrollTrigger.update);

  return {
    /** Advance Lenis. Called from the shared ticker with a time in milliseconds. */
    raf(milliseconds) {
      lenis?.raf(milliseconds);
    },

    /** Lock scrolling (menu open, page transition running). */
    stop() {
      if (lenis) lenis.stop();
      else document.documentElement.style.overflow = 'hidden';
    },

    start() {
      if (lenis) lenis.start();
      else document.documentElement.style.overflow = '';
    },

    /** Jump to the top with no animation. */
    reset() {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    },

    /** Go to a position or an element at once, with no animation. */
    jump(target) {
      // After a page change Lenis still holds the height of the page before.
      // Without a fresh measure it would stop short of a place further down.
      lenis?.resize();
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
      else if (typeof target === 'number') window.scrollTo(0, target);
      else target.scrollIntoView();
      ScrollTrigger.update();
    },

    /** Scroll to a position, selector or element. */
    to(target, options) {
      if (lenis) {
        lenis.scrollTo(target, options);
      } else if (typeof target === 'number') {
        window.scrollTo(0, target);
      } else {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        element?.scrollIntoView();
      }
    },
  };
}
