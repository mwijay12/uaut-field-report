// The parts of the interface that survive a page change: header, status line
// and the small-screen menu. Anime.js handles the menu's entrance.

import { animate, stagger } from 'animejs';
import { ScrollTrigger, reducedMotion } from './motion.js';

// Published office hours: Monday to Saturday, 8:00 to 18:00, East Africa Time.
const OPENS = 8;
const CLOSES = 18;
const CLOSED_DAY = 'Sun';

export function createChrome({ scroll }) {
  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const status = document.querySelector('[data-status]');
  const statusText = document.querySelector('[data-status-text]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const toggleLabel = document.querySelector('[data-menu-label]');
  const menu = document.querySelector('[data-menu]');
  const wide = window.matchMedia('(min-width: 821px)');

  let menuOpen = false;

  // ---------- Status: local time in Dar es Salaam, and whether the office is open ----------

  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Dar_es_Salaam',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  function updateStatus() {
    const parts = Object.fromEntries(clock.formatToParts(new Date()).map((part) => [part.type, part.value]));
    const hour = Number(parts.hour);
    const open = parts.weekday !== CLOSED_DAY && hour >= OPENS && hour < CLOSES;
    status.classList.toggle('is-open', open);
    statusText.textContent = `${open ? 'Open' : 'Closed'} · Dar es Salaam ${parts.hour}:${parts.minute} EAT`;
  }

  updateStatus();
  setInterval(updateStatus, 20_000);

  // ---------- Header: hides on the way down, returns on the way up ----------

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      header.classList.toggle('is-stuck', y > 40);
      header.classList.toggle('is-hidden', !menuOpen && self.direction === 1 && y > 240);
    },
  });

  // ---------- Menu ----------

  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('is-menu-open', open);
    menu.hidden = !open;

    // While the menu is open, the page behind it is out of reach for keyboard and screen readers.
    const main = document.querySelector('main');
    if (main) main.inert = open;

    if (open) {
      scroll.stop();
      header.classList.remove('is-hidden');
      if (!reducedMotion) {
        animate(menu, { opacity: { from: 0, to: 1 }, duration: 300, ease: 'outQuart' });
        animate(menu.querySelectorAll('.menu__link, .menu__foot'), {
          opacity: { from: 0, to: 1 },
          translateY: { from: 28, to: 0 },
          delay: stagger(70, { start: 80 }),
          duration: 700,
          ease: 'outQuart',
        });
      }
    } else {
      scroll.start();
    }
  }

  toggle.addEventListener('click', () => setMenu(!menuOpen));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuOpen) {
      setMenu(false);
      toggle.focus();
    }
  });

  wide.addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  return {
    closeMenu: () => setMenu(false),

    /** Mark the current page in the header and the menu. */
    setCurrent(page) {
      document.querySelectorAll('[data-nav]').forEach((link) => {
        if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    },
  };
}
