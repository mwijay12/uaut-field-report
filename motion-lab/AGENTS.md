# Working in this folder

Read `README.md` first. It has the layout, the data attributes and the steps for common changes.

## Rules

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
  `data-media`, `data-parallax`, `data-magnetic`, `data-marquee`). Prefer an attribute to new
  JavaScript.
- The HTML holds the finished text and the final number. An effect starts from that and returns to
  it. Never ship text that only exists after a script has run.
- Text that has to be read closely goes on a `.glass` panel. Do not lay long text straight on the
  chart, and do not write a new translucent background per component.
- Pictures are WebP files made with `scripts/images.mjs`, with `width`, `height` and a real `alt`.
  Keep originals out of git. Do not use stock photos, and do not show a third party's brand.
- The pages and their order live in `src/lib/routes.js`. The pricing rules live in
  `src/lib/estimate.js` and nowhere else.
- Phone numbers and the email live in `src/site.js` and nowhere else. In HTML write
  `{{site.person.number}}` and the like. Never type a number or the address into a page.
- There are two WhatsApp lines. A brief or an estimate goes to `site.person`, never to
  `site.chatbot`. Every link to the chatbot must say "chatbot", so nobody expects a person there.
- Move things with `transform` and fade them with `opacity`. Colour transitions are fine. Never
  animate layout properties such as `width`, `height`, `top`, `left` or `margin`.
- Everything must still work with reduced motion on, without WebGL 2, and at 390 px wide.
- Copy states facts Altraware has published. Do not invent clients, numbers or testimonials.
- Fonts and assets are self-hosted. Do not add a CDN link.

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

Some things a still picture cannot show. Check these by driving the page from a script:

- A page change. Open the page with `?slow=6`, click a link, then pause with
  `altraMotion.globalTimeline.pause()` before each picture. Check both directions and the menu on a
  phone.
- Back and Forward. The reader must return to the place and the choices they left.
- A number that counts. Wait three seconds after scrolling to it before reading the value.
