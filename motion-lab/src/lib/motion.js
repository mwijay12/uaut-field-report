// One place for GSAP setup and the motion tokens. Import gsap from here, not
// from 'gsap', so the plugins are always registered.

import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Three durations (seconds) and one easing family. Mirrors tokens.css.
export const DURATION = { fast: 0.3, base: 0.6, slow: 1.1 };
export const EASE = { out: 'power3.out', inOut: 'power3.inOut' };

// Media queries shared by the effects that need a mouse.
export const FINE_POINTER = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

gsap.defaults({ ease: EASE.out, duration: DURATION.base });

// Mobile browsers resize the viewport when the address bar slides. Ignore that.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText };
