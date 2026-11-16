// Writes a pack of prompts for one project: the brief, one image prompt per
// sticker, a screen that holds them, the motion, the share card and the check.
// The words are the ones in docs/agent-prompt-pack.md; this script fills the
// slots so the pack is about a named project and not about a type of project.
//
//   node scripts/prompts.mjs --list
//   node scripts/prompts.mjs --preset shule
//   node scripts/prompts.mjs --preset food --project "Bongo Foodie" --out docs/prompts/bongo-foodie.md
//   node scripts/prompts.mjs --project "Zion TZ" --about "…" --subjects "…" --palette "navy #071022, gold #eab308"
//
// Options
//   --preset <name>     a starting point (see --list). Default: generic
//   --project <name>    what it is called. Default: the preset's example name
//   --about <sentence>  one sentence: what the customer does with it
//   --reader <sentence> who reads the page, and on what
//   --action <sentence> the one thing the page should make them do
//   --proof <sentence>  facts we may use. Default: the honest "none yet"
//   --language <words>  Default: English, with the trade's own words
//   --subjects <list>   comma separated stickers, six of them
//   --palette <list>    colour names with hex, comma separated
//   --have <list>       what the project already has, separated by |, so an agent does not
//                       rebuild it
//   --out <file>        write here instead of stdout
//
// A preset is not a template: it carries six sticker subjects, the words that
// trade uses, and the things that would make the result look wrong. Override
// any of it on the command line.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PALETTE = 'navy #071022, violet #7c3aed, deep violet #5b21b6, gold #eab308, sun #f4d774, lilac #dccfff, paper #f7f6f2';

/** The same six slots for every trade: the product, the money, the place, the win, a tool, sparkles. */
const PRESETS = {
  generic: {
    example: 'the project',
    about: 'a product or a service, sold on a page that has to be read on a phone',
    reader: 'the people who would pay for it, on a phone, on mobile data',
    action: 'start a conversation on WhatsApp',
    subjects: [
      'a rounded rectangle standing for the product itself, with a tick on it',
      'a receipt with two lines and a coin beside it',
      'a map pin on a small hill',
      'a hand holding a card, thumb up',
      'a small tool: a spanner crossed with a pencil',
      'three loose sparkles, no backing',
    ],
    words: 'the trade’s own words for the thing, never a consultant’s',
    avoid: 'a stock-photo handshake, a rocket, a lightbulb, gears',
  },
  shule: {
    example: 'Shule Direct Pro',
    about:
      'a school management system for Tanzanian secondary schools: fees, attendance, results and staff',
    reader: 'head teachers, bursars and school owners in Dar es Salaam, on a phone, on mobile data',
    action: 'book a 20-minute demo on WhatsApp',
    subjects: [
      'a graduation cap seen from the side, one small sparkle at its top right',
      'a fee receipt with a stamp, a coin resting on it',
      'a school building with a flag on the roof',
      'a hand holding a report card with three ticks',
      'a register book with a pencil across it',
      'three loose sparkles, no backing',
    ],
    words: 'fees, attendance, results, report card, timetable — the words on the forms they use',
    avoid: 'an apple, a school bus, a blackboard with "ABC", a laughing classroom photo',
  },
  food: {
    example: 'Bongo Foodie',
    about: 'food ordered on a phone and delivered across Dar es Salaam',
    reader: 'people ordering lunch at work, on a phone, between 11 and 2',
    action: 'order the day’s plate on WhatsApp',
    subjects: [
      'a lidded bowl with steam rising, seen from the side',
      'a delivery box with a hot line on it',
      'a small scooter with a box on the back',
      'a fork and a spoon crossed, one sparkle between them',
      'a paper bag folded at the top',
      'three loose sparkles, no backing',
    ],
    words: 'plate, order, delivery, boda, today’s special — the words on the menu',
    avoid: 'a hamburger, a pizza slice, a chef’s hat, cutlery on a white tablecloth',
  },
  money: {
    example: 'LoanTZ',
    about: 'short loans and savings for shop owners, priced and repaid on a phone',
    reader: 'shop owners and boda riders in Dar es Salaam, on a phone, wary of hidden fees',
    action: 'check what they can borrow, with the fees shown first',
    subjects: [
      'a phone showing a tick inside a circle, two signal arcs at its top right',
      'three coins stacked, one on its edge',
      'a handshake simplified to two cuffs and one line',
      'a calendar page with a ringed date',
      'a key, or a padlock standing open',
      'three loose sparkles, no backing',
    ],
    words: 'the actual fee, the actual days, the actual amount — never "seamless" or "instant"',
    avoid: 'a piggy bank, a money bag with a dollar sign, gold bars, a credit card floating',
  },
  safari: {
    example: 'Zion TZ',
    about: 'lodges and safari nights in Tanzania, booked without a tour operator in the middle',
    reader: 'travellers planning from abroad and Tanzanians booking a weekend, on a phone',
    action: 'check the nights and the price for a date',
    subjects: [
      'a baobab or an acacia seen from the side, a bird on the top branch',
      'a bed with a folded blanket, seen from the front',
      'a key card with a small tag',
      'a jeep with a raised roof, three small spokes of dust',
      'a bird in flight, one line for the wing',
      'three loose sparkles, no backing',
    ],
    words: 'nights, the place’s real name, the season — never "paradise" or "hidden gem"',
    avoid: 'a globe, an aeroplane, a suitcase with stickers, a sunset silhouette of giraffes',
  },
  music: {
    example: 'Audénic',
    about: 'a music player and a studio for artists who release without a label',
    reader: 'artists and listeners, on a phone, late, with headphones on',
    action: 'play the newest release, then sign up to publish',
    subjects: [
      'headphones with one cup turned outwards',
      'a cassette with two reels and a pencil in one',
      'a microphone with a small stand',
      'an equaliser of five bars, two of them tall',
      'a vinyl record half out of its sleeve',
      'three loose sparkles, no backing',
    ],
    words: 'track, release, mix, master — never "content"',
    avoid: 'a guitar pick, a treble clef, a boombox, a stage with spotlights',
  },
  logistics: {
    example: 'Showroom TZ',
    about: 'stock, orders and delivery runs for shops that sell on WhatsApp',
    reader: 'shopkeepers and dispatch clerks, on a phone, standing in the shop',
    action: 'see the stock and the delivery run',
    subjects: [
      'a parcel with tape across it, one corner bent',
      'a delivery van seen from the side, one wheel shown',
      'a shelf with three boxes, one label turned',
      'a clipboard with a tick and a pen',
      'a map pin with a short route line leaving it',
      'three loose sparkles, no backing',
    ],
    words: 'stock, order, run, depot — the words on their invoices',
    avoid: 'a forklift, a warehouse of cardboard, a globe with arrows',
  },
  health: {
    example: 'Afya Ledger',
    about: 'patient records, appointments and stock for a clinic, kept off paper',
    reader: 'clinic managers and receptionists, on a phone, between patients',
    action: 'book a walkthrough at the clinic',
    subjects: [
      'a card with a heart line across it',
      'a pill bottle with two pills beside it',
      'a clipboard with three ticks',
      'a clock with a small cross under it',
      'a phone showing a cross inside a circle',
      'three loose sparkles, no backing',
    ],
    words: 'patient, visit, stock, record — never "wellness journey"',
    avoid: 'a red cross mark, a stethoscope coiled into a heart, a doctor pointing at a screen',
  },
};

