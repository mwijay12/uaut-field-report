// A row of words that never stops. Scrolling pushes it along: faster when you
// scroll faster, and the other way when you scroll back up.
//
//   <div class="marquee" data-marquee="70" aria-hidden="true">   70 = pixels per second at rest
//     <div class="marquee__track" data-marquee-track>…items…</div>
//   </div>
//
// The items are copied once so the row can loop without a seam. Space the
// items with padding, not gap, or the two halves will not be the same width.

import { ScrollTrigger, gsap, reducedMotion } from './motion.js';

const BOOST = 1 / 320; // extra speed per pixel-per-second of scrolling
const MAX_BOOST = 7;

function run(band) {
  const track = band.querySelector('[data-marquee-track]');
  for (const item of [...track.children]) {
    const copy = item.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.append(copy);
  }
  if (reducedMotion) return () => {};

  const cruise = Number(band.dataset.marquee) || 70;
  const place = gsap.quickSetter(track, 'x', 'px');

  let half = track.scrollWidth / 2;
  let x = 0;
  let speed = -cruise;
  let push = 1;
  let heading = -1; // -1 runs left, 1 runs right
  let visible = false;

  ScrollTrigger.create({
    trigger: band,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      visible = self.isActive;
    },
    onUpdate: (self) => {
      heading = self.direction === 1 ? -1 : 1;
      push = 1 + Math.min(MAX_BOOST, Math.abs(self.getVelocity()) * BOOST);
    },
    onRefresh: () => {
      half = track.scrollWidth / 2;
    },
  });

  const tick = (time, delta) => {
    if (!visible || !half) return;
    push += (1 - push) * 0.06; // ease back to the cruising speed
    speed += (cruise * push * heading - speed) * 0.1;
    x = gsap.utils.wrap(-half, 0, x + (speed * delta) / 1000);
    place(x);
  };

  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

export function mountMarquee(root) {
  const stops = gsap.utils.toArray('[data-marquee]', root).map(run);
  return () => stops.forEach((stop) => stop());
}
