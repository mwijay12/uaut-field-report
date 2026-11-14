// Pricing page: the estimator. The form holds the choices, src/lib/estimate.js
// does the sums, and this file puts the results on the page. Numbers count to
// their new value instead of jumping.

import { compact, estimate, fromQuery, shillings, toQuery } from '../lib/estimate.js';
import { tweenNumber } from '../lib/numbers.js';

const STORE_KEY = 'altraware:estimate';

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
