// Home page: the pinned row of selected work and the route that draws itself.

import { animate } from 'animejs';
import { ScrollTrigger, gsap, reducedMotion } from '../lib/motion.js';

const PINNED = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';
const SWIPED = '(max-width: 899px), (prefers-reduced-motion: reduce)';

function mountPlates(root, { stage, media }) {
  const section = root.querySelector('[data-plates]');
  if (!section) return undefined;

  const viewport = section.querySelector('[data-plates-viewport]');
  const track = section.querySelector('[data-plates-track]');
  const plates = [...track.children];
  const counted = plates.filter((plate) => !plate.classList.contains('plate--end')).length;
  const current = section.querySelector('[data-plates-current]');
  const bar = section.querySelector('[data-plates-bar]');
  const steppers = [...section.querySelectorAll('[data-plates-step]')];

  let active = -1;
  let inView = false;

  // Each plate has its own look for the chart, used while this section is the current scene.
  const applyLook = () => {
    const name = plates[active]?.dataset.stage;
    if (inView && name) stage.look(name, { duration: 900 });
  };

  const activate = (index) => {
    if (index === active) return;
    active = index;
    plates.forEach((plate, i) => plate.classList.toggle('is-active', i === index));
    current.textContent = String(Math.min(index + 1, counted)).padStart(2, '0');
    applyLook();
  };

  // The active plate is the one under a line across the row: `line` is how far
  // that line is from the row's left edge.
  const pick = (offset, line) => {
    let index = 0;
    plates.forEach((plate, i) => {
      if (plate.offsetLeft <= offset + line) index = i;
    });
    return index;
  };

  const onSceneEnter = () => {
    inView = true;
    applyLook();
  };
  const onSceneLeave = () => {
    inView = false;
  };
  section.addEventListener('scene:enter', onSceneEnter);
  section.addEventListener('scene:leave', onSceneLeave);

  activate(0);

  // Wide screens: pin the section and turn vertical scroll into sideways travel.
  media.add(PINNED, () => {
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

    const travel = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          gsap.set(bar, { scaleX: self.progress });
          activate(pick(self.progress * distance(), viewport.clientWidth * 0.5));
        },
      },
    });

    // Each numeral drifts against the row as its plate crosses the screen,
    // which gives the row some depth. The screenshots are left whole.
    gsap.utils.toArray('[data-plate-drift]', track).forEach((numeral) => {
      gsap.fromTo(
        numeral,
        { xPercent: 45 },
        {
          xPercent: -45,
          ease: 'none',
          scrollTrigger: {
            trigger: numeral.closest('.plate'),
            containerAnimation: travel,
            start: 'left right',
            end: 'right left',
            scrub: true,
          },
        },
      );
    });
  });

  // Small screens and reduced motion: a row of cards that scrolls sideways by
  // touch or keyboard, one card to a swipe (the stylesheet makes it snap). The
  // two buttons under the row move it by one card as well.
  media.add(SWIPED, () => {
    // Where a card comes to rest: its left edge on the page's margin.
    const rest = () => Number.parseFloat(getComputedStyle(viewport).scrollPaddingLeft) || 0;
    const furthest = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);

    const update = () => {
      const max = furthest();
      const at = viewport.scrollLeft;
      gsap.set(bar, { scaleX: max ? at / max : 0 });
      // The card at rest is the one whose middle has not yet left on the left.
      // At the far end the last card cannot reach the margin, so it wins there.
      activate(at >= max - 2 ? plates.length - 1 : pick(at, rest() + plates[0].offsetWidth * 0.5));
      steppers.forEach((button) => {
        const none = Number(button.dataset.platesStep) < 0 ? at <= 2 : at >= max - 2;
        button.setAttribute('aria-disabled', String(none));
      });
    };

    const step = (event) => {
      const by = Number(event.currentTarget.dataset.platesStep);
      const target = plates[Math.min(plates.length - 1, Math.max(0, active + by))];
      viewport.scrollTo({ left: target.offsetLeft - rest(), behavior: reducedMotion ? 'auto' : 'smooth' });
    };

    viewport.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    steppers.forEach((button) => button.addEventListener('click', step));
    update();

    return () => {
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      steppers.forEach((button) => button.removeEventListener('click', step));
    };
  });

  return () => {
    section.removeEventListener('scene:enter', onSceneEnter);
    section.removeEventListener('scene:leave', onSceneLeave);
  };
}

