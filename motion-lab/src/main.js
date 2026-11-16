// Entry point. Builds the things that outlive a page (stage, scroll, header,
// curtain) and hands page changes to Barba.
//
// Who does what:
//   raw WebGL + GLSL   the chart behind everything              src/gl
//   tween.js           the chart's values, between looks        src/gl/stage.js
//   GSAP               scroll effects, text, numbers, curtain   src/lib, src/pages
//   Lenis              smooth scrolling                         src/lib/scroll.js
//   Barba              page changes without a reload            this file
//   Anime.js           intro, menu and small flourishes         src/lib/intro.js, chrome.js

import barba from '@barba/core';
import { Easing, createNullStage, createStage } from './gl/stage.js';
import { preset } from './gl/presets.js';
import { createChrome } from './lib/chrome.js';
import { createChat } from './lib/chat.js';
import { createCurtain } from './lib/curtain.js';
import { playIntro } from './lib/intro.js';
import { EASE, gsap, reducedMotion } from './lib/motion.js';
import { createMode } from './lib/mode.js';
import { mountPage } from './lib/page.js';
import { ROUTES, routeOf } from './lib/routes.js';
import { createScroll } from './lib/scroll.js';
import { THEME_COLORS } from '../content/mode.js';

const root = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');
const announcer = document.querySelector('[data-announcer]');

// ---------- Things that live for the whole visit ----------

// For testing: ?gl=live forces animation on any machine, ?gl=still draws only
// on change, ?gl=off behaves as if WebGL 2 were missing. ?slow=6 plays every
// animation six times slower, to look at a transition frame by frame.
const query = new URLSearchParams(window.location.search);
const glMode = query.get('gl');
const slow = Number(query.get('slow'));
if (slow > 1) {
  gsap.globalTimeline.timeScale(1 / Math.min(slow, 20));
  window.altraMotion = gsap; // a handle for pausing on a frame from a test script
}
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
const curtain = createCurtain();
// Altra floats over the page and outlives a page change, so it is built here
// with the header and not inside a page.
const chat = createChat();

// One loop for everything: GSAP's ticker drives Lenis and the WebGL draw.
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, delta) => {
  scroll.raf(time * 1000);
  stage.tick(time, delta);
});

// A section says which theme it was written for. What is shown also depends on
// the mode the visitor is in: dark and light show one theme all the way down the
// page, and only the mix follows the sections (src/lib/mode.js).
let written = root.dataset.theme;

const mode = createMode({
  onChange: () => setTheme(written, {}),
  announce: (text) => {
    announcer.textContent = text;
  },
});

function setTheme(theme, options) {
  written = theme;
  const shown = mode.themeFor(theme);
  if (root.dataset.theme === shown && !options) return;
  root.dataset.theme = shown;
  themeColor?.setAttribute('content', THEME_COLORS[shown] ?? THEME_COLORS.night);
  stage.theme(shown === 'day', options);
}

let page = null;
const deps = { stage, scroll, setTheme };

function fontsReady() {
  const wanted = ['330 1em Fraunces', 'italic 300 1em Fraunces', '400 1em Inter'];
  const loading = Promise.all(wanted.map((font) => document.fonts.load(font))).catch(() => {});
  const giveUp = new Promise((resolve) => setTimeout(resolve, 2000));
  return Promise.race([loading, giveUp]);
}

// ---------- Where the reader was ----------
// Back and Forward return to the place the reader left, like a normal browser.

