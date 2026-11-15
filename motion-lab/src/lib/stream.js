// Writes out the text of an element, as if it were being typed or generated.
//
// The text never leaves the page. What is not written yet stays in its place
// and is only see-through, so the block keeps its size and its line breaks,
// nothing under it moves, and a screen reader has the whole text from the
// start. A link inside the text stays a link. When the writing ends, or is
// stopped, the element is put back exactly as it was.
//
// The text has to be ordinary running text. Inside a flex or a grid box each
// piece would become an item of its own, and the words would move.
//
//   const writing = write(element);                    // starts at once
//   const writing = write(element, { paused: true });  // hides the text and waits
//   writing.play();
//   writing.stop();                                    // everything is there, now
//   writing.busy                                       // false once it is all written
//
// Options
//   words    true (the default): a whole word at a time, the way generated
//            text arrives. false: letter by letter, like a typewriter.
//   rate     characters a second (default 150)
//   max      the longest it may take, in seconds (default 1.5). A long text
//            is written faster, so nobody waits for it.
//   from, to write only this stretch (character counts). The text before
//            `from` and after `to` is simply there.
//   delay    seconds before the first character
//   hold     seconds the caret stays after the last one (default 0.7)
//   paused   wait for play()
//   onDone   called when everything is written and the element is tidy again
//
// Callers skip this under reduced motion: the text is then simply there.
// The classes are styled in src/styles/components.css.

import { gsap } from './motion.js';

export function write(element, options = {}) {
  const { from = 0, rate = 150, max = 1.5, words = true, delay = 0, hold = 0.7, paused = false, onDone } = options;

  // Every run of text in reading order, and what stands among the text.
  const runs = []; // { node, text, start } and, once split: first, stop, rest, tail
  const guests = []; // { element, at }: a link or an icon, kept back until the writing reaches it
  let total = 0;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.data) continue;
      runs.push({ node, text: node.data, start: total });
      total += node.data.length;
    } else if (node.parentNode === element) {
      guests.push({ element: node, at: total });
    }
  }

  const to = Math.min(options.to ?? total, total);
  const whole = runs.map((run) => run.text).join('');

  // A run becomes three pieces: what is written (the node itself), what is
  // still to come (see-through), and what lies past the end of the stretch.
  for (const run of runs) {
    if (run.start + run.text.length <= from || run.start >= to) continue;
    run.first = Math.max(0, from - run.start);
    run.stop = Math.min(run.text.length, to - run.start);
    run.rest = document.createElement('span');
    run.rest.className = 'stream__rest';
    run.rest.append('');
    run.node.after(run.rest);
    if (run.stop < run.text.length) {
      run.tail = document.createTextNode(run.text.slice(run.stop));
      run.rest.after(run.tail);
    }
  }
  const split = runs.filter((run) => run.rest);

  // The caret takes no room, so it cannot push a word onto the next line.
  const caret = document.createElement('span');
  caret.className = 'stream__caret';
  caret.setAttribute('aria-hidden', 'true');

  let shown = -1;
  let tidy = false;

  /** Show the text up to this character. */
  function show(count) {
    if (tidy || count === shown) return;
    shown = count;

    let current = split[0]; // the run the writing is in
    for (const run of split) {
      const done = Math.min(run.stop, Math.max(run.first, count - run.start));
      run.node.data = run.text.slice(0, done);
      run.rest.firstChild.data = run.text.slice(done, run.stop);
      if (count > run.start) current = run;
    }
    for (const guest of guests) {
      guest.element.classList.toggle('stream__wait', count < to && guest.at >= Math.max(count, from) && guest.at <= to);
    }
    if (current && caret.previousSibling !== current.node) current.node.after(caret);
  }

  /** The end of the word this character is in. */
  function wordEnd(count) {
    if (count <= from) return from;
    let end = count;
    while (end < to && !/\s/.test(whole[end])) end += 1;
    return end;
  }

  /** Put the element back the way it was. */
  function restore() {
    if (tidy) return;
    tidy = true;
    caret.remove();
    for (const run of split) {
      run.node.data = run.text;
      run.rest.remove();
      run.tail?.remove();
    }
    for (const guest of guests) guest.element.classList.remove('stream__wait');
    element.classList.remove('is-writing', 'is-written');
  }

  element.classList.add('is-writing');
  show(from);

  const cursor = { at: from };
  const timeline = gsap
    .timeline({ paused })
    .to({}, { duration: delay || 0.001 })
    .to(cursor, {
      at: to,
      duration: gsap.utils.clamp(0.12, max, (to - from) / rate),
      ease: 'none',
      onUpdate: () => show(words ? wordEnd(Math.round(cursor.at)) : Math.round(cursor.at)),
    })
    .call(() => {
      show(to);
      element.classList.add('is-written'); // the caret rests, and blinks
    })
    .to({}, { duration: hold || 0.001 })
    .call(() => {
      restore();
      onDone?.();
    });

  return {
    play() {
      if (!tidy) timeline.play();
    },
    get busy() {
      return !tidy;
    },
    stop() {
      timeline.kill();
      restore();
    },
  };
}
