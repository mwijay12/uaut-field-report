// Numbers that count.
//
//   <span data-count="350000">350,000</span>   counts up from 0 when scrolled into view
//   data-count-from="100"                      start somewhere else
//   data-count-decimals="1"                    keep one decimal (0.8)
//   data-count-pad="2"                         pad with zeros (04)
//
// The HTML holds the final number, so it is right without JavaScript and with
// reduced motion. Screen readers get the final number, not every step.

import { gsap, reducedMotion } from './motion.js';

export function formatNumber(value, { decimals = 0, pad = 0 } = {}) {
  const text = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-US');
  return pad ? text.padStart(pad, '0') : text;
}

export function mountNumbers(root) {
  if (reducedMotion) return;

  gsap.utils.toArray('[data-count]', root).forEach((element) => {
    const options = {
      decimals: Number(element.dataset.countDecimals ?? 0),
      pad: Number(element.dataset.countPad ?? 0),
    };
    const state = { value: Number(element.dataset.countFrom ?? 0) };

    const spoken = document.createElement('span');
    spoken.className = 'sr-only';
    spoken.textContent = element.textContent;
    element.setAttribute('aria-hidden', 'true');
    element.after(spoken);

    // Hold the width of the final number, so nothing around it moves while it counts.
    element.style.minWidth = `${element.getBoundingClientRect().width}px`;
    element.textContent = formatNumber(state.value, options);

    gsap.to(state, {
      value: Number(element.dataset.count),
      duration: 1.8,
      ease: 'power3.out',
      onUpdate: () => {
        element.textContent = formatNumber(state.value, options);
      },
      scrollTrigger: { trigger: element, start: 'top 92%', once: true },
    });
  });
}

const shown = new WeakMap();

/**
 * Move the number in `element` from what it shows now to `to`.
 * The first call just writes the number. Later calls count to it.
 */
export function tweenNumber(element, to, format = formatNumber) {
  const state = shown.get(element) ?? { value: to };
  shown.set(element, state);
  gsap.killTweensOf(state);

  if (reducedMotion || state.value === to) {
    state.value = to;
    element.textContent = format(to);
    return;
  }

  gsap.to(state, {
    value: to,
    duration: 0.7,
    ease: 'power3.out',
    onUpdate: () => {
      element.textContent = format(state.value);
    },
  });
}
