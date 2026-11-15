// Turns content/site.json into the values the pages and the scripts use.
// The build runs this once (vite.config.js). The result reaches the HTML as
// {{site.person.number}} and the scripts as `site` from src/site.js.

import { PRICES, formatAmount, formatPhone, phoneDigits } from './schema.js';

const line = (value) => {
  const digits = phoneDigits(value);
  return { number: formatPhone(value), whatsapp: `https://wa.me/${digits}`, tel: `tel:+${digits}` };
};

/** @param {object} content  a checked and tidied content object */
export function derive(content) {
  const keys = PRICES.map((item) => item.key);
  return {
    // The WhatsApp chatbot. Replies are automated.
    chatbot: line(content.contact.chatbot),
    // A person on the team, on WhatsApp and by phone. Briefs and estimates go here.
    person: line(content.contact.person),
    email: content.contact.email,

    // Prices three ways: numbers for sums, "350,000" for text, "350000" for data-count.
    prices: Object.fromEntries(keys.map((key) => [key, content.prices[key]])),
    price: Object.fromEntries(keys.map((key) => [key, formatAmount(content.prices[key])])),
    amount: Object.fromEntries(keys.map((key) => [key, String(content.prices[key])])),

    origin: content.seo.origin,

    // Where a brief is saved besides WhatsApp. Off until a project ID is set.
    leads: {
      on: Boolean(content.leads.projectId),
      projectId: content.leads.projectId,
      inbox: content.leads.inbox,
    },
  };
}