function mountRoute(root) {
  const body = root.querySelector('[data-route]');
  if (!body) return undefined;

  const chart = body.querySelector('[data-route-chart]');
  const plan = chart.querySelector('.route__plan');
  const done = chart.querySelector('.route__done');
  const vessel = chart.querySelector('.route__vessel');
  const waypoints = [...body.querySelectorAll('[data-waypoint]')];

  let length = 0;
  let marks = []; // how far along the route each waypoint sits, 0..1

  // The route runs through wherever the waypoints actually are on the page,
  // so it is rebuilt whenever the layout changes.
  function layout() {
    const width = chart.clientWidth;
    chart.setAttribute('viewBox', `0 0 ${width} ${body.offsetHeight}`);

    const points = waypoints.map((waypoint, index) => {
      const dot = waypoint.querySelector('.waypoint__dot');
      return { x: width * (index % 2 ? 0.74 : 0.26), y: waypoint.offsetTop + dot.offsetTop };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    const lengths = [0];
    for (let i = 1; i < points.length; i += 1) {
      const from = points[i - 1];
      const to = points[i];
      const pull = (to.y - from.y) * 0.5;
      path += ` C ${from.x} ${from.y + pull}, ${to.x} ${to.y - pull}, ${to.x} ${to.y}`;
      done.setAttribute('d', path);
      lengths.push(done.getTotalLength());
    }

    plan.setAttribute('d', path);
    length = lengths[lengths.length - 1];
    marks = lengths.map((value) => value / length);
    done.style.strokeDasharray = `${length}`;

    waypoints.forEach((waypoint, index) => waypoint.style.setProperty('--dot-x', `${points[index].x}px`));
  }

  // When the route reaches a waypoint, a ring opens out from its dot. Anime.js
  // drives one CSS variable and the stylesheet turns it into the ring.
  function ping(dot) {
    animate(dot, {
      '--ping': { from: 0, to: 1 },
      duration: 800,
      ease: 'outQuart',
      onComplete: () => dot.style.removeProperty('--ping'),
    });
  }

  function draw(progress) {
    done.style.strokeDashoffset = `${length * (1 - progress)}`;
    const point = done.getPointAtLength(length * progress);
    vessel.setAttribute('cx', point.x);
    vessel.setAttribute('cy', point.y);

    waypoints.forEach((waypoint, index) => {
      const reached = progress >= marks[index] - 0.004;
      if (reached === waypoint.classList.contains('is-reached')) return;
      waypoint.classList.toggle('is-reached', reached);
      if (reached && !reducedMotion) ping(waypoint.querySelector('.waypoint__dot'));
    });
  }

  layout();

  // Reduced motion: show the whole route, finished.
  if (reducedMotion) {
    const redraw = () => {
      layout();
      draw(1);
    };
    vessel.style.display = 'none';
    draw(1);
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }

  // Otherwise the route is drawn as far as the reader has scrolled.
  ScrollTrigger.create({
    trigger: body,
    start: 'top 68%',
    end: 'bottom 62%',
    onUpdate: (self) => draw(self.progress),
    onRefresh: (self) => draw(self.progress),
  });
  ScrollTrigger.addEventListener('refreshInit', layout);
  draw(0);

  return () => ScrollTrigger.removeEventListener('refreshInit', layout);
}

export function mountHome(root, deps) {
  const unmountPlates = mountPlates(root, deps);
  const unmountRoute = mountRoute(root);
  return () => {
    unmountPlates?.();
    unmountRoute?.();
  };
}
