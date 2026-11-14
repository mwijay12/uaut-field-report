// Turn a source picture into the WebP files the site serves.
//
//   npm i --no-save sharp
//   node scripts/images.mjs ~/shots/faida.png faida --dir src/images/work --widths 800,1600
//
// Options
//   --dir <path>              where to write (default src/images)
//   --widths <list>           output widths in pixels (default 800,1600). Never upscales.
//   --quality <n>             WebP quality (default 80)
//   --crop <left,top,w,h>     cut this region out of the source first
//
// Prints the <img> tag to paste, with width, height and srcset filled in.
// Keep the originals out of git: only the WebP files belong in src/images.

import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const positional = args.filter((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const [source, name] = positional;
if (!source || !name) {
  console.error('Usage: node scripts/images.mjs <source> <name> [--dir path] [--widths 800,1600] [--quality 80] [--crop l,t,w,h]');
  process.exit(1);
}

const dir = option('dir', 'src/images');
const widths = option('widths', '800,1600').split(',').map(Number);
const quality = Number(option('quality', 80));
const crop = option('crop', '');

await mkdir(resolve(dir), { recursive: true });

const base = () => {
  const image = sharp(source).rotate();
  if (!crop) return image;
  const [left, top, width, height] = crop.split(',').map(Number);
  return image.extract({ left, top, width, height });
};

const { width: fullWidth, height: fullHeight } = await base().toBuffer({ resolveWithObject: true }).then((result) => result.info);
const made = [];

for (const wanted of [...new Set(widths.map((width) => Math.min(width, fullWidth)))]) {
  const file = `${dir}/${name}-${wanted}.webp`;
  const info = await base().resize({ width: wanted }).webp({ quality, effort: 6 }).toFile(resolve(file));
  made.push({ file, width: info.width, height: info.height, bytes: (await stat(resolve(file))).size });
}

for (const item of made) console.log(`${item.file}  ${item.width}x${item.height}  ${(item.bytes / 1024).toFixed(0)} KB`);

const largest = made[made.length - 1];
const srcset = made.map((item) => `/${item.file} ${item.width}w`).join(', ');
console.log(`\n<img src="/${largest.file}" srcset="${srcset}" sizes="(min-width: 900px) 50vw, 100vw" width="${largest.width}" height="${largest.height}" alt="" loading="lazy" decoding="async" />`);
console.log(`source ${fullWidth}x${fullHeight}`);
