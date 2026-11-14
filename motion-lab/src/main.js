// Entry point. Builds the things that outlive a page (stage, scroll, header)
// and hands page changes to Barba.
//
// Who does what:
//   raw WebGL + GLSL   the chart behind everything          src/gl
//   tween.js           the chart's values, between looks    src/gl/stage.js
//   GSAP               scroll reveals, pinning, transitions src/lib, src/pages
//   Lenis              smooth scrolling                     src/lib/scroll.js
//   Barba              page changes without a reload        this file
//   Anime.js           intro, menu and small flourishes     src/lib/intro.js, chrome.js

import barba from '@barba/core';
import { Easing, createNullStage, createStage } from './gl/stage.js';
import { preset } from './gl/presets.js';
import { createChrome } from './lib/chrome.js';
import { playIntro } from './lib/intro.js';
import { DURATION, EASE, gsap, reducedMotion } from './lib/motion.js';
import { mountPage } from './lib/page.js';
import { createScroll } from './lib/scroll.js';

const root = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');
const announcer = document.querySelector('[data-announcer]');
const card = document.querySelector('[data-titlecard]');
const cardWord = document.querySelector('[data-titlecard-word]');
const cardSub = document.querySelector('[data-titlecard-sub]');

// The word shown between two pages: Swahili first, English under it.
const CARDS = {
  home: ['Nyumbani', 'Home'],
  work: ['Kazi', 'Work'],
  contact: ['Tuongee', 'Start a project'],
};

const THEME_COLORS = { night: '#071022', day: '#f7f6f2' };

// ---------- Things that live for the whole visit ----------

// For testing: ?gl=live forces animation on any machine, ?gl=still draws only
// on change, ?gl=off behaves as if WebGL 2 were missing.
const glMode = new URLSearchParams(window.location.search).get('gl');
const withoutWebgl = () => root.classList.add('no-webgl');
const canvas = document.querySelector('[data-stage-canvas]');
const webgl =
  glMode === 'off'
    ? null
    : createStage(canvas, {
        still: reducedMotion,
        mode: glMode === 'live' || glMode === 'still' ? glMode : 'auto',
        onFail: withoutWebgl,
      });
const stage = webgl ?? createNullStage();
if (!webgl) withoutWebgl();
if (glMode) window.altraStage = stage; // a handle for poking at the chart from the console

const scroll = createScroll();
const chrome = createChrome({ scroll });

// One loop for everything: GSAP's ticker drives Lenis and the WebGL draw.
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, delta) => {
  scroll.raf(time * 1000);
  stage.tick(time, delta);
});

function setTheme(theme, options) {
  if (root.dataset.theme === theme && !options) return;
  root.dataset.theme = theme;
  themeColor?.setAttribute('content', THEME_COLORS[theme] ?? THEME_COLORS.night);
  stage.theme(theme === 'day', options);
}

let page = null;
const deps = { stage, scroll, setTheme };

function pageOf(path) {
  if (path.startsWith('/work')) return 'work';
  if (path.startsWith('/contact')) return 'contact';
  return 'home';
}

function fontsReady() {
  const wanted = ['330 1em Fraunces', 'italic 300 1em Fraunces', '400 1em Inter'];
  const loading = Promise.all(wanted.map((font) => document.fonts.load(font))).catch(() => {});
  const giveUp = new Promise((resolve) => setTimeout(resolve, 2000));
  return Promise.race([loading, giveUp]);
}

// ---------- Page changes ----------

barba.init({
  timeout: 10000,
  preventRunning: true,
  transitions: [
    {
      name: 'travel',

      // First load. The chart fades up from nothing while the intro plays.
      async once({ next }) {
        const first = next.container.querySelector('[data-theme]');
        const look = preset(first?.dataset.stage);
        setTheme(first?.dataset.theme ?? 'night', { duration: 0 });
        stage.look({ ...look, ink: 0, scale: look.scale * 0.72 }, { duration: 0 });
        stage.look(look, { duration: 2200, easing: Easing.Quartic.Out });

        await Promise.all([fontsReady(), playIntro()]);

        page = mountPage(next.container, deps);
        page.scenes.apply(page.scenes.first, { duration: 1200, easing: Easing.Quartic.Out });
        root.classList.add('is-ready');
        page.enter();
      },

      before() {
        chrome.closeMenu();
      },

      // The page lifts away, the chart surges, and the name of the next page rises.
      async leave({ current, next }) {
        scroll.stop();

        if (reducedMotion) {
          await gsap.to(current.container, { autoAlpha: 0, duration: 0.15, ease: 'none' });
          return;
        }

        const [word, sub] = CARDS[pageOf(next.url.path)];
        cardWord.textContent = word;
        cardSub.textContent = sub;
        stage.surge(1, { duration: 700, easing: Easing.Quartic.In });

        await gsap
          .timeline()
          .to(current.container, { autoAlpha: 0, y: -48, duration: 0.5, ease: EASE.inOut }, 0)
          .set(card, { autoAlpha: 1 }, 0.3)
          .fromTo(cardWord, { yPercent: 115 }, { yPercent: 0, duration: 0.7, ease: EASE.out }, 0.3)
          .fromTo(cardSub, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.fast, ease: 'none' }, 0.55);
      },

      // Barba keeps the old container until the end. Remove it now so the new
      // page is measured on its own.
      beforeEnter({ current, next }) {
        page?.destroy();
        page = null;
        current.container.remove();
        scroll.reset();
        root.dataset.page = next.namespace;
        chrome.setCurrent(next.namespace);
      },

      // The chart travels to the new page's place on the map, then the page arrives.
      async enter({ next }) {
        page = mountPage(next.container, deps);
        page.scenes.apply(page.scenes.first, { duration: 1500 });
        stage.surge(0, { duration: 1100, easing: Easing.Quartic.Out });

        if (reducedMotion) {
          gsap.from(next.container, { autoAlpha: 0, duration: 0.15, ease: 'none' });
          return;
        }

        await gsap
          .timeline()
          .to(cardWord, { yPercent: -115, duration: 0.55, ease: EASE.inOut }, 0.25)
          .to(cardSub, { autoAlpha: 0, duration: DURATION.fast, ease: 'none' }, 0.25)
          .set(card, { autoAlpha: 0 });

        page.enter();
      },

      after({ next }) {
        scroll.start();
        // Tell keyboard and screen reader users that the page changed.
        next.container.focus({ preventScroll: true });
        announcer.textContent = document.title;
      },
    },
  ],
});

// ---------- Small global behaviours ----------

// A link to the page you are already on scrolls to the top instead of reloading.
document.addEventListener(
  'click',
  (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || link.target === '_blank' || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const url = new URL(link.href, window.location.href);
    const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname;
    const toTop = link.hasAttribute('data-to-top') || (samePage && url.search === window.location.search && !url.hash);
    if (!samePage || !toTop) return;

    event.preventDefault();
    chrome.closeMenu();
    scroll.to(0);
  },
  true,
);
