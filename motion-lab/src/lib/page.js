// Mounts whatever is inside a Barba container, and tears it down again.
// Everything GSAP creates is collected in one context so a single revert()
// removes it when the page leaves.

import { mountDrawings } from './draw.js';
import { mountMarquee } from './marquee.js';
import { mountMedia } from './media.js';
import { ScrollTrigger, gsap } from './motion.js';
import { mountNumbers } from './numbers.js';
import { mountReveals } from './reveal.js';
import { mountScenes } from './scenes.js';
import { mountStickers } from './stickers.js';
import { mountText } from './text.js';
import { mountContact } from '../pages/contact.js';
import { mountHome } from '../pages/home.js';
import { mountPricing } from '../pages/pricing.js';
import { mountServices } from '../pages/services.js';
import { mountWork } from '../pages/work.js';

// Keyed by data-barba-namespace. A page with nothing special needs no entry.
const PAGES = {
  home: mountHome,
  work: mountWork,
  services: mountServices,
  pricing: mountPricing,
  contact: mountContact,
};

/**
 * @param {HTMLElement} container  the Barba container
 * @param {object} deps            stage, scroll, setTheme
 * @param {{ returning?: boolean }} [arrival]  returning: reached with Back or Forward
 */
export function mountPage(container, deps, arrival = {}) {
  const media = gsap.matchMedia();
  const cleanups = [];
  let scenes;
  let reveals;
  let stickers;

  const context = gsap.context(() => {
    // Page code first: it holds the pinned scenes, and anything that pins has
    // to exist before the triggers below it are measured.
    cleanups.push(PAGES[container.dataset.barbaNamespace]?.(container, { ...deps, ...arrival, media }));

    // Then the effects any page can ask for through data attributes.
    cleanups.push(mountMarquee(container));
    mountMedia(container, { media });
    mountNumbers(container);
    mountText(container);
    mountDrawings(container);
    stickers = mountStickers(container, { media });

    scenes = mountScenes(container, deps);
    reveals = mountReveals(container);
  }, container);

  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  return {
    scenes,
    enter() {
      reveals.enter();
      stickers?.enter();
    },
    destroy() {
      stickers?.destroy();
      cleanups.forEach((cleanup) => cleanup?.());
      media.revert();
      context.revert();
    },
  };
}
