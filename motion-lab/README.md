# Altra Motion Lab

A six-page site for [Altraware Technology](https://altra.tanzaniareach.com), and a worked example of
building a premium site with raw WebGL and GLSL, GSAP, Barba.js, Anime.js and tween.js, with an AI
agent doing most of the typing.

The pages are Home, Work, Services, Pricing (with a live estimator), Studio and Start a project.
A small admin at `/admin/` changes the phone lines, the prices, the section backgrounds, the search
listing and where briefs are saved, without anyone opening the code.

- Live: https://altra-motion-lab.vercel.app
- Admin: https://altra-motion-lab.vercel.app/admin/ (see [The admin](#the-admin))
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

There is no framework and no backend. The output is static files. The facts that change (numbers,
prices, settings) are in one file, `content/site.json`, and the build puts them into the pages.

## The idea

One full-screen contour map (the "chart") sits behind every page. Sections change how it looks as
you scroll, and a page change travels to another part of the map. Night sections are navy with
violet lines and gold high ground. Day sections are paper with navy lines and violet high ground.

Not every section shows the chart. A section can ask for a soft version of it, or for the plain page
colour, and the chart fades to that as the section takes over. Lists, forms and price cards read
better on a plain page, and the chart means more when it comes back.

Anything that has to be read closely sits on a glass panel, so the chart never competes with the
text. Between pages a curtain crosses the screen with the Swahili name of the page you are going to.

Small line drawings draw themselves when they scroll into view: what a product does in three
sketches, a glyph for each service, the ticks in a price card. They are plain SVG in the HTML.

On top of all that sit a few stickers: doodles on a soft backing, a little askew, on the corner of
a picture or beside a heading. Each one moves at its own pace as the page scrolls, which is what
gives a flat page some depth. Hand-drawn lines go with them: an arrow that is drawn towards a
button as you scroll to it, a ring round a price, an underline under a number.

## What each library does

| Library | Job here | Where |
| --- | --- | --- |
| WebGL 2 + GLSL | Draws the chart in one fragment shader. No three.js. | `src/gl/field.frag.glsl`, `src/gl/stage.js` |
| tween.js | Moves the shader values from one look to the next. | `src/gl/stage.js` |
| GSAP (ScrollTrigger, SplitText, ScrambleText, DrawSVG, MotionPath, MorphSVG) | Everything tied to scroll or to text: reveals, typing, counting numbers, the marquee, parallax, the pinned plates, the stacked cards, the curtain, the line drawings and the stickers. | `src/lib/`, `src/pages/` |
| Barba.js | Swaps pages without a reload, so the chart never restarts. | `src/main.js` |
| Anime.js | The intro, the menu stagger, the waypoint ping. | `src/lib/intro.js`, `src/lib/chrome.js`, `src/pages/home.js` |
| Lenis | Smooth scrolling, driven by GSAP's ticker. Its speed also stretches the chart. | `src/lib/scroll.js` |

Each library has one job. If two of them animate the same property of the same element they fight,
so keep it that way.

## Layout

```
index.html, work/, services/, pricing/, studio/, contact/, 404.html   the pages
admin/index.html     the admin (its code is in src/admin/)
content/             the facts, and the rules about them:
  site.json            phone lines, prices, backgrounds, search listing, leads. The admin edits this
  schema.js            what site.json may hold, and what is wrong with a file that breaks that
  estimator.js         the pricing rules, with no DOM in it
  derive.js            turns site.json into what the pages use (links, formatted prices)
src/partials/        head, header and menu and curtain, footer (shared by every page)
  sticker.html, scribble.html   what wraps a sticker or a hand-drawn line
  art/                 the line drawings, one SVG per file. sticker-* and scribble-* are
                       written by scripts/stickers.mjs
src/main.js          entry: chart, scroll, header, Barba transition
src/site.js          the facts the scripts need, filled in by the build
src/gl/              the shader, its presets, and the WebGL code
src/lib/             shared behaviour, one file per job:
  motion.js            GSAP setup and the motion tokens
  routes.js            the pages in order, with their Swahili names
  curtain.js           the page transition
  page.js              mounts and removes everything inside a page
  scenes.js            data-theme, data-stage and how calm the chart is
  reveal.js            data-enter, data-split, data-reveal
  text.js              data-type-words, data-scramble, data-scrub
  draw.js              data-draw
  stickers.js          the stickers: drift, pop, lean
  numbers.js           data-count
  media.js             data-media, data-parallax, data-magnetic
  marquee.js           data-marquee
  estimate.js          the estimator with the current prices in it
  leads.js             saves a brief to the main site's inbox
  scroll.js, chrome.js, intro.js
src/pages/           code that only one page needs
src/admin/           the admin: no framework, and none of the site's motion code
src/styles/          tokens.css first, then one file per area
src/images/          WebP pictures, made with scripts/images.mjs
src/fonts/           self-hosted fonts (SIL OFL 1.1)
public/og.jpg        the picture a shared link shows, made with scripts/og.mjs
scripts/             shot.mjs, images.mjs, og.mjs, stickers.mjs, and the checks (see "Look before you ship")
```

Pages share markup through a small step in `vite.config.js`:

```html
<!-- @include head page="work" theme-color="#071022" -->
<!-- @include footer -->
<!-- @include art/compass -->
```

With `page="…"` the title, the description, the canonical address and the structured data come from
`content/site.json`. A page that is not one of the six (the 404, the admin) gives `title="…"` itself
and is always kept out of search. Attribute values take double quotes and cannot contain a double
quote or HTML. A malformed include fails the build.

The same step fills in facts. Write `{{site.person.number}}` or `{{site.price.starter}}` in a page
or a partial and the build puts the value there. A name that does not exist fails the build, so a
page cannot ship with a blank or a stale number.

It also keeps one of two versions of a block:

```html
<!-- @if leads --> shown when briefs are saved to the inbox <!-- @else --> shown when they are not <!-- @endif -->
```

The names are `leads` and `index` (search engines may list the site). `@if !leads` is the opposite.

## The content file

`content/site.json` is the one place for facts that change:

| Part | Holds | Used by |
| --- | --- | --- |
| `contact` | The chatbot line, the person line, the email. | Every link to them, the WhatsApp message, the structured data. |
| `prices` | Five packages, six add-ons, two support plans, in shillings. | Price cards, the estimator, the brief form, the page descriptions. |
| `backgrounds` | `effect`, `soft` or `plain` for each section. | The chart behind that section. |
| `seo` | Whether search engines may list the site, its address, and a title and description per page. | The `<head>` of every page, `robots.txt`, `sitemap.xml`. |
| `leads` | The Firebase project of the main site (empty means off), and the address of its inbox. | The brief form on the contact page. |

In HTML:

- `{{site.person.number}}`, `{{site.person.whatsapp}}` (the `wa.me` link), `{{site.person.tel}}`, the
  same three for `site.chatbot`, and `{{site.email}}`.
- `{{site.price.starter}}` gives `350,000`. `{{site.amount.starter}}` gives `350000`, for `data-count`.
- `{{site.sample.low}}` and the like: what the estimator shows before anyone touches it.

In JavaScript, import `site` from `src/site.js`. A title or description in `seo` may quote a price as
`{{site.price.starter}}`, so it never goes stale.

The build reads the file through `content/schema.js`. If the file is wrong (a price with letters in
it, a phone number that is too short, a section that does not exist), the build stops and says
which line of the file to fix. On Vercel a stopped build leaves the live site as it was, so a bad
edit cannot take the site down.

`ALTRA_CONTENT=path/to/other.json npm run build` builds from another file. The checks use this to
try a setting without touching the real one.

## The admin

`/admin/` is a page of this site. It has no server and no password of its own. It signs in to
GitHub with a token, reads `content/site.json` from the repository, and publishes a change as a
commit to `main`. Vercel then rebuilds the site, which takes about a minute, and the admin follows
the build until it says the change is live.

| Tab | Changes |
| --- | --- |
| Overview | Nothing. Shows what is live and what is waiting to be published. |
| Lines | The chatbot line, the person line, the email. A local number such as `0712 345 678` becomes `+255 712 345 678`. |
| Prices | Every price, with the estimator's answer beside it as you type. |
| Backgrounds | Chart, soft or plain, section by section. |
| Search | Whether search engines may list the site, and each page's title and description with a preview of the search result. |
| Leads | Whether a brief is also saved to the main site's inbox. Has a button that sends a test record. |
| History | The last publishes. An old version can be loaded as a draft and published again. |

How it behaves:

- Edits are a draft, kept in the browser, until "Review and publish". The review lists each change,
  old value and new, before anything is sent.
- A draft with a mistake in it cannot be published. The field says what is wrong.
- If someone else published in the meantime, nothing is overwritten. The admin loads their version,
  puts your edits on top and asks you to review again.
- A failed build is reported, with a link to what Vercel says.

Signing in needs a GitHub fine-grained token, made once:

1. GitHub, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.
2. Repository access: Only select repositories, then this repository.
3. Repository permissions: **Contents**, Read and write, so it can publish. And **Commit
   statuses**, Read-only, so it can tell you when the build is live. Nothing else.
4. Generate it and paste it into the sign-in screen.

Without the second permission publishing still works. The admin then says that it cannot see the
build, and you look at the site yourself.

The token stays in that browser tab (`sessionStorage`) and is sent only to `api.github.com`. Closing
the tab signs out, and so do 30 minutes without a click or 8 hours in all. Anyone can open the
page, but without a token that can write to the repository it can change nothing. The page is
served with a Content-Security-Policy that lets it talk to GitHub and Firestore only (`vercel.json`).

The repository, branch and file it edits are in `src/admin/config.js`, and can be changed on the
sign-in screen under "Repository". Do that after renaming the repository.

## Conventions

Most changes need HTML only. These attributes do the work:

| Attribute | On | Effect |
| --- | --- | --- |
| `data-theme="night"` or `"day"` | a section | Page colours and chart palette while that section is on screen. |
| `data-stage="name"` | the same section | The chart moves to that preset from `src/gl/presets.js`. The build adds `data-bg` and `data-calm` beside it when the content file asks for a soft or plain background. |
| `data-enter-split` | a heading | Its lines rise when the page arrives. |
| `data-enter` | any block | Fades up when the page arrives. |
| `data-split` | a heading | Its lines rise when scrolled into view. |
| `data-reveal` | any block | Fades up when scrolled into view. |
| `data-count="350000"` | a number | Counts up to that value when scrolled into view. Also `data-count-from`, `data-count-decimals`, `data-count-pad`. |
| `data-type-words="a\|b\|c"` | a short span | Types each phrase, holds it, deletes it, goes to the next. |
| `data-scramble` | a label with plain text | The text resolves out of random letters when scrolled into view. |
| `data-scrub` | a paragraph | Its words light up as you scroll through it. |
| `data-draw` | an `<svg class="art">`, or a block that holds several | Every stroked shape inside draws itself, in the order it is written, when scrolled into view. |
| `data-media` | a `<figure class="media">` | The picture is unveiled when scrolled into view. |
| `data-parallax="8"` | a picture or any block | Drifts by up to 8% of its height as it crosses the screen. |
| `data-magnetic` | a button | Leans towards the pointer. Mouse only. |
| `data-marquee="70"` | a `.marquee` | A row that never stops, at 70 px a second. Scrolling pushes it. Needs a `data-marquee-track` child. |
| `data-barba-namespace="name"` | `<main>` | Names the page. Page code and the nav highlight key off it. |

In every case the HTML holds the finished text, number or drawing. The effect is added on top, so
the page reads correctly with reduced motion on, without JavaScript, and to a screen reader.

Add the class `glass` to any block that holds text someone has to read closely: a form, a price
card, a list of facts. `glass--pad` adds the standard padding. The panel takes its colour from the
section's theme. Its settings are the `--glass-*` tokens in `src/styles/tokens.css`. Set
`--glass-tint` higher on a component whose panels overlap, as the service cards do.

The header, menu, canvas, curtain and scroll meter sit outside the Barba container, so they survive
a page change. Everything inside `<main data-barba="container">` is replaced.

### Drawings

A drawing is an `<svg class="art">` in `src/partials/art/`, included where it is shown. Lines take
the text colour. Inside it, `class="a"` is the accent colour, `class="f"` is faint, `class="dot"` is
a filled dot and `class="wash"` is a tinted area. Lines keep their width at any size.

`data-draw` on the `<svg>` is enough. The options, on the drawing or on a shape inside it, are
listed at the top of `src/lib/draw.js`: when a shape starts (`data-at`), a shape that fades in
or pops instead of being drawn (`data-fade`, `data-pop`), a dot that travels along a path
(`data-travel="#id"`), and a few more. `data-draw="scrub"` ties the drawing to the scroll, and
`data-draw-from` and `data-draw-to` say where on the screen it starts and is finished.

### Stickers and scribbles

A sticker is a doodle that sits on the page a little askew. Put `has-stickers` on the block it
belongs to and include it there:

```html
<figure class="media has-stickers" data-media>
  <!-- @include sticker name="cloud" tone="lilac" place="ledger-cloud" depth="0.3" turn="-16" -->
  …
</figure>
```

| | |
| --- | --- |
| `name` | The drawing: `thumb`, `cursor`, `phone`, `chat`, `receipt`, `coins`, `cloud`, `pin`, or `spark` (three sparkles, no backing). |
| `tone` | Its colours. `sun` is a yellow backing with a navy line, `lilac` pale violet with a deep violet line, `violet` violet with a paper line. `night` is navy with a gold line and is for day sections only. `gold` is for `spark`. |
| `place` | Where it sits: the class `sticker--<place>` in `src/styles/stickers.css`, one rule per place. |
| `depth` | How far it drifts while it crosses the screen, as a share of the screen's height. Above 0 it moves faster than the page and looks nearer. Below 0 it lags and looks further away. 0.2 if left out. Keep it at 0.1 next to a heading. |
| `turn` | Degrees it turns while it crosses the screen. 10 if left out. |

A sticker pops in when it scrolls into view and its lines are drawn on it. It drifts and turns with
the scroll, leans with the speed of the scroll and springs back, and flinches when a mouse brushes
it. All of that is `src/lib/stickers.js`. A sticker lets clicks through and a screen reader skips it.

A scribble is a line drawn by hand: `loop` (an arrow that loops once), `hook` (an arrow that turns
down), `underline`, `oval` (a ring) and `burst` (five short rays).

```html
<!-- @include scribble name="hook" place="process" draw="scrub" -->
```

`place` is the class `scribble-spot--<place>`, in the same stylesheet. With `draw="scrub"` the line
is drawn as the page scrolls past it. Leave `draw` out and it is drawn once, when it comes into view.

The drawings are made by a script, not by hand in the SVG. Each one is a list of points in
`scripts/stickers.mjs`; the script draws a smooth line through them, nudges every point a little so
nothing is quite straight, and cuts a backing round the result. They are original drawings in the
site's own colours. Do not paste in a sticker pack.

## Page changes

`src/lib/routes.js` lists the pages in menu order. Going to a later page the curtain rises from the
bottom. Going to an earlier one, or pressing Back, it falls from the top. The new page is mounted
while the screen is covered, so nothing is seen half-built.

- A link with an anchor, such as `/pricing/#estimator`, opens the new page at that section.
- Back and Forward return to the place the reader left, pinned sections included.
- A link to the page you are already on scrolls to the top.
- An open menu stays open until the curtain has covered it.
- The title, description, canonical address and structured data in the `<head>` change with the
  page. They are the tags marked `data-head` in `src/partials/head.html`.

Motion has three durations and one easing family. They live in `src/lib/motion.js` and are mirrored
in `src/styles/tokens.css`. Import `gsap` from `src/lib/motion.js`, not from `'gsap'`, so the plugins
are always registered.

## Common changes

**Change a phone number, the email or a price.** Use the admin. Or edit `content/site.json` and
nothing else. There are two WhatsApp lines, and each has one job:

| In `content/site.json` | What it is | Where it is used |
| --- | --- | --- |
| `contact.chatbot` | The WhatsApp chatbot. Replies are automated. | The link beside the main button, the menu, the footer, the contact page. Every link to it says "chatbot". |
| `contact.person` | A person on the team, on WhatsApp and by phone. | "Send on WhatsApp" on the contact page, and "Talk to a person" in the menu, the footer and the contact page. |

The option labels in the estimator form are in `pricing/index.html` and must match the ids in
`content/estimator.js`. A new price also needs a line in `PRICES` in `content/schema.js`.

**Make a section plain, or give it the chart back.** Use the admin, under Backgrounds. Or set the
section's name in `backgrounds` in `content/site.json` to `effect`, `soft` or `plain`.

**Add a section.** Copy a nearby `<section>`, set `data-theme` and `data-stage`, and put `data-split`
on the heading and `data-reveal` on the blocks. No JavaScript needed. If it uses a new `data-stage`
name and the admin should be able to restyle it, add it to `SECTIONS` in `content/schema.js`.

**Add a look for the chart.** Add an entry to `PRESETS` in `src/gl/presets.js` and name it in
`data-stage`. `density`, `warp`, `accent`, `ink` and `scale` are explained at the top of that file.
Keep `ink` at 0.85 or lower behind long text.

**Change the chart colours.** Edit the eight `NIGHT_*` and `DAY_*` constants in
`src/gl/field.frag.glsl`. The page colours are in `src/styles/tokens.css`. Change both together.

**Add a drawing.** Write the SVG in `src/partials/art/name.html` with `class="art"`, a `viewBox`,
`aria-hidden="true"` and `data-draw`. Use strokes only, in the order they should be drawn. Include it
with `<!-- @include art/name -->`. If the drawing says something the words beside it do not, say it
in words too: a screen reader skips the drawing.

**Add a sticker.** Include it in a block that has `has-stickers`, and give it a place: a rule
`.sticker--<place>` in `src/styles/stickers.css` with `top` or `bottom`, `left` or `right`, and
`--tilt`. A sticker drifts, so its place must be clear of words all the way up the screen, at every
width. Do not judge that from one picture: run `npm run check:stickers`. Use few stickers: one or
two to a screen.

**Change a sticker, or draw a new one.** Edit the points in `scripts/stickers.mjs`, or add an entry
to `STICKERS` or `SCRIBBLES` there, then:

```bash
npm i --no-save sharp          # once, for the preview
npm run stickers -- --preview  # writes src/partials/art/sticker-*.html and scribble-*.html, and shots/stickers.png
```

Look at `shots/stickers.png`, and commit the files the script wrote. Do not edit those files by
hand: the next run overwrites them.

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

**Change a page's title or description.** Use the admin, under Search. Or edit `seo.pages` in
`content/site.json`.

**Add a page.**

1. Create `newpage/index.html` first: copy `studio/index.html`, set `data-barba-namespace="newpage"`,
   set `page="newpage"` in the head include and rename `aria-studio` to `aria-newpage` in the chrome
   include.
2. Add it to `build.rolldownOptions.input` in `vite.config.js`. The build fails if the file from
   step 1 does not exist yet.
3. Add it to `PAGES` in `content/schema.js`, and give it a title and a description under `seo.pages`
   in `content/site.json`.
4. Add it to `ROUTES` in `src/lib/routes.js`, in menu order, with the Swahili word for the curtain.
5. Add its link to both lists in `src/partials/chrome.html`, with `data-nav="newpage"` and the
   `{{aria-newpage}}` slot, the same way the Studio link is written. Add it to the footer too.
6. Give its sections presets in `src/gl/presets.js`, with `seedX` and `seedY` far from the other pages.
7. Only if it needs its own behaviour: add `src/pages/newpage.js` and register it in `PAGES` in
   `src/lib/page.js`. Create every GSAP tween and trigger inside that mount function so it is
   removed when the page leaves.

## The estimator

The pricing page turns three choices into a price range, a timeline and a monthly cost. The rules
are the ones Altraware publishes on its own pricing page, and they are stated at the top of
`content/estimator.js`. That file has no DOM in it, so the sums can be checked in Node, and the
admin runs the same file to show what a new price does. The prices themselves come from
`content/site.json`.

"Send this estimate" opens the contact page with the choices in the address, for example
`/contact/?kind=app&with=mpesa,booking&vat=1&support=tunza`. The contact page reads them, shows the
estimate and adds it to the WhatsApp message. The same form of address works on the pricing page, so
a service card can open the estimator with its own kind chosen: `/pricing/?kind=app#estimator`.

The estimator's choices and the contact form's fields are kept in `sessionStorage` for the visit, so
going to another page and back does not lose them.

## Briefs

The contact page writes a WhatsApp message from the form and opens WhatsApp with it. That message
asks for a written quote, so it goes to the person line and never to the chatbot.

With `leads.projectId` empty, that is all, and nothing is sent to a server.

With the Firebase project ID of the main site in `leads.projectId`, a copy of the brief is also
added to that project's `inquiries` collection, where the main site's admin lists it under Leads &
Inquiries. The form then asks for a name and a phone number, which that list needs, and the message
carries a reference such as `#ALT-4821` that is saved with the copy. A brief that is sent twice is
saved once. If the copy cannot be saved, WhatsApp opens all the same.

The project ID is not a secret: the main site sends it to every visitor. What protects the inbox is
the Firestore rule on `inquiries`, which lets anyone add a record and only the team read them. This
site never reads from it.

## Search engines and shared links

Every page has its own title, description, canonical address, Open Graph and Twitter tags, and
structured data (the business, the site, the page, a breadcrumb). `robots.txt` is always written.
`public/og.jpg` is the picture a shared link shows. Make it again after the home page's opening
changes: `npm run og`, with the preview server running.

While `seo.index` is off, every page says `noindex` and there is no `sitemap.xml`. This is a lab
copy of a site that already exists at another address, and two listed copies would compete. Turn it
on in the admin, under Search, on the day this becomes the real site, and set `seo.origin` to the
real address first. Lighthouse counts `noindex` as a failed check, so the SEO score is 69 while it
is off and 100 once it is on. The 404 page and the admin are never listed.

## Look before you ship

`scripts/shot.mjs` opens the built site in headless Chrome, takes screenshots, and exits with an
error if the page logged a console error or warning, or a request failed. It works on a machine
with no browser.

```bash
npm i --no-save puppeteer-core @sparticuz/chromium sharp   # once
npm run build && npm run preview &                         # serve dist/

npm run shot -- http://localhost:4173/ --name home --at 0,0.2,0.4,0.6,0.8,1 --sheet 3
npm run shot -- http://localhost:4173/pricing/ --name m-pricing --viewport 390x844 --dpr 2 --touch --at 0,0.25,0.5,0.75,1 --sheet 5
npm run shot -- http://localhost:4173/work/ --name sketches --at "#caretrack+300,.sketches"
npm run shot -- http://localhost:4173/ --name reduced --reduced
npm run shot -- http://localhost:4173/ --name mouse --mouse --hover ".hero .btn"
npm run shot -- http://localhost:4173/nope/ --name 404 --expect 404
```

Images go to `shots/` (ignored by git). `--at` takes fractions of the page, or CSS selectors with an
optional offset in pixels. `--sheet 3` also tiles every stop of the run into one image, three to a
row, so a whole page can be looked at in one go. All options are listed at the top of the script.

Headless Chrome says it has no mouse, so what the site keeps for a mouse (the buttons that lean
towards the pointer, the stickers that flinch) does not run there. `--mouse` makes it say it has one.

Four more scripts check behaviour, not looks. Each prints one line per step and exits with an error
if a step fails or the page logs an error:

```bash
npm run check:admin    # signs in to the admin, edits, publishes, clashes, loads an old version
npm run check:brief    # the brief form with the inbox off and with it on
npm run check:stickers # walks every sticker up the screen, at six screen sizes: none may touch text
npm i --no-save lighthouse && npm run lighthouse   # SEO, accessibility and best practices, per page
```

`check:admin`, `check:stickers` and `lighthouse` need the preview server running. `check:brief`
builds and serves its own two copies of the site. `check:stickers` takes about eight minutes;
`-- --page /pricing/` or `-- --width 390` checks one page or one size. None of them reaches GitHub, Firestore or WhatsApp: the browser's
requests are caught and answered by the script. `vite preview` sends the headers in `vercel.json`,
so the admin is checked under its real Content-Security-Policy.

Headless Chrome renders WebGL on the CPU, so the chart holds still there. Judge layout and looks
from the shots, and frame rate on a real phone.

Test switches, on any page:

- `?gl=live` forces the chart to animate, `?gl=still` draws it only when something changes, and
  `?gl=off` behaves as if WebGL 2 were missing.
- `?slow=6` plays every animation six times slower. It also puts GSAP on `window.altraMotion`, so a
  script can call `altraMotion.globalTimeline.pause()`, take a picture and resume. That is how to
  look at the curtain, or a drawing, frame by frame.

## When things are missing

| Situation | What happens |
| --- | --- |
| Reduced motion is on | No smooth scroll, no reveals, no intro, no typing or counting, and a short fade in place of the curtain. The chart is drawn once. Drawings, stickers and scribbles are simply there. |
| No WebGL 2 | The chart is skipped. Pages keep their background colour. |
| No `backdrop-filter` | Glass panels become nearly solid. |
| Reduced transparency is on | Glass panels become solid. |
| Narrow or short screen | The service cards stop stacking and scroll as a normal list. Rows of sketches swipe sideways. Stickers are smaller and drift half as far, the home page opens with one sticker and not four, and the arrows beside buttons and headings are left out. |
| Software rendering, or a frame rate that stays low | The chart stops animating and redraws only on change. |
| Slow GPU | Resolution steps down: 1, 0.8, 0.65, 0.5 of the device pixel ratio (capped at 1.75, or 1.5 on touch). |
| A plain section is on screen | The chart is not drawn at all, which also saves battery. |
| The script fails to load | Content appears after 6 seconds. |

## Deploy

`vercel.json` is set for Vercel: framework Vite, output `dist`, trailing slashes, long cache for
hashed assets, and the security headers (the admin's are the strictest). The Vercel project is
`altra-motion-lab`, with **Root Directory** set to `motion-lab`. Vercel serves `404.html` for
unknown paths, and the local servers do the same.

The project is linked to this repository and its production branch is `main`. A push to `main`
builds and publishes the site, and that is all the admin's "publish" is: a commit to `main`. A push
to any other branch builds a preview deployment, which needs a Vercel login to open. The public
address shows the latest production deployment only.

## Content

Copy and prices come from Altraware's own published material.

Pictures:

- `src/images/work/` holds screenshots of Altraware's own projects.
- `src/images/studio/` holds the founders' photos. The lettering of a banner behind one of them was
  painted out.
- `src/images/art/` holds three mood photos (a ledger, a contour map, a shop counter). They were
  made with an AI image model and show no real place or person. Replace them with real photos of
  the studio and its clients when there are some.
- CareTrack and ShuleDirect Pro have no screenshots yet. Each is shown with three line drawings of
  what it does. They are drawings of the idea, not pictures of the product.
- The stickers and the hand-drawn lines are original. `scripts/stickers.mjs` draws them from points
  placed by hand; nothing is traced or taken from a sticker pack.
