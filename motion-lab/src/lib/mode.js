// Dark, mix or light: the mode the whole site is shown in (content/mode.js).
//
// The <head> has already settled it before the first paint and left two
// attributes on <html> (src/partials/head.html):
//
//   data-mode="light|mix|dark"              the mode in use
//   data-mode-choice="auto|light|mix|dark"  what the visitor chose. auto goes by the clock
//
// This file keeps those up to date and runs the two controls in
// src/partials/chrome.html: the switch (data-mode-switch, a group of radio
// buttons, in the header and in the menu) and the small button that steps to
// the next mode (data-mode-step, in the header of a narrow screen).
//
// It changes no colours itself. The page asks themeFor() which theme to show
// for the section on screen, and is told when that answer has changed.

import { CHOICES, MODES, MODE_KEY, pickMode } from '../../content/mode.js';

const NAMES = { auto: 'Auto', light: 'Light', mix: 'Mix', dark: 'Dark' };

/**
 * @param {{ onChange: (mode: string) => void, announce: (text: string) => void }} hooks
 *   onChange: the mode has changed, show the right theme. announce: say it to a screen reader.
 */
export function createMode({ onChange, announce }) {
  const root = document.documentElement;
  const radios = [...document.querySelectorAll('[data-mode-switch] input')];
  const steppers = [...document.querySelectorAll('[data-mode-step]')];

  let choice = CHOICES.includes(root.dataset.modeChoice) ? root.dataset.modeChoice : 'auto';
  let mode = MODES.includes(root.dataset.mode) ? root.dataset.mode : 'mix';

  const byClock = () => pickMode(null, '', new Date().getHours()).mode;
  const after = (current) => MODES[(MODES.indexOf(current) + 1) % MODES.length];

  function show() {
    root.dataset.mode = mode;
    root.dataset.modeChoice = choice;
    radios.forEach((radio) => {
      radio.checked = radio.value === choice;
    });
    steppers.forEach((button) => button.setAttribute('aria-label', `Theme: ${NAMES[mode]}. Change to ${NAMES[after(mode)]}`));
  }

  function keep(value) {
    try {
      if (value === 'auto') localStorage.removeItem(MODE_KEY);
      else localStorage.setItem(MODE_KEY, value);
    } catch {
      // Storage can be blocked. The choice then lasts until the page is closed.
    }
  }

  function set(next, { quiet = false } = {}) {
    const before = mode;
    choice = next;
    mode = next === 'auto' ? byClock() : next;
    show();
    if (mode !== before) onChange(mode);
    if (!quiet) announce(choice === 'auto' ? `Theme: Auto, ${NAMES[mode].toLowerCase()} now` : `Theme: ${NAMES[mode]}`);
  }

  radios.forEach((radio) =>
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      keep(radio.value);
      set(radio.value);
    }),
  );

  steppers.forEach((button) =>
    button.addEventListener('click', () => {
      const next = after(mode);
      keep(next);
      set(next);
    }),
  );

  // Chosen in another tab: follow it here too.
  window.addEventListener('storage', (event) => {
    if (event.key !== MODE_KEY) return;
    set(MODES.includes(event.newValue) ? event.newValue : 'auto', { quiet: true });
  });

  // A tab left open from the afternoon into the night: look at the clock again
  // when the visitor comes back to it.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });

  function refresh() {
    if (choice === 'auto' && byClock() !== mode) set('auto', { quiet: true });
  }

  show();

  return {
    /** The theme to show for a section that was written for `theme` (night or day). */
    themeFor: (theme) => (mode === 'dark' ? 'night' : mode === 'light' ? 'day' : theme),

    /** On auto, look at the clock again. Called behind the curtain, where a change is not seen. */
    refresh,
  };
}
