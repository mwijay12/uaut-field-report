// The facts of the site: phone lines, email, prices and where briefs are saved.
// They live in content/site.json, which the admin at /admin/ edits. The build
// checks that file, works these values out (content/derive.js) and places them
// here, so a number cannot be right on one page and wrong on another.
//
// In HTML, write {{site.person.number}}, {{site.person.whatsapp}},
// {{site.person.tel}}, {{site.chatbot.number}}, {{site.chatbot.whatsapp}},
// {{site.email}}, {{site.social.instagram}}, {{site.price.starter}} (350,000)
// or {{site.amount.starter}} (350000). The build fails on a name that does not
// exist.

/* global __SITE__ */

/**
 * @type {{
 *   chatbot: { number: string, whatsapp: string, tel: string },
 *   person: { number: string, whatsapp: string, tel: string },
 *   email: string,
 *   social: { instagram: string, linkedin: string },
 *   prices: Record<string, number>,
 *   price: Record<string, string>,
 *   leads: { on: boolean, projectId: string },
 * }}
 */
export const site = __SITE__;
