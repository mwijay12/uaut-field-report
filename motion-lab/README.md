# Altra Motion Lab

A landing site for [Altraware Technology](https://altra.tanzaniareach.com), and a worked example of
building a premium site with raw WebGL and GLSL, GSAP, Barba.js, Anime.js and tween.js, with an AI
agent doing most of the typing.

- Live: https://altra-motion-lab.vercel.app
- Where to find more sites like this to learn from: [docs/premium-web-sources.md](docs/premium-web-sources.md)
- Rules for an agent working in this folder: [AGENTS.md](AGENTS.md)

## Run it

Needs Node 22 (20.19 or newer also works).

```bash
npm install
npm run dev        # http://localhost:5173, reloads as you edit
npm run build      # writes dist/
npm run preview    # serves dist/ on http://localhost:4173
```

There is no framework and no backend. The output is static files.

## The idea

One full-screen contour map (the "chart") sits behind every page. Sections change how it looks as
you scroll, and a page change travels to another part of the map. Night sections are navy with
violet lines and gold high ground. Day sections are paper with navy lines and violet high ground.

## What each library does

| Library | Job here | Where |
| --- | --- | --- |
| WebGL 2 + GLSL | Draws the chart in one fragment shader. No three.js. | `src/gl/field.frag.glsl`, `src/gl/stage.js` |
| tween.js | Moves the shader values from one look to the next. | `src/gl/stage.js` |
| GSAP (ScrollTrigger, SplitText) | Text reveals, the pinned plates, the route drawn on scroll, page-change timelines. | `src/lib/reveal.js`, `src/pages/home.js`, `src/main.js` |
| Barba.js | Swaps pages without a reload, so the chart never restarts. | `src/main.js` |
| Anime.js | The intro, the menu stagger, the waypoint ping. | `src/lib/intro.js`, `src/lib/chrome.js`, `src/pages/home.js` |
| Lenis | Smooth scrolling, driven by GSAP's ticker. | `src/lib/scroll.js` |

Each library has one job. If two of them animate the same property of the same element they fight,
so keep it that way.

## Layout

```
index.html, work/, contact/, 404.html   the pages
src/partials/      head, header and menu, footer (shared by every page)
src/main.js        entry: chart, scroll, header, Barba transition
src/gl/            the shader, its presets, and the WebGL code
src/lib/           motion tokens, scroll, header, intro, reveals, scenes, page mount
src/pages/         code that only one page needs
src/styles/        tokens.css first, then one file per area
src/fonts/         self-hosted fonts (SIL OFL 1.1)
scripts/shot.mjs   headless screenshots and a console check
```

Pages share markup through a small include step in `vite.config.js`:

```html
<!-- @include head title="Work. Altraware Technology" description="..." theme-color="#071022" -->
<!-- @include footer -->
```

Attribute values take double quotes and cannot contain a double quote or HTML. A malformed include
fails the build.

## Conventions

Most changes need HTML only. These attributes do the work:

| Attribute | On | Effect |
| --- | --- | --- |
| `data-theme="night"` or `"day"` | a section | Page colours and chart palette while that section is on screen. |
| `data-stage="name"` | the same section | The chart moves to that preset from `src/gl/presets.js`. |
| `data-enter-split` | a heading | Its lines rise when the page arrives. |
| `data-enter` | any block | Fades up when the page arrives. |
| `data-split` | a heading | Its lines rise when scrolled into view. |
| `data-reveal` | any block | Fades up when scrolled into view. |
| `data-barba-namespace="name"` | `<main>` | Names the page. Page code and the nav highlight key off it. |

The header, menu, canvas and title card sit outside the Barba container, so they survive a page
change. Everything inside `<main data-barba="container">` is replaced.

Motion has three durations and one easing family. They live in `src/lib/motion.js` and are mirrored
in `src/styles/tokens.css`. Import `gsap` from `src/lib/motion.js`, not from `'gsap'`, so the plugins
are always registered.

## Common changes

**Add a section.** Copy a nearby `<section>`, set `data-theme` and `data-stage`, and put `data-split`
on the heading and `data-reveal` on the blocks. No JavaScript needed.

**Add a look for the chart.** Add an entry to `PRESETS` in `src/gl/presets.js` and name it in
`data-stage`. `density`, `warp`, `accent`, `ink` and `scale` are explained at the top of that file.
Keep `ink` at 0.85 or lower behind long text.

**Change the chart colours.** Edit the eight `NIGHT_*` and `DAY_*` constants in
`src/gl/field.frag.glsl`. The page colours are in `src/styles/tokens.css`. Change both together.

**Add a page.**

1. Copy `work/index.html` to `newpage/index.html`. Set `data-barba-namespace="newpage"` and rename
   `aria-work` to `aria-newpage` in the chrome include.
2. Add it to `build.rolldownOptions.input` in `vite.config.js`.
3. Add its title-card word to `CARDS` and its path to `pageOf` in `src/main.js`.
4. Add its link to both lists in `src/partials/chrome.html`, with `data-nav="newpage"` and the
   `{{aria-newpage}}` slot, the same way the Work link is written.
5. Give its sections presets in `src/gl/presets.js`, with `seedX` and `seedY` far from the other pages.
6. Only if it needs its own behaviour: add `src/pages/newpage.js` and register it in `PAGES` in
   `src/lib/page.js`. Create every GSAP tween and trigger inside that mount function so it is
   removed when the page leaves.

## Look before you ship

`scripts/shot.mjs` opens the built site in headless Chrome, takes screenshots, and exits with an
error if the page logged a console error or warning, or a request failed. It works on a machine
with no browser.

```bash
npm i --no-save puppeteer-core @sparticuz/chromium   # once
npm run build && npm run preview &                   # serve dist/

npm run shot -- http://localhost:4173/ --name home --at 0,0.25,0.5,0.75,1
npm run shot -- http://localhost:4173/ --name m-home --viewport 390x844 --dpr 2 --touch --at 0,0.5,1
npm run shot -- http://localhost:4173/ --name reduced --reduced
npm run shot -- http://localhost:4173/nope/ --name 404 --expect 404
```

Images go to `shots/` (ignored by git). All options are listed at the top of the script.

Headless Chrome renders WebGL on the CPU, so the chart holds still there. Judge layout and looks
from the shots, and frame rate on a real phone.

Test switches, on any page: `?gl=live` forces the chart to animate, `?gl=still` draws it only when
something changes, `?gl=off` behaves as if WebGL 2 were missing.

## When things are missing

| Situation | What happens |
| --- | --- |
| Reduced motion is on | No smooth scroll, no reveals, no intro. The chart is drawn once. |
| No WebGL 2 | The chart is skipped. Pages keep their background colour. |
| Software rendering, or a frame rate that stays low | The chart stops animating and redraws only on change. |
| Slow GPU | Resolution steps down: 1, 0.8, 0.65, 0.5 of the device pixel ratio (capped at 1.75, or 1.5 on touch). |
| The script fails to load | Content appears after 6 seconds. |

## Deploy

`vercel.json` is set for Vercel: framework Vite, output `dist`, trailing slashes, long cache for
hashed assets. The Vercel project is `altra-motion-lab`, with **Root Directory** set to
`motion-lab`. Vercel serves `404.html` for unknown paths, and the local servers do the same.

Pushing does not deploy: automatic Git deployments are off for this project. Either turn them on
in the Vercel dashboard (Project, Settings, Git) or create each deployment by hand.

Pages carry `noindex` while this is a lab. Remove the robots line in `src/partials/head.html` before
pointing a real domain at it.

## Content

Copy and prices come from Altraware's own published material. The contact page stores nothing: it
writes a WhatsApp message and opens WhatsApp with it.
