// Pricing page: the estimator. The form holds the choices, src/lib/estimate.js
// does the sums, and this file puts the results on the page. Numbers count to
// their new value instead of jumping.

import { compact, estimate, fromQuery, shillings, toQuery } from '../lib/estimate.js';
import { gsap, reducedMotion } from '../lib/motion.js';
import { tweenNumber } from '../lib/numbers.js';

const STORE_KEY = 'altraware:estimate';

// One line drawing beside the range. It turns into the thing that is chosen:
// a browser window, a phone, a database.
const GLYPHS = {
  website: 'M9 10h30a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z M5 18h38',
  app: 'M18 4h12a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z M21 38h6',
  system: 'M9 12c0-3.3 6.7-6 15-6s15 2.7 15 6-6.7 6-15 6-15-2.7-15-6z M9 12v24c0 3.3 6.7 6 15 6s15-2.7 15-6V12',
};

function remembered() {
  try {
    return fromQuery(new URLSearchParams(sessionStorage.getItem(STORE_KEY) ?? ''));
  } catch {
    return null; // storage can be blocked
  }
}

function remember(query) {
  try {
    sessionStorage.setItem(STORE_KEY, query);
  } catch {
    // Nothing to do: the estimate simply starts fresh next time.
  }
}

export function mountPricing(root, { returning = false } = {}) {
  const form = root.querySelector('[data-estimator]');
  if (!form) return undefined;

  const out = (name) => form.querySelector(`[data-estimate-${name}]`);
  const addOnInputs = [...form.querySelectorAll('input[name="with"]')];

  const read = () => ({
    kind: form.elements.kind.value,
    addOns: addOnInputs.filter((input) => input.checked).map((input) => input.value),
    vat: form.elements.vat.checked,
    support: form.elements.support.value,
  });

  const write = (choice) => {
    form.elements.kind.value = choice.kind;
    form.elements.support.value = choice.support;
    form.elements.vat.checked = choice.vat;
    addOnInputs.forEach((input) => {
      input.checked = choice.addOns.includes(input.value);
    });
  };

  // A link such as /pricing/?kind=app&with=mpesa#estimator arrives with those
  // chosen. Coming back with Back or Forward, or with no choice in the link,
  // the form opens the way the visitor last left it.
  const linked = fromQuery(new URLSearchParams(window.location.search));
  const starting = returning ? (remembered() ?? linked) : (linked ?? remembered());
  if (starting) write(starting);

  function render() {
    const choice = read();
    const result = estimate(choice);
    const query = toQuery(choice);

    const glyph = out('glyph');
    if (glyph.dataset.kind !== choice.kind) {
      const moving = Boolean(glyph.dataset.kind) && !reducedMotion; // the first one is simply there
      glyph.dataset.kind = choice.kind;
      if (moving) gsap.to(glyph, { morphSVG: GLYPHS[choice.kind], duration: 0.7, ease: 'power3.inOut', overwrite: true });
      else glyph.setAttribute('d', GLYPHS[choice.kind]);
    }

    tweenNumber(out('low'), result.low, compact);
    tweenNumber(out('high'), result.high, compact);
    out('weeks').textContent = `${result.weeks[0]} to ${result.weeks[1]}`;

    out('monthly-row').hidden = !result.plan.monthly;
    tweenNumber(out('monthly'), result.plan.monthly, shillings);

    out('complexity').textContent = result.complexity;
    out('gauge').style.transform = `scaleX(${result.complexity / 10})`;

    tweenNumber(out('base'), result.base, shillings);
    out('count').textContent = `(${result.addOns.length})`;
    tweenNumber(out('extras'), result.extras, shillings);
    out('rate').textContent = `(${Math.round(result.contingencyRate * 1000) / 10}%)`;
    tweenNumber(out('contingency'), result.contingency, shillings);

    out('tax-row').hidden = !choice.vat;
    tweenNumber(out('tax'), result.tax, shillings);
    out('total-label').textContent = choice.vat ? 'Top of the range, with VAT' : 'Top of the range';
    tweenNumber(out('total'), result.total, shillings);

    out('bundle').hidden = !result.bundled;
    out('saved').textContent = shillings(result.saved);

    out('send').href = `/contact/?${query}`;
    remember(query);
  }

  form.addEventListener('change', render);
  render();

  return () => form.removeEventListener('change', render);
}
