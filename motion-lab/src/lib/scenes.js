// A scene is a top-level section of a page. It can set the theme
// (data-theme="night|day") and the look of the chart (data-stage="preset").
// The scene whose top has passed the middle of the screen wins.
//
// A scene can also quieten the chart. The build writes data-bg="soft|plain"
// and data-calm beside data-stage when content/site.json asks for it (the
// admin's Backgrounds page), and the chart fades to that level while the
// scene is the one being read. data-calm="1" leaves the flat page colour.
//
// Each scene also gets 'scene:enter' and 'scene:leave' events, for sections
// that choose their look themselves (the pinned plates on the home page).

import { ScrollTrigger, gsap } from './motion.js';

// How far down the screen a scene's top must be before it takes over.
const LINE = 0.55;

export function mountScenes(root, { stage, setTheme }) {
  // Not ':scope >': a pinned section is wrapped in a spacer and stops being a direct child.
  const scenes = gsap.utils.toArray('[data-theme]', root);
  let current = null;

  const apply = (scene, options) => {
    if (!scene || scene === current) return;
    current?.dispatchEvent(new CustomEvent('scene:leave'));
    current = scene;
    setTheme(scene.dataset.theme);
    if (scene.dataset.stage) stage.look(scene.dataset.stage, options);
    stage.calm(Number(scene.dataset.calm) || 0, options);
    // For what stands over the chart and belongs to no section: the header.
    document.documentElement.dataset.chart = scene.dataset.bg === 'plain' ? 'off' : 'on';
    scene.dispatchEvent(new CustomEvent('scene:enter'));
  };

  scenes.forEach((scene, index) => {
    if (index === 0) return; // the first scene is applied by the page transition
    ScrollTrigger.create({
      trigger: scene,
      start: `top ${LINE * 100}%`,
      onEnter: () => apply(scene),
      onLeaveBack: () => apply(scenes[index - 1]),
    });
  });

  return {
    first: scenes[0],
    apply,

    /** Apply whichever scene the reader is looking at now (after a jump to an anchor or a remembered place). */
    sync(options) {
      const line = window.innerHeight * LINE;
      let chosen = scenes[0];
      for (const scene of scenes) {
        if (scene.getBoundingClientRect().top <= line) chosen = scene;
      }
      apply(chosen, options);
    },
  };
}
