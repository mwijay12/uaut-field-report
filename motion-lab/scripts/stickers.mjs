// Draws the doodle stickers and the scribbles, and writes them as SVG partials
// to src/partials/art/. Run it after changing a drawing below, and commit the
// files it writes.
//
//   node scripts/stickers.mjs             writes the partials
//   node scripts/stickers.mjs --preview   also saves shots/stickers.png to look at (needs sharp)
//
// A doodle is a handful of strokes. A stroke is a list of points, and a smooth
// line is drawn through them, the way a hand would draw it. Nothing here is
// traced from a picture: every point below was placed by hand on a grid that
// runs from 0 to 100, left to right and top to bottom.
//
//   [x, y]       the line bends smoothly through this point
//   [x, y, 1]    the line turns a sharp corner here
//
// Every point is then nudged a little, by the same amount every time the
// script runs, so a line is never quite straight and a circle never quite
// round. A sticker also gets a backing: a soft shape that follows the outline
// of its drawing, like the paper left around a cut-out sticker.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const folder = resolve(root, 'src/partials/art');

const INK = 3.9; // width of a doodle line, on the 0 to 100 grid
const MARGIN = 10.5; // how far the backing reaches beyond the drawing
const SHAKE = 0.55; // how far a point may be nudged

// ---------- Small tools ----------

/** The same "random" numbers every run, so the files only change when a drawing does. */
function seeded(text) {
  let seed = 1779033703 ^ text.length;
  for (const letter of text) {
    seed = Math.imul(seed ^ letter.charCodeAt(0), 3432918353);
    seed = (seed << 13) | (seed >>> 19);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value) => String(Math.round(value * 10) / 10);

// What a drawing is made of.
const line = (points, options = {}) => ({ kind: 'line', points, closed: false, ...options });
const loop = (points, options = {}) => ({ kind: 'line', points, closed: true, ...options });
const dot = (x, y, r) => ({ kind: 'dot', x, y, r });

/** A circle or an oval, as a closed line through a few points. */
function ring(x, y, rx, ry = rx, count = 8, start = 0.4) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const angle = start + (i / count) * Math.PI * 2;
    points.push([x + Math.cos(angle) * rx, y + Math.sin(angle) * ry]);
  }
  return loop(points);
}

/** A four-point sparkle: sharp tips, sides that curve inwards. */
function star(x, y, r, waist = 0.3, tilt = 0) {
  const points = [];
  for (let i = 0; i < 8; i += 1) {
    const angle = tilt - Math.PI / 2 + (i / 8) * Math.PI * 2;
    const reach = i % 2 === 0 ? r : r * waist;
    points.push(i % 2 === 0 ? [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, 1] : [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach]);
  }
  return loop(points, { steady: true });
}

/** Turns a group of strokes about a point, in degrees. */
function turn(strokes, degrees, cx = 50, cy = 50) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const spin = ([x, y, corner]) => {
    const moved = [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
    return corner ? [...moved, 1] : moved;
  };
  return strokes.map((stroke) => {
    if (stroke.kind === 'dot') {
      const [x, y] = spin([stroke.x, stroke.y]);
      return { ...stroke, x, y };
    }
    return { ...stroke, points: stroke.points.map(spin) };
  });
}

// ---------- From points to a smooth line ----------

/**
 * A smooth line through the points (a Catmull-Rom spline, written as Bézier
 * curves). Returns the path and a spread of points along it, which the
 * backing is built from.
 */
