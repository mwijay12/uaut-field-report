// The estimator, with the site's current prices in it. The rules and the sums
// are in content/estimator.js.

import { createEstimator } from '../../content/estimator.js';
import { site } from '../site.js';

export const { KINDS, ADD_ONS, SUPPORT, estimate, toQuery, fromQuery, describe } = createEstimator(site.prices);
export { VAT, compact, shillings } from '../../content/estimator.js';
