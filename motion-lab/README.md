# Altra Motion Lab

A six-page site for [Altraware Technology](https://altra.tanzaniareach.com), and a worked example of
building a premium site with raw WebGL and GLSL, GSAP, Barba.js, Anime.js and tween.js, with an AI
agent doing most of the typing.

The pages are Home, Work, Services, Pricing (with a live estimator), Studio and Start a project.

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

Anything that has to be read closely sits on a glass panel, so the chart never competes with the
text. Between pages a curtain crosses the screen with the Swahili name of the page you are going to.

## What each library does

| Library | Job here | Where |
| --- | --- | --- |
| WebGL 2 + GLSL | Draws the chart in one fragment shader. No three.js. | `src/gl/field.frag.glsl`, `src/gl/stage.js` |
| tween.js | Moves the shader values from one look to the next. | `src/gl/stage.js` |
| GSAP (ScrollTrigger, SplitText, ScrambleText) | Everything tied to scroll or to text: reveals, typing, counting numbers, the marquee, parallax, the pinned plates, the stacked cards, and the curtain. | `src/lib/`, `src/pages/` |
| Barba.js | Swaps pages without a reload, so the chart never restarts. | `src/main.js` |
| Anime.js | The intro, the menu stagger, the waypoint ping. | `src/lib/intro.js`, `src/lib/chrome.js`, `src/pages/home.js` |
| Lenis | Smooth scrolling, driven by GSAP's ticker. Its speed also stretches the chart. | `src/lib/scroll.js` |

Each library has one job. If two of them animate the same property of the same element they fight,
so keep it that way.

## Layout

```
index.html, work/, services/, pricing/, studio/, contact/, 404.html   the pages
src/partials/        head, header and menu and curtain, footer (shared by every page)
src/main.js          entry: chart, scroll, header, Barba transition
src/site.js          the phone lines and the email, in one place
src/gl/              the shader, its presets, and the WebGL code
src/lib/             shared behaviour, one file per job:
  motion.js            GSAP setup and the motion tokens
  routes.js            the pages in order, with their Swahili names
  curtain.js           the page transition
  page.js              mounts and removes everything inside a page
  scenes.js            data-theme and data-stage
  reveal.js            data-enter, data-split, data-reveal
  text.js              data-type-words, data-scramble, data-scrub
  numbers.js           data-count
  media.js             data-media, data-parallax, data-magnetic
  marquee.js           data-marquee
  estimate.js          the pricing rules, with no DOM in it
  scroll.js, chrome.js, intro.js
src/pages/           code that only one page needs
src/styles/          tokens.css first, then one file per area
src/images/          WebP pictures, made with scripts/images.mjs
src/fonts/           self-hosted fonts (SIL OFL 1.1)
scripts/shot.mjs     headless screenshots and a console check
scripts/images.mjs   turns a source picture into the WebP sizes the site serves
```

Pages share markup through a small include step in `vite.config.js`:

```html
<!-- @include head title="Work. Altraware Technology" description="..." theme-color="#071022" -->
<!-- @include footer -->
```

Attribute values take double quotes and cannot contain a double quote or HTML. A malformed include
fails the build.

The same step fills in contact details from `src/site.js`. Write `{{site.person.number}}` in a page
or a partial and the build puts the number there. A name that is not in `src/site.js` fails the
build, so a page cannot ship with a blank or a stale number.

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
| `data-count="350000"` | a number | Counts up to that value when scrolled into view. Also `data-count-from`, `data-count-decimals`, `data-count-pad`. |
| `data-type-words="a\|b\|c"` | a short span | Types each phrase, holds it, deletes it, goes to the next. |
| `data-scramble` | a label with plain text | The text resolves out of random letters when scrolled into view. |
| `data-scrub` | a paragraph | Its words light up as you scroll through it. |
| `data-media` | a `<figure class="media">` | The picture is unveiled when scrolled into view. |
| `data-parallax="8"` | a picture or any block | Drifts by up to 8% of its height as it crosses the screen. |
| `data-magnetic` | a button | Leans towards the pointer. Mouse only. |
| `data-marquee="70"` | a `.marquee` | A row that never stops, at 70 px a second. Scrolling pushes it. Needs a `data-marquee-track` child. |
| `data-barba-namespace="name"` | `<main>` | Names the page. Page code and the nav highlight key off it. |

In every case the HTML holds the finished text or number. The effect is added on top, so the page
reads correctly with reduced motion on, without JavaScript, and to a screen reader.

Add the class `glass` to any block that holds text someone has to read closely: a form, a price
card, a list of facts. `glass--pad` adds the standard padding. The panel takes its colour from the
section's theme. Its settings are the `--glass-*` tokens in `src/styles/tokens.css`. Set
`--glass-tint` higher on a component whose panels overlap, as the service cards do.

The header, menu, canvas, curtain and scroll meter sit outside the Barba container, so they survive
a page change. Everything inside `<main data-barba="container">` is replaced.

## Page changes

`src/lib/routes.js` lists the pages in menu order. Going to a later page the curtain rises from the
bottom. Going to an earlier one, or pressing Back, it falls from the top. The new page is mounted
while the screen is covered, so nothing is seen half-built.

- A link with an anchor, such as `/pricing/#estimator`, opens the new page at that section.
- Back and Forward return to the place the reader left, pinned sections included.
- A link to the page you are already on scrolls to the top.
- An open menu stays open until the curtain has covered it.

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

**Add a picture.** Keep the original outside the repository and make the WebP sizes from it:

```bash
npm i --no-save sharp                      # once
node scripts/images.mjs ~/Pictures/shop.jpg shop --dir src/images/work --widths 800,1600
```

It prints the `<img>` tag with `width`, `height` and `srcset` filled in. Put it inside a frame, and
write an `alt` that says what the picture shows:

```html
<figure class="media" data-media>
  <div class="media__frame" style="--ratio: 5 / 4"><!-- the printed <img>, with data-parallax="8" if wanted --></div>
  <figcaption class="media__caption">A short caption</figcaption>
</figure>
```

**Change a phone number or the email.** Edit `src/site.js` and nothing else. There are two WhatsApp
lines, and each has one job:

| In `src/site.js` | What it is | Where it is used |
| --- | --- | --- |
| `site.chatbot` | The WhatsApp chatbot. Replies are automated. | The link beside the main button, the menu, the footer, the contact page. Every link to it says "chatbot". |
| `site.person` | A person on the team, on WhatsApp and by phone. | "Send on WhatsApp" on the contact page, and "Talk to a person" in the menu, the footer and the contact page. |

In HTML each line gives `{{site.person.number}}`, `{{site.person.whatsapp}}` (the `wa.me` link) and
`{{site.person.tel}}`. The email is `{{site.email}}`. In JavaScript, import `site` from `src/site.js`.

**Change a price.** Package prices are written in `pricing/index.html` and in the service cards.
The estimator's numbers and rules are in `src/lib/estimate.js`. Change both together. The option
labels in the estimator form are in `pricing/index.html` and must match the ids in `estimate.js`.

**Add a page.**

1. Create `newpage/index.html` first: copy `studio/index.html`, set `data-barba-namespace="newpage"`
   and rename `aria-studio` to `aria-newpage` in the chrome include.
2. Add it to `build.rolldownOptions.input` in `vite.config.js`. The build fails if the file from
   step 1 does not exist yet.
3. Add it to `ROUTES` in `src/lib/routes.js`, in menu order, with the Swahili word for the curtain.
4. Add its link to both lists in `src/partials/chrome.html`, with `data-nav="newpage"` and the
   `{{aria-newpage}}` slot, the same way the Studio link is written. Add it to the footer too.
5. Give its sections presets in `src/gl/presets.js`, with `seedX` and `seedY` far from the other pages.
6. Only if it needs its own behaviour: add `src/pages/newpage.js` and register it in `PAGES` in
   `src/lib/page.js`. Create every GSAP tween and trigger inside that mount function so it is
   removed when the page leaves.

## The estimator

The pricing page turns three choices into a price range, a timeline and a monthly cost. The rules
are the ones Altraware publishes on its own pricing page, and they are stated at the top of
`src/lib/estimate.js`. That file has no DOM in it, so the sums can be checked in Node.

"Send this estimate" opens the contact page with the choices in the address, for example
`/contact/?kind=app&with=mpesa,booking&vat=1&support=tunza`. The contact page reads them, shows the
estimate and adds it to the WhatsApp message. The same form of address works on the pricing page, so
a service card can open the estimator with its own kind chosen: `/pricing/?kind=app#estimator`.

The estimator's choices and the contact form's fields are kept in `sessionStorage` for the visit, so
going to another page and back does not lose them. Nothing is sent to a server.

## Look before you ship

`scripts/shot.mjs` opens the built site in headless Chrome, takes screenshots, and exits with an
error if the page logged a console error or warning, or a request failed. It works on a machine
with no browser.

```bash
npm i --no-save puppeteer-core @sparticuz/chromium sharp   # once
npm run build && npm run preview &                         # serve dist/

npm run shot -- http://localhost:4173/ --name home --at 0,0.2,0.4,0.6,0.8,1 --sheet 3
npm run shot -- http://localhost:4173/pricing/ --name m-pricing --viewport 390x844 --dpr 2 --touch --at 0,0.25,0.5,0.75,1 --sheet 5
npm run shot -- http://localhost:4173/ --name reduced --reduced
npm run shot -- http://localhost:4173/nope/ --name 404 --expect 404
```

Images go to `shots/` (ignored by git). `--sheet 3` also tiles every stop of the run into one
image, three to a row, so a whole page can be looked at in one go. All options are listed at the top
of the script.

Headless Chrome renders WebGL on the CPU, so the chart holds still there. Judge layout and looks
from the shots, and frame rate on a real phone.

Test switches, on any page:

- `?gl=live` forces the chart to animate, `?gl=still` draws it only when something changes, and
  `?gl=off` behaves as if WebGL 2 were missing.
- `?slow=6` plays every animation six times slower. It also puts GSAP on `window.altraMotion`, so a
  script can call `altraMotion.globalTimeline.pause()`, take a picture and resume. That is how to
  look at the curtain frame by frame.

## When things are missing

| Situation | What happens |
| --- | --- |
| Reduced motion is on | No smooth scroll, no reveals, no intro, no typing or counting, and a short fade in place of the curtain. The chart is drawn once. |
| No WebGL 2 | The chart is skipped. Pages keep their background colour. |
| No `backdrop-filter` | Glass panels become nearly solid. |
| Reduced transparency is on | Glass panels become solid. |
| Narrow or short screen | The service cards stop stacking and scroll as a normal list. |
| Software rendering, or a frame rate that stays low | The chart stops animating and redraws only on change. |
| Slow GPU | Resolution steps down: 1, 0.8, 0.65, 0.5 of the device pixel ratio (capped at 1.75, or 1.5 on touch). |
| The script fails to load | Content appears after 6 seconds. |

## Deploy

`vercel.json` is set for Vercel: framework Vite, output `dist`, trailing slashes, long cache for
hashed assets. The Vercel project is `altra-motion-lab`, with **Root Directory** set to
`motion-lab`. Vercel serves `404.html` for unknown paths, and the local servers do the same.

The project is linked to this repository and its production branch is `main`. A push to any other
branch builds a preview deployment, which needs a Vercel login to open. The public address shows
the latest production deployment only.

Pages carry `noindex` while this is a lab. Remove the robots line in `src/partials/head.html` before
pointing a real domain at it.

## Content

Copy and prices come from Altraware's own published material. The contact page sends nothing to a
server: it writes a WhatsApp message and opens WhatsApp with it. That message asks for a written
quote, so it goes to the person line and never to the chatbot.

Pictures:

- `src/images/work/` holds screenshots of Altraware's own projects.
- `src/images/studio/` holds the founders' photos. The lettering of a banner behind one of them was
  painted out.
- `src/images/art/` holds three mood photos (a ledger, a contour map, a shop counter). They were
  made with an AI image model and show no real place or person. Replace them with real photos of
  the studio and its clients when there are some.