const places = new Map();
const placeKey = (url) => url.href.split('#')[0];
const viaHistory = (trigger) => trigger === 'back' || trigger === 'forward' || trigger === 'popstate';
const anchorOf = (hash) => (hash ? document.getElementById(hash.replace(/^#/, '')) : null);

/**
 * Put the new page where it should open: a remembered place after Back or
 * Forward, the anchor if the link had one, otherwise the top.
 * Returns true when that is somewhere other than the top.
 */
function openAt(next, trigger) {
  const remembered = viaHistory(trigger) ? places.get(placeKey(next.url)) : 0;
  // Barba drops the #anchor from the address, so it is read from the link that was clicked.
  const hash = trigger instanceof HTMLAnchorElement ? trigger.hash : '';
  const anchor = anchorOf(hash);

  if (remembered) {
    scroll.jump(remembered);
  } else if (anchor) {
    history.replaceState(history.state, '', window.location.pathname + window.location.search + hash);
    scroll.jump(anchor);
  }
  return Boolean(remembered || anchor);
}

// ---------- Page changes ----------

let direction = 1; // 1: the curtain rises. -1: it falls.

// Barba changes the title. The rest of what describes a page to a search
// engine or a share card (description, canonical address, structured data)
// is marked data-head in src/partials/head.html, and is changed here.
function describe(html) {
  const incoming = new DOMParser().parseFromString(html, 'text/html').head.querySelectorAll('[data-head]');
  if (!incoming.length) return;
  document.head.querySelectorAll('[data-head]').forEach((node) => node.remove());
  document.head.querySelector('title').after(...[...incoming].map((node) => document.importNode(node, true)));
}

barba.init({
  timeout: 10000,
  preventRunning: true,
  transitions: [
    {
      name: 'curtain',

      // First load. The chart fades up from nothing while the intro plays.
      async once({ next }) {
        const first = next.container.querySelector('[data-theme]');
        const look = preset(first?.dataset.stage);
        setTheme(first?.dataset.theme ?? 'night', { duration: 0 });
        stage.look({ ...look, ink: 0, scale: look.scale * 0.72 }, { duration: 0 });
        stage.look(look, { duration: 2200, easing: Easing.Quartic.Out });
        // A page that opens on a plain section opens plain, not with a chart that then fades.
        stage.calm(Number(first?.dataset.calm) || 0, { duration: 0 });

        await Promise.all([fontsReady(), playIntro()]);

        page = mountPage(next.container, deps);
        const anchor = anchorOf(window.location.hash);
        if (anchor) scroll.jump(anchor);
        page.scenes.sync({ duration: 1200, easing: Easing.Quartic.Out });
        root.classList.add('is-ready');
        page.enter();
      },

      before({ current }) {
        // The panel is under the curtain, and focus belongs to the page that is
        // arriving, not to a conversation nobody is looking at.
        chat.close();
        places.set(placeKey(current.url), window.scrollY);
      },

      // The curtain crosses the screen with the name of the next page on it,
      // while the chart surges underneath.
      async leave({ current, next, trigger }) {
        scroll.stop();

        const from = ROUTES.indexOf(routeOf(current.url.path));
        const to = routeOf(next.url.path);
        if (trigger === 'back') direction = -1;
        else if (trigger === 'forward') direction = 1;
        else direction = ROUTES.indexOf(to) >= from ? 1 : -1;

        if (reducedMotion) {
          await gsap.to(current.container, { autoAlpha: 0, duration: 0.15, ease: 'none' });
          return;
        }

        stage.surge(1, { duration: 800, easing: Easing.Quartic.In });
        await curtain.cover({ direction, route: to });
      },

      // Barba keeps the old container until the end. Remove it now so the new
      // page is measured on its own.
      beforeEnter({ current, next }) {
        // An open menu stays open until the curtain has covered it.
        chrome.closeMenu();
        scroll.stop();
        page?.destroy();
        page = null;
        current.container.remove();
        scroll.reset();
        describe(next.html);
        mode.refresh();
        root.dataset.page = next.namespace;
        chrome.setCurrent(next.namespace);
      },

      // Behind the curtain the chart travels to the new page's place on the
      // map. Then the curtain lifts and the page arrives.
      async enter({ next, trigger }) {
        page = mountPage(next.container, deps, { returning: viaHistory(trigger) });
        const moved = openAt(next, trigger);
        page.scenes.sync({ duration: 1500 });
        stage.surge(0, { duration: 1200, easing: Easing.Quartic.Out });

        if (reducedMotion) {
          gsap.from(next.container, { autoAlpha: 0, duration: 0.15, ease: 'none' });
          return;
        }

        // The page slides in under the curtain, but only when it opens at the
        // top: further down a pinned section may be in play, and a moving
        // parent would drag it along.
        if (!moved) {
          gsap.fromTo(
            next.container,
            { y: 110 * direction },
            { y: 0, duration: 1.1, ease: EASE.out, delay: 0.16, clearProps: 'transform' },
          );
        }
        gsap.delayedCall(0.5, () => page?.enter());
        await curtain.reveal({ direction });
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
    const sameQuery = !url.search || url.search === window.location.search;
    const toTop = link.hasAttribute('data-to-top') || (samePage && sameQuery && !url.hash);
    if (!samePage || !toTop) return;

    event.preventDefault();
    chrome.closeMenu();
    scroll.to(0);
  },
  true,
);
