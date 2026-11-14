// Mounts whatever is inside a Barba container, and tears it down again.
// Everything GSAP creates is collected in one context so a single revert()
// removes it when the page leaves.

import { ScrollTrigger, gsap } from './motion.js';
import { mountReveals } from './reveal.js';
import { mountScenes } from './scenes.js';
import { mountContact } from '../pages/contact.js';
import { mountHome } from '../pages/home.js';
import { mountWork } from '../pages/work.js';

// Keyed by data-barba-namespace. A page with nothing special needs no entry.
const PAGES = { home: mountHome, work: mountWork, contact: mountContact };

export function mountPage(container, deps) {
  const media = gsap.matchMedia();
  let scenes;
  let reveals;
  let unmount;

  const context = gsap.context(() => {
    // Page code first: it holds the pinned scenes, and anything that pins has
    // to exist before the triggers below it are measured.
    unmount = PAGES[container.dataset.barbaNamespace]?.(container, { ...deps, media });
    scenes = mountScenes(container, deps);
    reveals = mountReveals(container);
  }, container);

  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  return {
    scenes,
    enter: () => reveals.enter(),
    destroy() {
      unmount?.();
      media.revert();
      context.revert();
    },
  };
}