function smooth(points, closed) {
  const count = points.length;
  const at = points.map(([x, y]) => [x, y]);
  const corner = points.map((point) => Boolean(point[2]));
  const samples = [];
  let d = `M${round(at[0][0])} ${round(at[0][1])}`;

  const curve = (before, from, to, after) => {
    const c1 = [from[0] + (to[0] - before[0]) / 6, from[1] + (to[1] - before[1]) / 6];
    const c2 = [to[0] - (after[0] - from[0]) / 6, to[1] - (after[1] - from[1]) / 6];
    d += `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(to[0])} ${round(to[1])}`;
    for (let step = 0; step <= 6; step += 1) {
      const t = step / 6;
      const u = 1 - t;
      samples.push([
        u * u * u * from[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * to[0],
        u * u * u * from[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * to[1],
      ]);
    }
  };

  const last = closed ? count : count - 1;
  for (let i = 0; i < last; i += 1) {
    const from = at[i];
    const next = (i + 1) % count;
    const to = at[next];
    // At a corner the line does not look ahead or behind: it arrives straight and leaves straight.
    const before = corner[i] || (!closed && i === 0) ? from : at[(i - 1 + count) % count];
    const after = corner[next] || (!closed && i + 2 > count - 1) ? to : at[(i + 2) % count];
    curve(before, from, to, after);
  }
  return { d: closed ? `${d}Z` : d, samples };
}

/** The soft shape behind a sticker: the outline of the drawing, pushed out and rounded off. */
function backing(samples, random) {
  const xs = samples.map((point) => point[0]);
  const ys = samples.map((point) => point[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  // How far the drawing reaches in each direction from its middle.
  const COUNT = 48;
  const WINDOW = Math.PI / 10;
  const polar = samples.map(([x, y]) => [Math.atan2(y - cy, x - cx), Math.hypot(x - cx, y - cy)]);
  let reach = Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * Math.PI * 2 - Math.PI;
    let far = 0;
    for (const [theta, distance] of polar) {
      const apart = Math.abs(((theta - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (apart < WINDOW && distance > far) far = distance;
    }
    return far;
  });

  // No deep notches: a direction with little in it still gets a fair share.
  const sorted = [...reach].sort((a, b) => a - b);
  const floor = sorted[Math.floor(COUNT / 2)] * 0.62;
  reach = reach.map((value) => Math.max(value, floor));

  // Round it off, but never inside the drawing.
  let soft = reach;
  for (let pass = 0; pass < 4; pass += 1) {
    soft = soft.map((value, i) => (soft[(i - 1 + COUNT) % COUNT] + 2 * value + soft[(i + 1) % COUNT]) / 4);
  }
  const phase = [random() * 6.28, random() * 6.28];
  const outline = [];
  for (let i = 0; i < COUNT; i += 2) {
    const angle = (i / COUNT) * Math.PI * 2 - Math.PI;
    const lumps = 1 + 0.035 * Math.sin(3 * angle + phase[0]) + 0.022 * Math.sin(5 * angle + phase[1]);
    const distance = (Math.max(soft[i], reach[i] - 1.5) + MARGIN) * lumps;
    outline.push([cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance]);
  }
  return smooth(outline, true);
}

// ---------- The drawings ----------

const STICKERS = {
  // A thumbs-up, with a sparkle. "Sawa."
  thumb: [
    loop([
      [24, 86], [21, 70], [23, 55], [30, 45], [36, 32], [39, 18], [45, 11], [52, 15], [52, 27], [50, 38],
      [55, 43, 1], [68, 42], [79, 44], [84, 49], [80, 54, 1], [86, 59], [81, 65, 1], [85, 70], [79, 76, 1], [81, 81],
      [75, 87], [60, 90], [42, 89],
    ]),
    line([[80, 54], [70, 55], [61, 54]]),
    line([[81, 65], [71, 66], [62, 65]]),
    line([[79, 76], [70, 77], [62, 76]]),
    line([[55, 43], [49, 48], [47, 57]]),
    star(77, 21, 11),
  ],

  // A pointer in the middle of a click.
  cursor: [
    loop([[34, 24, 1], [38, 74, 1], [49, 63, 1], [58, 84, 1], [67, 80, 1], [58, 59, 1], [74, 58, 1]]),
    line([[27, 17], [21, 11]]),
    line([[36, 13], [37, 4]]),
    line([[23, 28], [14, 30]]),
    ring(83, 36, 4.8, 4.8, 8),
    star(72, 17, 9),
  ],

  // A phone that has just been paid: a tick on the screen, a signal going out.
  phone: turn(
    [
      loop([[40, 10], [60, 10], [69, 19], [69, 81], [60, 90], [40, 90], [31, 81], [31, 19]]),
      line([[45, 19.5], [55, 19.5]]),
      ring(50, 45, 11.5),
      line([[44, 45], [48.5, 50, 1], [56.5, 40]]),
      line([[41, 66], [59, 66]]),
      line([[41, 74.5], [53, 74.5]]),
      line([[76, 12], [81, 18], [82, 26]]),
      line([[83, 3], [90, 13], [91, 26]]),
    ],
    -11,
  ),

  // A message, and the tick that says it arrived.
  chat: [
    loop([[22, 30], [32, 18], [52, 15], [72, 19], [82, 33], [80, 50], [68, 60], [48, 62], [38, 62], [27, 76, 1], [27, 60], [20, 48]]),
    dot(40, 39, 3.5),
    dot(52, 39, 3.5),
    dot(64, 39, 3.5),
    ring(74, 78, 11, 9.5),
    line([[69, 78], [73, 82, 1], [80, 73]]),
  ],

  // A till receipt.
  receipt: turn(
    [
      loop([
        [30, 12, 1], [70, 12, 1], [70, 80, 1], [65, 86, 1], [60, 80, 1], [55, 86, 1], [50, 80, 1], [45, 86, 1], [40, 80, 1], [35, 86, 1],
        [30, 80, 1],
      ]),
      line([[38, 24], [62, 24]]),
      line([[38, 33], [54, 33]]),
      line([[38, 42], [62, 42]]),
      line([[38, 51], [49, 51]]),
      line([[38, 65], [46, 65]]),
      line([[53, 65], [62, 65]]),
      star(84, 22, 9),
    ],
    8,
  ),

  // A stack of coins.
  coins: [
    ring(46, 36, 22, 8.5, 10),
    line([[24, 36], [24, 64]]),
    line([[68, 36], [68, 64]]),
    line([[24, 50], [34, 57], [46, 58.5], [58, 57], [68, 50]]),
    line([[24, 64], [34, 71], [46, 72.5], [58, 71], [68, 64]]),
    ring(81, 70, 10.5, 10.5, 8),
    line([[81, 64.5], [81, 75.5]]),
    star(80, 24, 10),
  ],

  // A cloud that has saved the work and sends it both ways.
  cloud: [
    loop([[26, 62], [18, 52], [24, 41], [36, 39], [42, 27], [56, 24], [67, 31], [70, 41], [80, 44], [84, 54], [76, 62], [52, 64]]),
    line([[42, 48], [49, 54, 1], [61, 41]]),
    line([[40, 86], [40, 75]]),
    line([[35.5, 79.5], [40, 74.5, 1], [44.5, 79.5]]),
    line([[60, 75], [60, 86]]),
    line([[55.5, 81.5], [60, 86.5, 1], [64.5, 81.5]]),
  ],

  // A pin on the map.
  pin: [
    loop([[50, 86, 1], [38, 67], [29, 50], [31, 33], [42, 22], [58, 22], [69, 33], [71, 50], [62, 67]]),
    ring(50, 42, 8.5),
    line([[22, 82], [30, 89], [39, 90.5]]),
    line([[61, 90.5], [70, 89], [78, 82]]),
    star(82, 20, 9),
  ],
};

// Loose sparkles with no backing, filled in.
const SPARKS = {
  spark: [star(32, 38, 26, 0.26), star(74, 22, 13, 0.28), star(70, 72, 17, 0.27)],
};

// Lines that are drawn as the page scrolls. Each has its own grid: [width, height].
const SCRIBBLES = {
  // An arrow that loops once on its way to the right.
  loop: { box: [124, 70], strokes: [line([[5, 62], [16, 37], [36, 25], [56, 31], [62, 47], [52, 57], [42, 49], [47, 32], [65, 22], [89, 22], [108, 34], [116, 56]]), line([[103, 51], [116.5, 57, 1], [119, 42]])] },
  // An arrow that curves round and down.
  hook: { box: [100, 84], strokes: [line([[6, 8], [38, 5], [68, 17], [84, 42], [83, 70]]), line([[71, 60], [83, 73, 1], [94, 59]])] },
  // Two passes of a pen under a word.
  underline: { box: [140, 20], strokes: [line([[3, 9], [30, 5], [62, 9], [96, 4.5], [137, 8]]), line([[128, 15], [92, 13], [50, 16.5]])] },
  // A ring drawn round a word, that overshoots where it began.
  oval: { box: [200, 62], strokes: [line([[122, 8], [72, 5], [26, 12], [6, 30], [22, 49], [80, 57], [150, 54], [192, 38], [187, 19], [150, 8], [102, 5], [66, 9]])] },
  // The rays of a click.
  burst: { box: [60, 60], strokes: [line([[30, 22], [30, 6]]), line([[38, 26], [50, 14]]), line([[40, 34], [56, 36]]), line([[22, 26], [10, 14]]), line([[20, 34], [4, 36]])] },
};

// ---------- Writing ----------

function shaken(strokes, random, amount = SHAKE) {
  const nudge = () => (random() - 0.5) * 2 * amount;
  return strokes.map((stroke) => {
    if (stroke.kind === 'dot') return stroke;
    const scale = stroke.steady ? 0.35 : 1;
    return { ...stroke, points: stroke.points.map(([x, y, corner]) => (corner ? [x + nudge() * scale, y + nudge() * scale, 1] : [x + nudge() * scale, y + nudge() * scale])) };
  });
}

function drawn(name, strokes, amount) {
  const random = seeded(name);
  const parts = [];
  let samples = [];
  for (const stroke of shaken(strokes, random, amount)) {
    if (stroke.kind === 'dot') {
      parts.push({ dot: stroke });
      for (let i = 0; i < 8; i += 1) samples.push([stroke.x + Math.cos(i) * stroke.r, stroke.y + Math.sin(i) * stroke.r]);
    } else {
      const made = smooth(stroke.points, stroke.closed);
      parts.push({ d: made.d });
      samples = samples.concat(made.samples);
    }
  }
  return { parts, samples, random };
}

const shapes = (parts, indent) =>
  parts.map((part) => (part.dot ? `${indent}<circle class="doodle__dot" cx="${round(part.dot.x)}" cy="${round(part.dot.y)}" r="${round(part.dot.r)}" />` : `${indent}<path d="${part.d}" />`)).join('\n');

function boxOf(samples, pad) {
  const xs = samples.map((point) => point[0]);
  const ys = samples.map((point) => point[1]);
  const left = Math.floor(Math.min(...xs) - pad);
  const top = Math.floor(Math.min(...ys) - pad);
  return [left, top, Math.ceil(Math.max(...xs) + pad) - left, Math.ceil(Math.max(...ys) + pad) - top];
}

const files = {};

for (const [name, strokes] of Object.entries(STICKERS)) {
  const { parts, samples, random } = drawn(name, strokes);
  const back = backing(samples, random);
  const box = boxOf(back.samples, 1);
  files[`sticker-${name}`] = {
    box,
    svg: `<svg class="doodle" viewBox="${box.join(' ')}" aria-hidden="true" focusable="false">
  <path class="doodle__back" d="${back.d}" />
  <g class="doodle__ink">
${shapes(parts, '    ')}
  </g>
</svg>
`,
  };
}

for (const [name, strokes] of Object.entries(SPARKS)) {
  const { parts, samples } = drawn(name, strokes);
  const box = boxOf(samples, 2);
  files[`sticker-${name}`] = {
    box,
    svg: `<svg class="doodle doodle--solid" viewBox="${box.join(' ')}" aria-hidden="true" focusable="false">
  <g class="doodle__ink">
${shapes(parts, '    ')}
  </g>
</svg>
`,
  };
}

for (const [name, { box, strokes }] of Object.entries(SCRIBBLES)) {
  const { parts } = drawn(name, strokes, 0.4);
  files[`scribble-${name}`] = {
    box: [0, 0, ...box],
    svg: `<svg class="art scribble scribble--${name}" viewBox="0 0 ${box.join(' ')}" aria-hidden="true" focusable="false">
${shapes(parts, '  ')}
</svg>
`,
  };
}

await mkdir(folder, { recursive: true });
for (const [name, { svg }] of Object.entries(files)) await writeFile(resolve(folder, `${name}.html`), svg);
console.log(`wrote ${Object.keys(files).length} drawings to src/partials/art/: ${Object.keys(files).join(', ')}`);

// ---------- A sheet to look at ----------

if (process.argv.includes('--preview')) {
  const { default: sharp } = await import('sharp');
  const TONES = [
    ['#f4d774', '#0a1735'],
    ['#dccfff', '#3b1a8f'],
    ['#7c3aed', '#f7f6f2'],
    ['#12224d', '#eab308'],
  ];
  const cell = 220;
  const names = Object.keys(files);
  const columns = 6;
  const rows = Math.ceil(names.length / columns);
  const tiles = names.map((name, index) => {
    const { svg, box } = files[name];
    const [back, ink] = TONES[index % TONES.length];
    const sticker = name.startsWith('sticker-');
    const solid = svg.includes('doodle--solid');
    const scale = Math.min((cell - 30) / box[2], (cell - 30) / box[3]);
    const x = (index % columns) * cell + (cell - box[2] * scale) / 2 - box[0] * scale;
    const y = Math.floor(index / columns) * cell + (cell - box[3] * scale) / 2 - box[1] * scale;
    const inner = svg
      .replace(/<svg[^>]*>|<\/svg>/g, '')
      .replace('class="doodle__back"', `fill="${back}" stroke="none"`)
      .replace(/class="doodle__dot"/g, `fill="${ink}" stroke="none"`);
    const style = solid
      ? `fill="#eab308" stroke="none"`
      : `fill="none" stroke="${sticker ? ink : '#7c3aed'}" stroke-width="${sticker ? INK : 2.2 / scale}" stroke-linecap="round" stroke-linejoin="round"`;
    return `<g transform="translate(${x} ${y}) scale(${scale})" ${style}>${inner}</g>`;
  });
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#f7f6f2"/><rect y="${cell}" width="100%" height="${cell}" fill="#071022"/>${tiles.join('')}</svg>`;
  await mkdir(resolve(root, 'shots'), { recursive: true });
  await sharp(Buffer.from(sheet)).png().toFile(resolve(root, 'shots/stickers.png'));
  console.log('saved shots/stickers.png');
}