// ---------- Reading the command line ----------

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const has = (name) => args.includes(`--${name}`);

const names = Object.keys(PRESETS);
if (has('list') || has('help') || args.length === 0) {
  console.log('Presets:\n');
  for (const name of names) {
    console.log(`  ${name.padEnd(10)} ${PRESETS[name].example} — ${PRESETS[name].about}`);
  }
  console.log(`
Options: --project --about --reader --action --proof --language --subjects
         --palette --have --preset --out
Example: npm run prompts -- --preset shule --out docs/prompts/shule-direct-pro.md`);
  process.exit(0);
}

const presetName = option('preset', 'generic');
const preset = PRESETS[presetName];
if (!preset) {
  console.error(`No preset called "${presetName}". Run --list to see them.`);
  process.exit(1);
}

const project = option('project', preset.example);
const about = option('about', preset.about);
const reader = option('reader', preset.reader);
const action = option('action', preset.action);
const proof = option('proof', 'none yet: no client, no count, no testimonial may be invented');
const language = option('language', 'English, with the words the customer already uses');
const palette = option('palette', PALETTE);
const have = option('have', '')
  .split('|')
  .map((item) => item.trim())
  .filter(Boolean);
const subjects = option('subjects', '')
  ? option('subjects', '').split(',').map((subject) => subject.trim()).filter(Boolean)
  : preset.subjects;

if (subjects.length !== 6) {
  console.error(`Six stickers, please: the product, the money, the place, the win, a tool, sparkles. You gave ${subjects.length}.`);
  process.exit(1);
}

// ---------- The pack ----------

const brief = `PROJECT: ${project}
WHAT IT IS: ${about}
WHO READS THE PAGE: ${reader}
THE ONE ACTION: ${action}
THE PROOF WE MAY USE: ${proof}
LANGUAGE: ${language}
COLOURS, IF FIXED: ${palette}
WHAT IT MUST NOT LOOK LIKE: ${preset.avoid}`;

