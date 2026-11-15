// Dark, mix or light: the three modes of the site. A mode is how the whole
// site is shown.
//
//   dark   every section is shown by night
//   mix    each section in the theme it was written for (its data-theme)
//   light  every section is shown by day
//
// A visitor who picks one keeps it. One who has not picked gets "auto", which
// goes by their own clock: light while the sun is up, when a dark page is hard
// to read on a phone outdoors, dark at night, and the mix at dawn and dusk.
//
// Like the rest of this folder, this file has no imports and uses no browser
// or Node APIs. The build writes the source of pickMode() into the <head> of
// every page (src/partials/head.html), where it runs before the first paint,
// and src/lib/mode.js calls the same function afterwards. So pickMode() has to
// stay one function that needs nothing from outside itself.

/** The modes, in the order the small button in the header steps through them. */
export const MODES = ['light', 'mix', 'dark'];

/** What a visitor can choose, in the order of the switch. */
export const CHOICES = ['auto', ...MODES];

/** Where a choice is kept, in localStorage. Nothing is kept while it is "auto". */
export const MODE_KEY = 'altraware:theme';

/** The browser's own bar takes the page colour. Keep these in step with --bg in src/styles/tokens.css. */
export const THEME_COLORS = { night: '#071022', day: '#f7f6f2' };

/**
 * @param {string|null} stored  what the visitor chose before, if anything
 * @param {string} search       the query of the address. ?theme=dark (or light, mix, auto) wins
 *                              over a stored choice, for that visit only: it is how to see one
 *                              mode from a test, or to send someone a link to it
 * @param {number} hour         0 to 23, on the visitor's own clock
 * @returns {{ choice: string, mode: string }}  choice: auto, light, mix or dark. mode: what to show
 */
export function pickMode(stored, search, hour) {
  // In Dar es Salaam the sun is up from about six in the morning until about
  // half past six in the evening, all year. So: light from seven in the
  // morning until six in the evening, dark from seven in the evening until six
  // in the morning, and the mix for the hour in between, at dawn and at dusk.
  var LIGHT_FROM = 7;
  var LIGHT_UNTIL = 18;
  var DARK_FROM = 19;
  var DARK_UNTIL = 6;

  var asked = /[?&]theme=(auto|light|mix|dark)(?:&|$)/.exec(search || '');
  var choice = asked ? asked[1] : stored === 'light' || stored === 'mix' || stored === 'dark' ? stored : 'auto';
  var mode = choice;
  if (choice === 'auto') {
    if (hour >= LIGHT_FROM && hour < LIGHT_UNTIL) mode = 'light';
    else if (hour >= DARK_FROM || hour < DARK_UNTIL) mode = 'dark';
    else mode = 'mix';
  }
  return { choice: choice, mode: mode };
}
