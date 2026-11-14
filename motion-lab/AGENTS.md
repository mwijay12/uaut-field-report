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
- A section declares its theme and chart look in HTML (`data-theme`, `data-stage`). Prefer that to
  new JavaScript.
- Move things with `transform` and fade them with `opacity`. Colour transitions are fine. Never
  animate layout properties such as `width`, `height`, `top`, `left` or `margin`.
- Everything must still work with reduced motion on, without WebGL 2, and at 390 px wide.
- Copy states facts Altraware has published. Do not invent clients, numbers or testimonials.
- Fonts and assets are self-hosted. Do not add a CDN link.

## Before you say it is done

```bash
npm run build
npm run preview &
npm run shot -- http://localhost:4173/ --name home --at 0,0.25,0.5,0.75,1
npm run shot -- http://localhost:4173/ --name m-home --viewport 390x844 --dpr 2 --touch --at 0,0.5,1
```

Then open the images in `shots/` and look at them. The script exits with an error on any console
error, console warning or failed request, and prints `overflowX`, which must be 0. Shoot every page
you touched, at both sizes. A clean build is not proof that the page looks right.