const STYLE = `Flat vector sticker illustration, hand-drawn feel with clean geometry. One soft,
irregular blob backing that follows the drawing loosely, like the paper left around a cut-out
sticker. Thick, uniform dark-navy ink outline (#0b1233), about 14 px at this size, rounded caps and
rounded joins, slightly wobbly rather than mechanical. Flat fills only: sunny yellow #f4d774, violet
#7c3aed and pale lilac #dccfff, plus the navy line. No gradients, no texture, no 3D, no gloss, no
drop shadow, no glow, no noise. Generous margin: the sticker fills about 70% of the frame, centred,
on a plain white background.`;

const NO = `Text, letters, numbers, watermarks, logos, UI screenshots, gradients, photographic
texture, black (use navy, not black), more than three fill colours, busy backgrounds, grids, or
several stickers in the frame.`;

const fills = ['sun', 'violet', 'lilac', 'sun', 'violet', 'solid gold sparkles, no blob'];

/** Breaks a sentence at about 92 letters, so a pasted prompt stays readable. */
function wrap(text, width = 92) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

const stickerPrompts = subjects
  .map((subject, index) => ({
    subject,
    fill: fills[index % fills.length],
    text: `Create ONE sticker as a standalone square image, 1024x1024.

STYLE
${STYLE}

SUBJECT
${wrap(`${subject}.`)}
BACKING
${wrap(`The blob's fill is ${fills[index % fills.length]}. At most one accent mark inside the blob: a four-point sparkle, or three short rays. Balanced and optimistic, no human face, no detailed fingers, no lettering anywhere.`)}

DO NOT INCLUDE
${NO}`,
  }));

const scene = `A 1200x1500 vertical illustration for ${project}.

BACKGROUND
A deep navy field (#071022 to #0a1735), drawn as a topographic contour map: thin, smooth, organic
lines about 1 px in two weights, gold #eab308 and deep violet #5b21b6, close together on one side
and far apart on the other, like a hillside. Two or three hand-drawn four-point sparkles in gold,
small. No labels, no numbers, no compass, no legend, no texture.

FOREGROUND STICKERS
Three of the stickers from this set float over the map at different sizes and angles, each with its
soft irregular blob backing and thick navy outline, flat fills only:
  1  ${subjects[0]} — the biggest, upper right, tilted about 8 degrees
  2  ${subjects[1]} — the smallest, lower left, tilted -12 degrees
  3  ${subjects[4]} — middle right, small, tilted 10 degrees
Even spacing, plenty of navy between them, nothing touching the edges, no sticker overlapping
another.

DO NOT INCLUDE
Text of any kind, letters, numbers, logos, UI windows, photographs, gradients inside the stickers,
more than three stickers, a border, or a mockup frame.`;

const motion = `Add floating sticker art to ${project}, matching how the existing stickers behave. Read
src/lib/stickers.js, src/styles/stickers.css, src/partials/sticker.html and the "Stickers and
scribbles" section of README.md first.

THE RULE
Four nested elements, each owning exactly one job, so no two animations ever touch the same property
of the same element:
  .sticker          placed and tilted by CSS only (position, width, rotate)
  .sticker__drift   y and rotation follow the scroll (ScrollTrigger, scrub 0.6)
  .sticker__body    scale and rotation only: pops in with elastic.out(1, 0.6), reverses on leave
  .doodle           leans with the speed of the scroll (clamped, ±16 degrees) and springs back

BEHAVIOUR
- Pop in at 92% up the screen: backing first, then the ink drawn on it (DrawSVG, 0.06 s apart).
- Drift 0.2 of the viewport height by default, half as far below 900 px wide, with a tall screen
  counted as no taller than 900 px.
- Lean with scroll velocity; settle to 0 when the scroll stops.
- On a fine pointer, flinch away from the side the pointer entered, then settle. The sticker has
  pointer-events: none, so listen on window and hit-test with getBoundingClientRect.
- Scoped per page: on a page change the old stickers and their ScrollTriggers are destroyed, and the
  new ones pop after the curtain has gone.

MUST HOLD
- Decoration: aria-hidden="true", pointer-events: none, user-select: none, one or two a screen, and
  never on words at rest or anywhere along the drift, at any width.
- Position comes from one class per place (.sticker--<place>), never a style attribute.
- prefers-reduced-motion: none of the above runs; every sticker is simply there, at rest.
- Transform and opacity only. Without JavaScript the sticker is still visible.

VERIFY, THEN REPORT
Run npm run build, then npm run check:stickers (it walks each sticker up the screen at seven sizes
and fails if one touches text), then npm run shot at 390 and 1440 in the three modes. Paste the
output.`;

const share = `Create the share card for ${project} — the picture shown when the link is pasted into
WhatsApp, LinkedIn, X or Slack.

FOR A CODE AGENT (preferred: it cannot go stale)
Read scripts/og.mjs in this repository. Do the same for ${project}: boot the built site, wait for
fonts and the arrival animation, hide the navigation, the menu, the theme switch and the buttons
with an injected stylesheet, set the headline to "[ONE SENTENCE, 8 WORDS MAX]", wait, then
screenshot at exactly 1200x630 and encode JPEG at quality 84 with mozjpeg. Wire og:image,
og:image:width, og:image:height, og:image:alt, twitter:card=summary_large_image and the canonical
URL. Run it and show me the file and its size (under 200 kB).

FOR AN IMAGE MODEL
1200x630 landscape. ${palette.split(',')[0].trim()} field with a faint gold contour map on the right
third only, low contrast. On the left the mark as one flat gold shape, and one line of text
"[5–8 WORDS]". 80 px of clear margin all round. Flat vector, no photograph, no gradient mesh, no
device frame, no fake UI, no second line, nothing important within 100 px of an edge. If you cannot
spell the line exactly, leave the space empty.
${project}'s one action is: ${action}.`;

const check = `Review the work you just did on ${project} as if you had not written it. Report before
you change anything.

LOOK
Shoot every page you touched at 390x844, 820x1180 and 1440x900 in ?theme=dark, ?theme=mix and
?theme=light and open the images. Report horizontal overflow (must be 0), overlaps, cut-off
elements and any text below 4.5:1. Repeat with reduced motion and with WebGL disabled.

BEHAVIOUR
Page changes both ways and the menu on a phone; every drawing half-drawn and finished; every
counted number read three seconds after it appears; every sticker half-popped, after a page change,
after Back, and with reduced motion; every form submitted empty, with a wrong phone number and with
the network off.

HONESTY
List every fact on the page and where it came from. Remove anything invented and say so. List every
claim you could not verify, and every check you could not run. The words "should work" are not
allowed.`;

const lines = [
  `# Prompts for ${project}`,
  '',
  `Made with \`npm run prompts -- --preset ${presetName}\`. The reasoning behind every block, and the`,
  'blocks for the admin, the picture pipeline and the master build, are in',
  '[agent-prompt-pack.md](../agent-prompt-pack.md).',
  '',
  '**How to use it.** Paste the brief first, then the block for the job. One sticker per image: six',
  'pictures, not one sheet. Keep the style paragraph word for word in all six calls.',
  '',
  '---',
  '',
  '## 1. The brief (paste this above every prompt)',
  '',
  '```text',
  brief,
  '```',
  '',
  `Trade words to use: ${preset.words}.`,
  `Words and pictures that would make it look wrong: ${preset.avoid}.`,
  '',
  '---',
  '',
  '## 2. The six stickers (one image call each)',
  '',
  ...stickerPrompts.flatMap((sticker, index) => [
    `### 2.${index + 1} ${sticker.subject.split(',')[0]}`,
    '',
    '```text',
    sticker.text,
    '```',
    '',
  ]),
  '---',
  '',
  '## 3. One screen holding the stickers',
  '',
  '```text',
  scene,
  '```',
  '',
  '---',
  '',
  '## 4. The motion, in code',
  '',
  '```text',
  motion,
  '```',
  '',
  '---',
  '',
  '## 5. The picture a shared link shows',
  '',
  '```text',
  share,
  '```',
  '',
  '---',
  '',
  '## 6. The check before "done"',
  '',
  '```text',
  check,
  '```',
  '',
  '---',
  '',
  ...(have.length
    ? [
        '## 7. What this project already has (do not rebuild it)',
        '',
        ...have.map((item) => `- ${item}`),
        '',
        '---',
        '',
      ]
    : []),
  `## ${have.length ? 8 : 7}. Still to do, and not for an AI`,
  '',
  `- The words on the page: written by a person, in ${language.split(',')[0]}.`,
  '- Photographs of the real thing, put through `scripts/images.mjs` or Cloudinary (P7).',
  '- Prices, phone numbers and the one action, in the content file, not in a page.',
  '- The GitHub token for the admin, made once and never shared.',
  '- The assistant, if it should answer before any model key exists: prompt P9 in',
  '  [agent-prompt-pack.md](../agent-prompt-pack.md).',
  '',
];

const pack = lines.join('\n');
const out = option('out', '');
if (out) {
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), pack, 'utf8');
  console.log(`${out}  ${pack.length.toLocaleString('en-US')} characters  preset ${presetName}`);
} else {
  process.stdout.write(pack);
}
