// The project estimator. The numbers and the rules are the ones Altraware
// publishes on its own pricing page:
//
//   - a base price per kind of project, plus a price per add-on
//   - 10% off the add-ons when three or more are chosen
//   - a complexity score out of 10: a weight for the kind of project, plus one per add-on
//   - a contingency of 15%, plus 1.5% per point of complexity, which gives the top of the range
//   - VAT at 18% on the top of the range, when asked for
//   - a timeline per kind of project, a little longer with more add-ons
//
// An estimate is a guide. The real quote is fixed and written.

export const KINDS = [
  { id: 'website', label: 'Website', base: 350_000, weight: 2, weeks: [1, 2] },
  { id: 'app', label: 'Web or mobile app', base: 800_000, weight: 5, weeks: [4, 6] },
  { id: 'system', label: 'Business system', base: 1_200_000, weight: 7, weeks: [6, 10] },
];

export const ADD_ONS = [
  { id: 'mpesa', label: 'Payment integration', cost: 350_000 },
  { id: 'bilingual', label: 'Kiswahili and English', cost: 200_000 },
  { id: 'booking', label: 'Booking and orders', cost: 350_000 },
  { id: 'offline', label: 'Offline-first sync', cost: 450_000 },
  { id: 'notifications', label: 'Smart notifications', cost: 250_000 },
  { id: 'training', label: 'Team training and manuals', cost: 200_000 },
];

export const SUPPORT = [
  { id: 'none', label: 'No support plan', monthly: 0 },
  { id: 'tunza', label: 'Essential Support', monthly: 99_000 },
  { id: 'kuza', label: 'Growth Support', monthly: 249_000 },
];

export const VAT = 0.18;
const BUNDLE_AT = 3;
const BUNDLE_OFF = 0.1;

/**
 * @param {{ kind: string, addOns: string[], vat: boolean, support: string }} choice
 */
export function estimate({ kind, addOns = [], vat = false, support = 'none' }) {
  const chosenKind = KINDS.find((item) => item.id === kind) ?? KINDS[0];
  const chosenAddOns = ADD_ONS.filter((item) => addOns.includes(item.id));
  const plan = SUPPORT.find((item) => item.id === support) ?? SUPPORT[0];

  const listed = chosenAddOns.reduce((sum, item) => sum + item.cost, 0);
  const bundled = chosenAddOns.length >= BUNDLE_AT;
  const extras = Math.round(listed * (bundled ? 1 - BUNDLE_OFF : 1));
  const low = chosenKind.base + extras;

  const complexity = Math.min(10, chosenKind.weight + chosenAddOns.length);
  const contingencyRate = 0.15 + complexity * 0.015;
  const contingency = Math.round(low * contingencyRate);
  const high = low + contingency;
  const tax = vat ? Math.round(high * VAT) : 0;

  const longer = Math.round(chosenAddOns.length * 0.4);

  return {
    kind: chosenKind,
    addOns: chosenAddOns,
    plan,
    base: chosenKind.base,
    extras,
    saved: listed - extras,
    bundled,
    low,
    complexity,
    contingencyRate,
    contingency,
    high,
    tax,
    total: high + tax,
    weeks: [chosenKind.weeks[0] + longer, chosenKind.weeks[1] + longer],
  };
}

/** TSh 1,250,000 */
export const shillings = (value) => `TSh ${Math.round(value).toLocaleString('en-US')}`;

/** The choices as a query string, and back. Used to carry an estimate to the contact page. */
export function toQuery({ kind, addOns, vat, support }) {
  const query = new URLSearchParams({ kind });
  if (addOns.length) query.set('with', addOns.join(','));
  if (vat) query.set('vat', '1');
  if (support !== 'none') query.set('support', support);
  return query.toString();
}

export function fromQuery(query) {
  const kind = query.get('kind');
  if (!KINDS.some((item) => item.id === kind)) return null;
  const known = new Set(ADD_ONS.map((item) => item.id));
  const support = query.get('support');
  return {
    kind,
    addOns: (query.get('with') ?? '').split(',').filter((id) => known.has(id)),
    vat: query.get('vat') === '1',
    support: SUPPORT.some((item) => item.id === support) ? support : 'none',
  };
}

/** TSh 1.84M, TSh 350K. For the large figures on the page. */
export function compact(value) {
  if (value < 1_000_000) return `TSh ${Math.round(value / 1000)}K`;
  return `TSh ${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
}

const nearestThousand = (value) => Math.round(value / 1000) * 1000;

/** A few lines for a message: what was chosen and what it comes to. */
export function describe(choice) {
  const result = estimate(choice);
  const parts = [`Estimate: ${result.kind.label}`];
  if (result.addOns.length) parts[0] += ` with ${result.addOns.map((item) => item.label.toLowerCase()).join(', ')}`;
  const top = shillings(nearestThousand(result.high));
  const taxed = choice.vat ? `, or ${shillings(nearestThousand(result.total))} with VAT` : '';
  parts.push(`Range: ${shillings(result.low)} to ${top}${taxed}`);
  parts.push(`Timeline: about ${result.weeks[0]} to ${result.weeks[1]} weeks`);
  if (result.plan.monthly) parts.push(`Support: ${result.plan.label}, ${shillings(result.plan.monthly)} a month`);
  return parts.join('\n');
}
