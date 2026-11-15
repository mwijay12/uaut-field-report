# The prompt pack

Prompts to hand to another AI agent, so that it produces work at the standard of this site: the
sticker art, the motion that carries it, the picture a shared link shows, the admin that signs in
with a GitHub token and publishes, and the photographs that come from Firebase Storage by way of
Cloudinary.

Every prompt below is **self-contained**: paste it as it is. The only thing you add is the brief in
[0](#0-the-brief-fill-this-first). Placeholders are written `[LIKE THIS]`; everything else is the
prompt.

The pack is not specific to Altraware. It is written so that the same words produce a school system,
a food shop, a lender or a lodge. `npm run prompts` fills the slots for you: see
[9](#9-one-project-at-a-time-the-generator).

---

## Jinsi ya kutumia (kwa Kiswahili)

1. **Jaza brief** (sehemu 0) kwa sentensi tano. Bila hiyo, AI itabuni vitu visivyo na maana kwa
   mradi wako.
2. **Chagua prompt inayolingana na kazi**: P1 ni tovuti nzima, P2 ni sticker moja, P3 ni picha ya
   screen moja yenye stickers, P4 ni kuweka stickers kwenye code na kuzifanya zitembe, P5 ni preview
   ya link (OG), P6 ni admin + GitHub PAT, P7 ni Firebase → Cloudinary, P8 ni ukaguzi wa mwisho.
3. **Paste prompt + brief pamoja.** Usiandike "fanya kama Altra" peke yake: AI haijui files zetu.
   Prompt inaonyesha files gani za kusoma (`README.md`, `AGENTS.md`, `scripts/stickers.mjs`).
4. **Sticker moja kwa picha moja.** Modeli nyingi za picha hazijui grid; ukiiomba "sheet ya stickers
   sita" utapata uozo. Ita P2 mara sita, kisha unganisha wewe mwenyewe.
5. **Usipaste sticker pack ya mtu.** Mistari inayotolewa na `scripts/stickers.mjs` ni yetu; doodle
   mpya inaandikwa kwa pointi, sio ku-copy kutoka mahali pengine.
6. **Kila mabadiliko ya picha au sticker inahitaji `npm run build` na `npm run shot`.** Picha moja
   nzuri haithibitishi kitu: angalia screen tatu (390, 820, 1440) na themes tatu.

---

## 0. The brief (fill this first)

Paste this block above any prompt. Five sentences is enough; more does not help.

```text
PROJECT: [name, e.g. Shule Direct Pro]
WHAT IT IS: [one sentence: what the customer does with it, e.g. "a school management system for
Tanzanian secondary schools: fees, attendance, results, staff"]
WHO READS THE PAGE: [e.g. head teachers, bursars, school owners in Dar es Salaam; they read on a
phone, on mobile data]
THE ONE ACTION: [e.g. "book a 20-minute demo on WhatsApp"]
THE PROOF WE MAY USE: [real facts only: years, number of schools, a named client who agreed, a
price in TSh. Write "none yet" if there is nothing]
LANGUAGE: [English / Swahili / both], and the words the customer actually uses for the product
COLOURS, IF FIXED: [e.g. navy #071022, violet #7c3aed, gold #eab308, paper #f7f6f2]
WHAT IT MUST NOT LOOK LIKE: [e.g. "a 2015 bootstrap admin panel", "a stock-photo bank site"]
```

Two rules that save the result:

- **Never let an agent invent a client, a number or a testimonial.** Ask for "no invented proof" in
  the prompt; it is cheaper than removing a lie later.
- **Name the screen sizes and the mode.** "Shoot at 390, 820 and 1440 wide, in the dark theme and
  the light one" turns a vague review into a check.

---

## P1 — Build the site (master prompt)

Use with a code agent that can read the repository (Claude Code, Codex, Cursor, Jules, an Arena
session). Attach or point it at `README.md` and `AGENTS.md`; those two files are the rules.

```text
You are building a premium marketing site. Work inside the existing repository and read
README.md and AGENTS.md before you write anything: they are the house rules and they win over your
own taste.

THE BRIEF
[the block from section 0]

WHAT GOOD LOOKS LIKE HERE
One full-screen contour map sits behind every page and changes look as the reader scrolls. Sections
that must be read closely sit on a glass panel over that map; display type stays in the open. Small
original doodle stickers sit askew on the corners of pictures and beside headings, each drifting at
its own pace so a flat page gains depth. Hand-drawn lines (an arrow, a ring, an underline) draw
themselves towards the thing they point at. Page changes travel across the map instead of reloading.

STACK
No framework, no build magic beyond Vite. Plain HTML pages with shared partials, one content file
for every fact that changes, CSS with tokens for both themes, and these libraries, each with one
job and no overlap:
- WebGL 2 + GLSL for the background (one fragment shader, no three.js)
- tween.js for moving plain numbers (shader uniforms)
- GSAP + ScrollTrigger, SplitText, DrawSVG, MorphSVG for everything tied to scroll or to text
- Barba.js for page changes; Anime.js for the intro and small staggers; Lenis for smooth scroll
If two engines animate the same property of the same element, you have a bug.

NON-NEGOTIABLES
1. Every fact (phone, price, address, page title, description, which background a section uses)
   lives in one content file and is injected at build time. Never type a price or a number into a
   page. A name that does not exist fails the build.
2. Two themes minimum (night and day) and a third "mix" mode where each section shows the theme it
   was written for. Every section must read well in all three. Verify with ?theme=dark, ?theme=mix
   and ?theme=light.
3. Content that has to be read sits on a panel or a plain section, never straight on the map.
4. Animate transform and opacity only. Never width, height, top, left or margin.
5. Everything must work with prefers-reduced-motion on, without WebGL 2, and at 390 px wide. With
   reduced motion, no reveals, no typing, no counting: the content is simply there.
6. The HTML holds the finished text, the final number and the whole drawing. Effects start from
   that and return to it; nothing that only exists after a script runs.
7. Fonts and pictures are self-hosted. No CDN link, no stock photo, no third party's brand.
8. Accessibility is part of "done": 4.5:1 for body text, 3:1 for large text, labels on headings
   that are cut into lines, a screen-reader copy of any text that is written out, focus visible,
   keyboard reachable, Lighthouse accessibility and best practices at 100.

HOW TO WORK
- Plan in one message: the pages, the sections, the content file's shape, the drawing list. Then
  build one page end to end, check it, and only then the next.
- After every change: `npm run build`, then shoot the pages you touched at 390 and 1440, in all
  three modes, with `npm run shot`. Read the console output: any console error, console warning or
  failed request is a failure, and horizontal overflow must be 0.
- Tell me what you checked and what you did not. Do not say "done" on the strength of a clean build.

Deliver: the working site, the content file, the checks you ran with their output, and a short list
of what a human still has to decide (copy, prices, photographs).
```

---

## P2 — The sticker set (image model)

This is the prompt for the look the site already uses: a flat doodle on a soft blob backing, thick
navy ink, three flat colours, no gradients, no text.

Run it **once per sticker**, with one subject each time. Keep the same `STYLE` block in every call so
the set matches.

```text
Create ONE sticker as a standalone square image, 1024x1024, on a plain white background (I will cut
it out; do not draw a checkered pattern or a shadow on the background).

STYLE
Flat vector sticker illustration, hand-drawn feel with clean geometry. One soft, irregular blob
backing that follows the drawing loosely, like the paper left around a cut-out sticker. Thick,
uniform dark-navy ink outline (#0b1233), about 14 px at this size, rounded caps and rounded joins,
slightly wobbly rather than mechanical. Flat fills only: sunny yellow #f4d774, violet #7c3aed and
pale lilac #dccfff, plus the navy line. No gradients, no texture, no 3D, no gloss, no drop shadow,
no glow, no noise. Generous margin: the sticker fills about 70% of the frame, centred.

SUBJECT
[ONE SUBJECT, e.g. "a graduation cap seen from the side, with a small sparkle at the top right",
"an exercise book with a pencil resting on it", "a phone showing a tick inside a circle"]

COMPOSITION
The subject is drawn in navy line on the blob, with the blob's fill picking up one of the three
colours. At most one accent mark in the corner of the blob: a four-point sparkle, or three short
rays. Inside the blob only. Balanced, optimistic, no human face, no fingers with detail, no letters
or words anywhere.

DO NOT INCLUDE
Text, letters, numbers, watermarks, logos, UI screenshots, gradients, photographic texture, black
(use navy, not black), more than three fill colours, busy backgrounds, grids, or several stickers in
the frame.
```

Notes that decide quality:

- **Navy ink, not black.** Black outlines read as a clip-art pack; #0b1233 ties the set to the site.
- **One accent mark.** Two sparkles per sticker and the whole page turns into confetti.
- **"Plain white background"** and a subject at ~70% is what makes cutting out clean. A model asked
  for "transparent" often draws a fake checkerboard instead.
- **Cut out** with `sharp`: trim the white, or use `scripts/images.mjs` crop, and export WebP at 512
  and 1024. Anything under 400 px will look fuzzy the moment it drifts.

### The same set, for a named project

Swap `SUBJECT` for this list and call the prompt once per line, in order:

```text
Build six stickers that belong to [PROJECT], each useful as decoration next to the section it
belongs to: [SUBJECT 1: the product itself], [SUBJECT 2: the money or the paperwork],
[SUBJECT 3: the place or the journey], [SUBJECT 4: the person's win], [SUBJECT 5: a small tool],
[SUBJECT 6: three loose sparkles, no blob]. Same style block as above for all six. Rotate the three
fills: sun, violet, lilac, sun, violet, lilac.
```

For `Shule Direct Pro` that list becomes: a graduation cap; a receipt or a fee slip; a school
building with a flag; a hand holding a report card; a box of chalk or a register book; three
sparkles. For a lender: a phone with a tick, coins, a handshake, a calendar, a key, sparkles. For a
lodge: a baobab, a bed, a key card, a jeep, a bird, sparkles.

### Turning a drawing into the site's own sticker

The site's stickers are SVG paths drawn from points, not pasted pictures (`scripts/stickers.mjs`).
Once a picture settles the idea, ask a code agent for the drawing instead:

```text
In this repository, read scripts/stickers.mjs and the sticker section of README.md. Add a sticker
called [NAME] that shows [SUBJECT], built from hand-placed points on the 0–100 grid, in the same
way as `thumb` and `receipt`: closed loops where the shape closes, `[x, y, 1]` at sharp corners.
Keep it inside the grid, leave 10 units of margin, and at most 6 strokes. Then run `npm run
stickers` and show me shots/stickers.png. Do not trace an outside picture and do not hand-edit
src/partials/art/sticker-*.html.
```

---

## P3 — One screen, stickers on the map (image model)

The look worth copying is a *composition*: a navy contour map with gold and violet lines, sparkles,
and three stickers floating on top. Use this for a hero illustration, a share card, a deck cover.

```text
A 1200x1500 vertical illustration.

BACKGROUND
A deep navy field (#071022 to #0a1735), drawn as a topographic contour map: thin, smooth, organic
lines about 1 px, in two weights, gold #eab308 and violet #5b21b6, close together on one side and
far apart on the other, like a hillside. A few of the lines are dashed. Two or three hand-drawn
four-point sparkles in gold, small. No labels, no numbers, no compass, no legend. Subtle vignette
only, no texture.

FOREGROUND STICKERS
Three stickers floating over the map at different sizes and angles, each with a soft, irregular
blob backing and a thick dark-navy outline, flat fills only (sun #f4d774, violet #7c3aed, lilac
#dccfff):
  1  a thumb, big, upper right, tilted about 8 degrees, with a sparkle at its top right
  2  a phone showing a tick inside a circle, smallest of the three, lower left, tilted -12 degrees,
     with two small signal arcs at the top right
  3  a cursor arrow, middle right, small, with a small sparkle and a dot beside it, tilted 10
     degrees
Even spacing, plenty of navy between them, nothing touching the edges, no sticker overlapping
another.

DO NOT INCLUDE
Text of any kind, letters, numbers, logos, UI windows, photographs, gradients inside the stickers,
more than three stickers, a border, or a mockup frame.
```

Two honest limits: image models still spell badly, so **no text in any generated image** — put the
words in HTML over it. And they rarely keep a line weight across separate calls, so the composition
above is one image, not a collage assembled by hand.

---

## P4 — Put the stickers in the page (code agent)

Pictures are decoration; this prompt makes them move like the site's own. The rule that keeps it
from looking amateur: **four layers, one job each, no two tweens on the same property.**

```text
Add floating sticker art to [PAGE] of this site, matching how the existing stickers behave. Read
src/lib/stickers.js, src/styles/stickers.css, src/partials/sticker.html and the "Stickers and
scribbles" section of README.md first.

THE RULE
Four nested elements, and each one owns exactly one job, so no two animations ever touch the same
property of the same element:
  .sticker          placed and tilted by CSS only (position, width, rotate)
  .sticker__drift    y and rotation follow the scroll position (ScrollTrigger, scrub 0.6)
  .sticker__body     scale and rotation only: pops in with elastic.out(1, 0.6), reverses on leave
  .doodle            leans with the speed of the scroll (clamped, ±16 degrees) and springs back
Add a fifth job only by adding a fifth element.

BEHAVIOUR
- Pop in when the sticker is 92% up the screen; the backing first, then the ink drawn on it
  (DrawSVG, 0.06 s apart per path).
- Drift: a share of the viewport height (0.2 by default), half as far below 900 px wide, and the
  screen counted as no taller than 900 px so a tall phone does not fling it.
- Lean with scroll velocity; settle to 0 when the scroll stops.
- On a fine pointer, flinch away from the side the pointer entered, then settle. The sticker has
  pointer-events: none, so listen on window and hit-test with getBoundingClientRect.
- Scoped per page: when the page changes, the stickers of the page that left are destroyed with
  their ScrollTriggers, and the ones on the new page pop after the curtain has gone.

MUST HOLD
- Stickers are decoration: aria-hidden="true", pointer-events: none, user-select: none, one or two
  per screen, never on words at rest or anywhere along the drift, at any width.
- Position comes from one class per place (`.sticker--<place>`), never from a style attribute.
- prefers-reduced-motion: none of the above runs; every sticker is simply there, at its resting
  tilt, no hidden state.
- Transform and opacity only. No layout property, ever.
- No JavaScript dependency for the drawing to exist: if the script fails, the sticker is still
  visible in the HTML.

VERIFY, THEN REPORT
Run `npm run build`, then `npm run check:stickers` (it walks each sticker up the screen at seven
screen sizes and fails if one touches text), then `npm run shot` on the page at 390 and 1440 in the
three modes. Paste the check output. Do not mark it done on a clean build.
```

For an **exported** animation instead of a web overlay (WhatsApp sticker, reel, deck):

```text
Animate this flat sticker as a loop for [WhatsApp sticker / 9:16 reel / deck]. 2.4 seconds, seamless
loop, 30 fps. The blob backing pops in with a small overshoot (elastic, 0.35 s), the ink lines draw
themselves on, then the whole sticker breathes: 2% scale and 2 degrees of tilt, easing in and out.
No bounce on the loop point, no fade to black, no camera move, no background. Export as Lottie/Apng
for overlay use and as WebM with alpha for video. Show me the loop point twice in a row.
```

---

## P5 — The picture a shared link shows (OG)

A link preview is read at 300 px wide. It needs the mark, one line and one colour, nothing else. In
this repository the card is a **photograph of the real page** (`scripts/og.mjs`), so it can never go
stale — that is the pattern to ask for.

```text
Create the share card for [PROJECT] — the image shown when the link is pasted into WhatsApp,
LinkedIn, X or Slack.

FOR A CODE AGENT (preferred, because it cannot go stale)
Read scripts/og.mjs in this repository. Add the same script for [PROJECT]: boot the built site,
wait for fonts and the arrival animation, hide the navigation, the menu, the theme switch and the
buttons with an injected stylesheet, set the headline to "[ONE SENTENCE, 8 WORDS MAX]", wait, then
screenshot at exactly 1200x630 and encode JPEG at quality 84 with mozjpeg. Wire the result to
og:image, og:image:width, og:image:height, og:image:alt, twitter:card=summary_large_image and the
canonical URL, and give the file a stable name so the CDN cache is busted only when it changes.
Then run it and show me the file and its size (it must be under 200 kB).

FOR AN IMAGE MODEL (when there is no page yet)
1200x630 landscape. Deep navy field (#071022) with a faint gold contour map drawn as thin smooth
lines, low contrast, only on the right third. On the left: the project's mark as a simple flat
shape in gold, and below it a single short line of text "[5–8 WORDS]". Keep 80 px of clear margin
all round, because the corners are cropped by some apps. Flat vector, no photograph, no gradient
mesh, no mockup, no device frame, no fake UI, no second line of text, nothing important within
100 px of the edges. Text must be exactly the string I give you, spelled correctly; if you cannot
spell it, leave the space empty and I will set the words in HTML.

CHECK
- 1200x630, under 200 kB, JPEG or PNG, no transparency.
- The one line is readable when the card is 300 px wide.
- The same card works in a dark messenger and in a white feed.
- og:image is an absolute URL; the preview is fetched without cookies, so it must not sit behind
  auth.
```

---

## P6 — The admin: sign in with a GitHub token, publish, and read pictures from Firebase

The pattern in this repository: **no server, no password of its own.** A fine-grained GitHub token,
kept in the tab, reads one JSON file from the repository and publishes a change as a commit.
Vercel rebuilds. Firestore receives form submissions. Nothing secret is ever shipped.

```text
Build a small admin for [PROJECT] that lets a non-developer change the facts without touching code.

AUTHENTICATION
- Sign-in is a GitHub fine-grained personal access token, pasted by the owner. Say exactly how to
  make one: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens →
  Generate new token; Repository access: only [ORG/REPO]; Permissions: Contents = Read and write
  (to publish) and Commit statuses = Read-only (to follow the build). Nothing else. Expiry as short
  as is workable.
- Keep the token in sessionStorage only. Never localStorage, never a cookie, never the URL, never a
  log, never an error message, never analytics. Closing the tab signs out; sign out after 30
  minutes idle and 8 hours regardless.
- The page always calls the real api.github.com. No "endpoint" setting, no proxy, no debug mode
  that takes a URL: a switch like that is how a token gets stolen.
- Serve the page under a Content-Security-Policy that allows only the hosts it needs
  (api.github.com for publishing, firestore.googleapis.com if you save leads), with no inline
  scripts and no style attributes in markup. Do not loosen the policy to make something work; set
  styles through element.style or classes.
- Anyone may open the page; without a token that can write, nothing can change.

EDITING
- The admin reads one JSON file from the repository and edits it as a draft in the browser. Show a
  review of every change (old value, new value) before publishing. A draft with a mistake cannot be
  published: the field says what is wrong, and the build refuses the same mistake (share one
  validation function between the page and the build).
- Publish as a single commit to main, with a message that lists what changed. Then follow the
  Vercel build and say "live" only when it is live.
- If the file changed since the draft was made, do not overwrite: load their version, put the
  edits on top, ask for review again.
- Keep the last N publishes; allow an old version to be loaded as a draft and published again.
- Prices are formatted and previewed next to the estimator's answer as they are typed.

PICTURES FROM FIREBASE
- A picture upload in the admin goes to Firebase Storage (or Cloudinary, see P7) and the JSON keeps
  the reference, not the bytes. The public page gets an optimised, responsive URL.
- Firebase rules: the public may read only what the site shows; only signed-in staff may write.
  Never put a service-account key, an API secret or a Cloudinary api_secret in the client.

TESTS BEFORE YOU SAY IT IS DONE
- A token with the wrong scope, a revoked token, a rate-limited response, a network failure and a
  conflict all produce a sentence a person can act on, not a stack trace.
- Nothing secret appears in the DOM, in sessionStorage under another key, in console output, in
  fetch URLs or in error text: grep the built page for the token after signing in.
- The built page has no inline script and no style attribute.
- Keyboard only: I can sign in, edit, review, publish and sign out.
```

---

## P7 — Pictures: Firebase Storage → Cloudinary, optimised properly

The complaint that starts this work is always the same: the landing photographs are 2–4 MB, the
phone loads them slowly, and somebody uploaded them straight into Firebase Storage. Cloudinary
fixes the bytes; the page must also ask for the right size.

```text
Set up image delivery for [PROJECT] so that a phone on 3G gets a sharp picture in under 150 kB.

SOURCE OF TRUTH
- Photographs live in Cloudinary; Firebase Storage keeps the originals as the backup.
- A Firestore document holds, per picture: public_id, width, height, a real alt text, a focal point,
  and the credit. Never the bytes, never a base64 string in the JSON.

MIGRATION
Write a one-off Node script that: lists objects in the Firebase Storage bucket, uploads each to
Cloudinary into folder [project]/[section] with a stable public_id, sets the resource type to image,
records width, height and bytes, and writes the mapping to a JSON file. It must be idempotent (a
re-run does not duplicate), print a table of before/after bytes, and be safe to stop and resume.
Keep the originals. Do not delete anything in Firebase.

DELIVERY
- Build URLs with explicit transformations, never the raw upload URL:
  f_auto,q_auto:good,c_limit,w_<width>,dpr_auto for content images, and
  f_auto,q_auto:eco for thumbnails. Use g_auto only when the subject is not centred; otherwise pin
  the crop with c_fill,g_<focal>.
- Serve a srcset with 400/800/1200/1600/2000 and a correct sizes attribute for the layout. Never
  ship one 2000 px file to a 390 px screen.
- Use a framework loader if the framework has one (e.g. a next/image custom loader that emits the
  Cloudinary URL), and give every image width, height, alt and a blur placeholder that is a tiny
  Cloudinary URL (w_20,e_blur:200), not an inline base64 monster.
- Lazy-load everything below the fold; the hero picture is eager with fetchpriority="high".
- Cache: immutable, one year, and change the public_id or add a version when a picture changes.

SECURITY AND HYGIENE
- The api_secret is server-only. Browser uploads use a signed upload generated by a server route, or
  an unsigned preset that is restricted to one folder and an incoming transformation that caps size.
  Never put the secret in the client bundle, a NEXT_PUBLIC variable or the admin page.
- Restrict the Cloudinary key to the operations you use; keep the cloud name public (it is not a
  secret) and nothing else.
- Reject uploads over [8] MB and anything that is not jpeg/png/webp/avif on the server too, not
  only in the browser.

VERIFY, WITH NUMBERS
Produce a table: picture, bytes before, bytes after at 800 w and at 1600 w, and the LCP on a
throttled phone profile (Slow 4G, 4x CPU). Target: no image over 250 kB at 1600 w, LCP under 2.5 s,
CLS unchanged. Show the Lighthouse before/after. If a photograph is decorative, say so and make it
CSS instead.
```

Shorter variant, when only the URLs need fixing:

```text
Every image in [PROJECT] currently loads from Firebase Storage at full size. Rewrite the image
component so that: the URL is a Cloudinary URL with f_auto,q_auto:good,c_limit,w_<width>,dpr_auto;
a srcset at 400/800/1200/1600 with a sizes attribute that matches the layout; width, height, alt and
a 20 px blurred placeholder on every one; below the fold lazy, the hero eager with fetchpriority
high. Show me the diff and a table of bytes saved at 390, 820 and 1440 wide.
```

---

## P8 — The check before "done"

Give this to the agent that did the work, as a separate pass. An agent reviewing its own page in the
browser finds more than one reviewing its own diff.

```text
Review the work you just did on [PROJECT] as if you had not written it. Do not change anything yet;
report first.

LOOK
Shoot every page you touched at 390x844, 820x1180 and 1440x900, with ?theme=dark, ?theme=mix and
?theme=light, and open the images. Report: horizontal overflow (must be 0), anything overlapping,
anything cut off, and any text below 4.5:1. Do the same with reduced motion on, and with WebGL
disabled.

BEHAVIOUR
- Page change in both directions, and the menu on a phone: no flash of an unstyled page, the title
  and the canonical URL are the new page's, Back returns to the place and the choices left.
- Every drawn thing: look at it half-drawn (?slow=5) and finished.
- Every counted number: read it three seconds after it comes into view.
- Every sticker: half-popped (?slow=6), after a page change, after Back, and with reduced motion.
- Every form: submit with nothing filled, with a wrong phone number, and with the network off.
  Nothing copies a token; nothing blocks WhatsApp from opening.

HONESTY
- List every fact on the page and where it came from. Anything you invented, remove it and say so.
- List every claim you could not verify.
- List every check you could not run, and why.

Then fix what you found, re-run the same checks, and paste the output. The words "should work" are
not allowed in your report.
```

---

## 9. One project at a time: the generator

`npm run prompts` writes the pack for a named project, with the brief, the sticker subjects, the
palette and the file paths already filled in. It is the fastest way to brief another agent about
*our* project rather than in general.

```bash
npm run prompts -- --list
npm run prompts -- --preset shule
npm run prompts -- \
  --project "Shule Direct Pro" \
  --about "a school management system for Tanzanian secondary schools: fees, attendance, results and staff" \
  --reader "head teachers and bursars in Dar es Salaam, reading on a phone on mobile data" \
  --action "book a 20-minute demo on WhatsApp" \
  --subjects "a graduation cap with a sparkle, a fee receipt, a school building with a flag, a hand holding a report card, a register book, three loose sparkles" \
  --out docs/prompts/shule-direct-pro.md
```

Presets exist for the kinds of project we run: `generic`, `shule` (education), `food`
(delivery and restaurants), `money` (lending, savings, payments), `safari` (tourism), `music`,
`logistics`, `health`. Each one carries a palette, six sticker subjects, the vocabulary of that
trade, and the words to avoid. `--palette` overrides the colours.

The output is a single markdown file you can paste into any agent, or commit next to the project it
describes.

---

## Appendix A — The palette and the type

Used by every prompt above, taken from `src/styles/tokens.css`. Keep the names, not just the hex.

| Token | Night | Day |
| --- | --- | --- |
| `--bg` | `#071022` navy | `#f7f6f2` paper |
| `--navy-800` | `#0a1735` ink on a sticker | `#10265c` ink on a sticker |
| `--violet` | `#7c3aed` | `#7c3aed` |
| `--violet-deep` | `#5b21b6` contour lines | `#3b1a8f` |
| `--gold` | `#eab308` the night accent | `#eab308` |
| `--sticker-sun` | `#f4d774` | `#f4d774` |
| `--sticker-lilac` | `#dccfff` | `#dccfff` |

One accent per theme, never two. Type: a display serif (Fraunces), a text sans (Inter) and a mono
(JetBrains Mono) for labels and figures — all self-hosted, Latin subset. A sticker uses the display
face or no lettering at all; lettering inside a generated picture is always wrong.

## Appendix B — Files these prompts assume

Nothing here is invented; each path exists in this repository.

| What | Where |
| --- | --- |
| The rules for an agent | `AGENTS.md`, `README.md` |
| The facts that change | `content/site.json`, `content/schema.js` |
| Sticker drawings, from points | `scripts/stickers.mjs` → `src/partials/art/sticker-*.html` |
| Sticker behaviour | `src/lib/stickers.js`, `src/styles/stickers.css`, `src/partials/sticker.html` |
| The share card | `scripts/og.mjs` → `public/og.jpg` |
| Pictures to WebP | `scripts/images.mjs` |
| The admin | `admin/index.html`, `src/admin/*`, `vercel.json` (CSP) |
| Leads to Firestore | `src/lib/leads.js` |
| Screenshots and checks | `scripts/shot.mjs`, `check:stickers`, `check:admin`, `check:brief`, `check:theme`, `lighthouse` |

## Appendix C — Words that improve the result, and words to avoid

**Say:** "flat vector, thick uniform outline, rounded joins, flat fills only, one accent mark,
generous margin, plain background, four-point sparkle, soft irregular blob, navy not black".

**Avoid:** "modern", "clean", "beautiful", "premium" on their own (they mean nothing to the model),
"sticker pack", "emoji set", "3D", "glossy", "gradient", "glassmorphism sticker", "realistic",
"text", "logo", "mockup". Each of those moves the result towards clip art.

**For code agents, say:** the file to read, the property that may be animated, the check to run,
and "paste the output". Vague instructions produce vague verification.

**Never ask for:** invented testimonials, invented numbers, a stock photo, another company's mark,
a screenshot of someone else's product, or a token in a URL.
