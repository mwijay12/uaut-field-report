// Line drawings that draw themselves. Declared in the HTML, so a new drawing
// needs no new JavaScript. Put data-draw on an <svg>, or on anything that
// holds several (a list of ticks), and every stroked shape inside is drawn in
// the order it is written, once, when it scrolls into view.
//
// On the element with data-draw:
//   data-draw="scrub"       the drawing follows the scroll instead of playing once.
//                           data-draw-from and data-draw-to say where on the screen it
//                           begins and is finished ("top 85%" and "bottom 60%" if not given)
//   data-draw-step="0.07"   seconds from the start of one shape to the start of the next
//   data-draw-delay="0.5"   wait this long after it comes into view
//
// On a shape inside it:
//   data-at=">0.2"          when it starts, as a GSAP position. ">" is after the one
//                           before has finished, "<" is together with the one before
//   data-draw-time="1.2"    how long its line takes (otherwise set by its length)
//   data-fade               appears instead of being drawn (text, a filled area)
//   data-pop                grows from nothing (a dot)
//   data-still              is left alone
//
// And these keep moving once the drawing is finished, while it is on screen:
//   data-travel="#path"     goes along that path, round and round (data-travel-time="3")
//   data-blink              fades down and up, one after another
//   data-wander="38"        a <g> that swings round the middle of the drawing to that
//                           angle and never quite settles (a compass needle)
//
// With reduced motion nothing here runs and the drawing is simply there.

import { ScrollTrigger, gsap, reducedMotion } from './motion.js';

const SHAPES = 'path, line, polyline, polygon, rect, circle, ellipse';
const clamp = gsap.utils.clamp;

function build(host) {
  const step = Number(host.dataset.drawStep ?? 0.07);
  const delay = Number(host.dataset.drawDelay ?? 0);
  const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  const loops = [];

  // Where a part goes on the timeline: where it says, or one step after the
  // part before it began. The first part waits out the delay.
  let started = false;
  const at = (part) => {
    const position = part.dataset.at ?? (started ? `<${step}` : delay);
    started = true;
    return position;
  };

  // Everything starts hidden and is switched on the moment its turn comes, so
  // a round line end never shows as a dot before the line is drawn.
  const show = (part) => {
    gsap.set(part, { autoAlpha: 0 });
    timeline.set(part, { autoAlpha: 1 }, at(part));
  };

  for (const part of host.querySelectorAll(`${SHAPES}, text, g[data-wander]`)) {
    if (part.closest('defs, symbol, [data-still]')) continue;

    if (part.hasAttribute('data-wander')) {
      const box = part.ownerSVGElement.viewBox.baseVal;
      const middle = `${box.x + box.width / 2} ${box.y + box.height / 2}`;
      const rest = Number(part.dataset.wander) || 0;
      gsap.set(part, { rotation: rest - 150, svgOrigin: middle });
      timeline.to(part, { rotation: rest, duration: 2.4, ease: 'elastic.out(1, 0.45)' }, at(part));
      loops.push(gsap.to(part, { rotation: rest + 5, duration: 2.2, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true }));
    } else if (part.hasAttribute('data-travel')) {
      const path = host.querySelector(part.dataset.travel);
      if (!path) continue;
      gsap.set(part, { autoAlpha: 0 });
      timeline.to(part, { autoAlpha: 1, duration: 0.3 }, at(part));
      loops.push(
        gsap.to(part, {
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
          duration: Number(part.dataset.travelTime ?? 3),
          ease: 'none',
          repeat: -1,
          paused: true,
        }),
      );
    } else if (part.hasAttribute('data-blink')) {
      show(part);
      timeline.from(part, { drawSVG: '50% 50%', duration: 0.5 }, '<');
      loops.push(gsap.to(part, { autoAlpha: 0.2, duration: 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true, delay: loops.length * 0.12 }));
    } else if (part.hasAttribute('data-pop')) {
      show(part);
      timeline.from(part, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.2)' }, '<');
    } else if (part.hasAttribute('data-fade') || part.tagName === 'text') {
      gsap.set(part, { autoAlpha: 0 });
      timeline.to(part, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, at(part));
    } else {
      const length = part.getTotalLength?.() ?? 120;
      const duration = Number(part.dataset.drawTime ?? clamp(0.3, 1.1, length / 380));
      show(part);
      timeline.from(part, { drawSVG: '0%', duration }, '<');
    }
  }

  return { timeline, loops };
}

export function mountDrawings(root) {
  const hosts = gsap.utils.toArray('[data-draw]', root);
  if (!hosts.length) return;

  // The plugin looks for this attribute to know that a line keeps its width
  // when the drawing is scaled. The same is set in CSS for when this never runs.
  for (const host of hosts) {
    for (const shape of host.querySelectorAll(SHAPES)) shape.setAttribute('vector-effect', 'non-scaling-stroke');
  }
  if (reducedMotion) return;

  for (const host of hosts) {
    const { timeline, loops } = build(host);
    let finished = false;
    let onScreen = false;

    const run = () => loops.forEach((loop) => (finished && onScreen ? loop.play() : loop.pause()));
    timeline.eventCallback('onComplete', () => {
      finished = true;
      run();
    });

    if (host.dataset.draw === 'scrub') {
      ScrollTrigger.create({
        trigger: host,
        start: host.dataset.drawFrom ?? 'top 85%',
        end: host.dataset.drawTo ?? 'bottom 60%',
        scrub: 0.6,
        animation: timeline,
      });
    } else {
      ScrollTrigger.create({ trigger: host, start: 'top 86%', once: true, onEnter: () => timeline.play() });
    }

    // Nothing loops while nobody can see it.
    ScrollTrigger.create({
      trigger: host,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        onScreen = self.isActive;
        run();
      },
    });
  }
}
