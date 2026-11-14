// A scene is a top-level section of a page. It can set the theme
// (data-theme="night|day") and the look of the chart (data-stage="preset").
// The scene whose top has passed the middle of the screen wins.
//
// Each scene also gets 'scene:enter' and 'scene:leave' events, for sections
// that choose their look themselves (the pinned plates on the home page).

import { ScrollTrigger, gsap } from './motion.js';

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
    scene.dispatchEvent(new CustomEvent('scene:enter'));
  };

  scenes.forEach((scene, index) => {
    if (index === 0) return; // the first scene is applied by the page transition
    ScrollTrigger.create({
      trigger: scene,
      start: 'top 55%',
      onEnter: () => apply(scene),
      onLeaveBack: () => apply(scenes[index - 1]),
    });
  });

  return { first: scenes[0], apply };
}
