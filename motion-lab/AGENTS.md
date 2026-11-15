# Working in this folder

Read `README.md` first. It has the layout, the data attributes, the content file, the admin and the
steps for common changes.

## Rules

Motion and looks:

- Each library has one job (see the table in the README). Do not add a second library for a job
  that one of them already does, and do not add three.js for the chart.
- Never let two libraries animate the same property of the same element.
- Import `gsap`, `ScrollTrigger` and `SplitText` from `src/lib/motion.js`.
- Create GSAP tweens and triggers for a page inside its mount function, so they are removed when
  the page leaves. Anything created outside leaks across Barba page changes.
- Use the durations and easings in `src/lib/motion.js` and `src/styles/tokens.css`. Do not invent
  new ones per component.
- Colours, type sizes and spacing come from `src/styles/tokens.css`. The only colour values outside
  it are the shader palette and the browser theme colour (`THEME_COLORS` in `src/main.js` and
  `theme-color` in each page's head include). Keep those in step with the tokens.
- A section declares its theme and chart look in HTML (`data-theme`, `data-stage`). Effects are
  declared the same way (`data-count`, `data-type-words`, `data-scramble`, `data-scrub`,
  `data-write`, `data-draw`, `data-media`, `data-parallax`, `data-magnetic`, `data-marquee`).
  Prefer an attribute to new JavaScript. Stickers and scribbles are includes
  (`<!-- @include sticker … -->`).
- The HTML holds the finished text, the final number and the whole drawing. An effect starts from
  that and returns to it. Never ship text that only exists after a script has run.
- Text that has to be read closely goes on a `.glass` panel or in a plain section. Do not lay long
  text straight on the chart, and do not write a new translucent background per component.
- Any day section can be switched to the chart in the admin, so every day section must read well
  over it. Small loose text there carries the class `pane` (or is one of the things that become a
  pane by themselves: see "Glass and panes" in the README). Large display type stays in the open.
  After adding or changing a day section, build with `ALTRA_CHART=all` and look at it.
- Do not write `data-panes` by hand, and do not name a theme in `src/styles/glass.css`. What a
  panel looks like by night and by day is set by the `--glass-*` tokens.
- A text that is written out (`data-write`, `write()` in `src/lib/stream.js`) stays whole in the
  page while it is written. Do not build a typing effect that empties an element and fills it
  again: the block would change size, and a screen reader would get the text in pieces. Use it on
  ordinary running text only, never on a flex or grid box.
- A drawing is an SVG file in `src/partials/art/`, with `class="art"`, strokes only, and
  `aria-hidden="true"`. It is animated by `data-draw` and its options, not by code written for it.
  What it shows must also be said in words next to it.
- A sticker is decoration. It never sits on words, at rest or anywhere along its drift, at any
  width. `npm run check:stickers` is the judge of that, not a screenshot. It lets clicks through
  and carries `aria-hidden="true"`. One or two to a screen.
- Where a sticker or a scribble sits is one rule in `src/styles/stickers.css`, named by `place`.
  Do not position one with a `style` attribute.
- The four layers of a sticker each have one job: `.sticker` is placed and tilted by CSS,
  `.sticker__drift` follows the scroll, `.sticker__body` pops, `.doodle` leans. Keep it that way,
  so no two tweens ever move the same property of the same element.
- `src/partials/art/sticker-*.html` and `scribble-*.html` are written by `scripts/stickers.mjs`.
  Change the points in the script and run `npm run stickers`. Never edit those files by hand, and
  never paste in a drawing from somewhere else.
- Pictures are WebP files made with `scripts/images.mjs`, with `width`, `height` and a real `alt`.
  Keep originals out of git. Do not use stock photos, and do not show a third party's brand.
- Move things with `transform` and fade them with `opacity`. Colour transitions are fine. Never
  animate layout properties such as `width`, `height`, `top`, `left` or `margin`.
- Everything must still work with reduced motion on, without WebGL 2, and at 390 px wide.
- Text that is dimmed on purpose (words not yet lit, a card that is not the current one) must still
  be readable: 4.5 to 1 against the page, or 3 to 1 for large type. Dim a picture as far as you like.
- A heading that is cut into lines keeps a label with its whole text. A paragraph may not carry a
  label, so give a screen reader a copy that reads in one piece (`src/lib/text.js` does this).
- Fonts and assets are self-hosted. Do not add a CDN link.

Facts:

- Phone numbers, the email, prices, section backgrounds, page titles and descriptions live in
  `content/site.json` and nowhere else. In HTML write `{{site.person.number}}`,
  `{{site.price.starter}}` and the like. Never type a number, a price or the address into a page.
- Do not write `data-bg` or `data-calm` by hand, and do not write a `<title>` or a description in a
  page. The build adds them from the content file.
- A tag in the `<head>` that differs from page to page must carry `data-head`, or it will be stale
  after a page change.
- `content/schema.js` and `content/estimator.js` have no imports and use no browser or Node APIs.
  The build, the site, the admin and the checks all run them. Keep them that way.
- `vite.config.js` imports from `content/`, never from `src/site.js`.
- The pages and their order live in `src/lib/routes.js` and in `PAGES` in `content/schema.js`. The
  pricing rules live in `content/estimator.js` and nowhere else.
- There are two WhatsApp lines. A brief or an estimate goes to `site.person`, never to
  `site.chatbot`. Every link to the chatbot must say "chatbot", so nobody expects a person there.
- Copy states facts Altraware has published. Do not invent clients, numbers or testimonials.

The admin (`admin/index.html`, `src/admin/`):

- It is served under a Content-Security-Policy (`vercel.json`): no inline scripts, no `style`
  attributes in markup, and requests to `api.github.com` and `firestore.googleapis.com` only. Do
  not loosen the policy to make something work. Set styles with classes or through `element.style`.
- The token is kept in `sessionStorage` and sent to GitHub only. Never put it in `localStorage`, in
  an address, in a log or in an error message.
- The admin always calls the real GitHub address. There is no switch to point it elsewhere, and
  there must not be one: such a switch is a way to steal a token. Checks catch the browser's
  requests instead (`scripts/admin-check.mjs`).
- It does not import the site's motion code, and the site does not import the admin.
- Anything the admin can save, `check()` in `content/schema.js` must be able to judge. Add the rule
  there first, so the build refuses the same mistakes the admin does.
- Saving a brief (`src/lib/leads.js`) must never stop WhatsApp from opening.

## Before you say it is done

```bash
npm run build
npm run preview &
npm run shot -- http://localhost:4173/ --name home --at 0,0.2,0.4,0.6,0.8,1 --sheet 3
npm run shot -- http://localhost:4173/ --name m-home --viewport 390x844 --dpr 2 --touch --at 0,0.25,0.5,0.75,1 --sheet 5
```

Then open the `-sheet.png` images in `shots/` and look at them. The script exits with an error on
any console error, console warning or failed request, and prints `overflowX`, which must be 0. Shoot
every page you touched, at both sizes. A clean build is not proof that the page looks right.

Run the checks that cover what you touched. Each must end with "all steps passed, console clean"
(`check:stickers` ends with "all N stickers clear of text, console clean"):

```bash
npm run check:admin    # after any change to the admin, the content file's rules or vercel.json
npm run check:brief    # after any change to the contact page or to saving briefs
npm run check:stickers # after moving or adding a sticker, or changing a heading, a caption, a pane or a layout near one
npm run lighthouse     # after any change to a page: accessibility and best practices must stay at 100
```

Some things a still picture cannot show. Check these by driving the page from a script:

- A page change. Open the page with `?slow=6`, click a link, then pause with
  `altraMotion.globalTimeline.pause()` before each picture. Check both directions and the menu on a
  phone. The title and the canonical address must be those of the new page.
- Back and Forward. The reader must return to the place and the choices they left.
- A number that counts. Wait three seconds after scrolling to it before reading the value.
- A drawing. Look at it half-drawn (`?slow=5`) and finished, and with `--reduced`.
- A text that is written out. Look at it half-written (`?slow=20`): the block must have the size
  it ends with, and the line breaks must be the final ones. With `--reduced` it is simply there.
- A sticker. Look at it half-popped (`?slow=6`). After a page change and after Back, the stickers
  of the page on screen must have popped and those of the page that left must be gone. With
  `--reduced` every sticker is simply there. What the pointer does to one needs `--mouse`.
