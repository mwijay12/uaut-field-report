# Premium web sources: WebGL, GLSL, GSAP, Barba.js, Anime.js, tween.js

A working list of repositories to learn from and build on when the goal is premium, motion-heavy websites built with AI coding agents.

Every repository below was checked against the GitHub API on **2026-11-14**. Stars are rounded. The licence column matters as much as the star count, because it decides whether you may ship the code in client work.

| Licence shown | What you may do |
|---|---|
| MIT, Apache-2.0, BSD, Zlib, CC0, Unlicense | Adapt and ship, including commercially. Keep the copyright notice where the licence asks for it. |
| MPL-2.0 | Ship, but changes to the MPL files themselves stay open. |
| **none** | No licence file, so all rights are reserved. Read it, learn the technique, rebuild it yourself. Do not copy it into a client project. |
| custom | Read the licence before use. The notes column says why. |

## Start here

If you only open ten links, open these.

| Repository | Why |
|---|---|
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | Official GSAP skills for AI agents. The single biggest quality jump for agent-written animation code. |
| [codrops](https://github.com/codrops) | 354 public demo repos from Codrops. Most recent ones are MIT and use GSAP, WebGL or both. This is the closest thing to a library of pro effects with source. |
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | 13 three.js skills for agents, including shaders, post-processing and performance. |
| [gokayfem/shader-skills](https://github.com/gokayfem/shader-skills) | GLSL and Shadertoy skill for agents. |
| [patriciogonzalezvivo/thebookofshaders](https://github.com/patriciogonzalezvivo/thebookofshaders) | The standard way to learn fragment shaders. |
| [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions) | Open collection of GLSL transitions, ready for image and page transitions. |
| [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | Smooth scroll used on most award sites. Pairs with GSAP ScrollTrigger. |
| [darkroomengineering/satus](https://github.com/darkroomengineering/satus) | The Next.js starter the Lenis studio builds client sites from. |
| [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) | A complete, MIT-licensed, award-level three.js site to read end to end. |
| [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) | Agent skill for immersive scroll-driven sites, with a verification pass built in. |

## 1. The libraries

Versions are the current npm releases on 2026-11-14.

| Library | Repository | Stars | Licence | npm | Use it for |
|---|---|---|---|---|---|
| three.js | [mrdoob/three.js](https://github.com/mrdoob/three.js) | 118k | MIT | `three` 0.187.0 | 3D scenes, particles, shader materials. |
| GSAP | [greensock/GSAP](https://github.com/greensock/GSAP) | 30.6k | custom | `gsap` 3.15.1 | Timelines, ScrollTrigger, SplitText, Flip. |
| Anime.js | [juliangarnier/anime](https://github.com/juliangarnier/anime) | 74.6k | MIT | `animejs` 4.5.0 | Light staggered and SVG animation. Version 4 is modular. |
| tween.js | [tweenjs/tween.js](https://github.com/tweenjs/tween.js) | 10.2k | MIT | `@tweenjs/tween.js` 25.0.0 | Tweening plain numbers inside a render loop, such as uniforms and cameras. |
| Barba.js | [barbajs/barba](https://github.com/barbajs/barba) | 13.0k | MIT | `@barba/core` 2.10.3 | Page transitions on multi-page sites. |
| Lenis | [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | 17.3k | MIT | `lenis` 1.3.27 | Smooth scroll. |
| OGL | [oframe/ogl](https://github.com/oframe/ogl) | 4.8k | Unlicense | `ogl` 1.0.11 | Minimal WebGL when three.js is too heavy. |

Notes on these:

- **GSAP is free, including every plugin** that used to be paid (SplitText, MorphSVG and the rest). It is not open source. It ships under GreenSock's [standard no-charge licence](https://gsap.com/standard-license), which is worth reading once.
- **Barba.js is stable but slow-moving.** Its last push was December 2024. It still works well. The actively maintained alternatives are [swup/swup](https://github.com/swup/swup) (5.3k, MIT) and [craftedbygc/taxi](https://github.com/craftedbygc/taxi) (643, BSD-3-Clause).
- **tween.js ships inside three.js** at `examples/jsm/libs/tween.module.js`, so the official three.js examples are also tween.js examples.
- **One conductor per element.** GSAP, Anime.js and tween.js all do the same core job. Let GSAP own timelines and scroll, and give the other two narrow jobs. Two engines animating the same property on the same element will fight.

## 2. Agent skills and MCP servers

These teach an agent the correct API and patterns before it writes code. Install commands are copied from each repository's README and were not executed here. A skill is third-party instructions and scripts running with your agent's permissions, so skim it before installing.

### Core stack

| Repository | Stars | Licence | Contents | Install |
|---|---|---|---|---|
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 18.4k | MIT | Official. Core, timeline, ScrollTrigger, plugins, utils, React, frameworks, performance, plus `llms.txt`. | `npx skills add https://github.com/greensock/gsap-skills` |
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | 4.2k | MIT | Fundamentals, geometry, materials, lighting, textures, animation, loaders, shaders, post-processing, interaction, performance, asset pipeline, R3F. | `npx skills add cloudai-x/threejs-skills` |
| [gokayfem/shader-skills](https://github.com/gokayfem/shader-skills) | 452 | MIT | GLSL and Shadertoy: noise, SDF raymarching, colour. Has tests and evals. | `npx skills add gokayfem/shader-skills` |
| [iart-ai/webgl-animation-skills](https://github.com/iart-ai/webgl-animation-skills) | 57 | MIT | Particle systems, GLSL shaders, three.js animation. | `npx skills add iart-ai/webgl-animation-skills` |
| [iart-ai/web-animation-skills](https://github.com/iart-ai/web-animation-skills) | 92 | MIT | GSAP, page transitions, SVG, micro-interactions, 60fps and accessible animation. | `npx skills add iart-ai/web-animation-skills` |

### Whole-site direction

| Repository | Stars | Licence | Contents | Install |
|---|---|---|---|---|
| [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) | 5.1k | MIT | Premium scroll-driven sites, with a browser verification pass. | `/plugin marketplace add nateherkai/scroll-craft` |
| [juliobsz/skills](https://github.com/juliobsz/skills) | 1.3k | MIT | `awwwards` builds a site from one line. `jury` scores it. | `npx skills add juliobsz/skills -g` |
| [agiwhitelist/auteur](https://github.com/agiwhitelist/auteur) | 1.0k | MIT | Directs a website like a film: shot list, assets, build, review. | See README |
| [Moh4696/open-3d-skills](https://github.com/Moh4696/open-3d-skills) | 376 | MIT | three.js scenes, scroll films, cursor rigs, exploded views, site checks. | `npx skills add Moh4696/open-3d-skills` |
| [AThevon/genjutsu](https://github.com/AThevon/genjutsu) | 796 | MIT | Creative coding, motion and micro-interaction skills. | See README |
| [bizarro/skills](https://github.com/bizarro/skills) | 29 | MIT | Luis Bizarro's creative-development practice as a skill. Few stars, strong author. | `npx skills add bizarro/skills` |
| [darkroomengineering/cc-settings](https://github.com/darkroomengineering/cc-settings) | 53 | MIT | The Lenis studio's own Claude Code agents, skills and hooks. | See README |
| [INSANE0777/Awwwards-mcp](https://github.com/INSANE0777/Awwwards-mcp) | 736 | MIT | MCP server that gives agents design evidence from award sites. | `claude mcp add awwwards -- npx -y awwwards-mcp` |

### Design taste and review

| Repository | Stars | Licence | Contents |
|---|---|---|---|
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 110k | Apache-2.0 | Design vocabulary for agents: polish, bolder, critique. |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | 56.8k | MIT | Animation skills: animate, review, performance, choreograph. |
| [anthropics/skills](https://github.com/anthropics/skills) | 194k | per skill | Includes `frontend-design` and `webapp-testing`. |
| [heydamir/unslop](https://github.com/heydamir/unslop) | 15.9k | CC-BY-4.0 | Turns AI-looking UI into a designed interface. |
| [MengTo/Skills](https://github.com/MengTo/Skills) | 7.5k | MIT | Skills for designers and builders. |

`npx skills` is the installer from [vercel-labs/skills](https://github.com/vercel-labs/skills) (39k, MIT). Directories to browse for more: [frankxai/awesome-motion-design-agent-skills](https://github.com/frankxai/awesome-motion-design-agent-skills) and [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills).

## 3. Source code of pro sites and effects

### Codrops

[github.com/codrops](https://github.com/codrops) is the main source. Each repo is one focused effect with a written tutorial on tympanus.net/codrops. Repos from about 2021 onward are almost all MIT. Older ones often have no licence.

| Repository | Stars | Licence | Effect |
|---|---|---|---|
| [interlude](https://github.com/codrops/interlude) | 51 | MIT | Starter for custom page transitions with GSAP and WebGL, on Astro. November 2026. |
| [SeamTransitions](https://github.com/codrops/SeamTransitions) | 11 | MIT | Eleven scroll-driven transitions between a hero and the page under it, with GSAP and WebGL. |
| [TextCharacterAnimations](https://github.com/codrops/TextCharacterAnimations) | 18 | MIT | Nineteen per-character text animations with GSAP SplitText, four drawn in WebGL. |
| [ScrollBasedLayoutAnimations](https://github.com/codrops/ScrollBasedLayoutAnimations) | 340 | MIT | Layout switches on scroll with ScrollTrigger and Flip. |
| [OnScrollTypographyAnimations](https://github.com/codrops/OnScrollTypographyAnimations) | 351 | MIT | On-scroll typography. |
| [SlideshowAnimations](https://github.com/codrops/SlideshowAnimations) | 304 | MIT | Slideshow transitions. |
| [KineticTypePageTransition](https://github.com/codrops/KineticTypePageTransition) | 128 | MIT | Kinetic typography page transition. |
| [ScrollBlurTypography](https://github.com/codrops/ScrollBlurTypography) | 150 | MIT | Blurred text reveals on scroll. |
| [StickySections](https://github.com/codrops/StickySections) | 133 | MIT | Sticky sections animating as they leave the viewport. |
| [ScrollAnimationsGrid](https://github.com/codrops/ScrollAnimationsGrid) | 120 | MIT | Image effects when scrolling a grid. |
| [OnScrollLayoutFormations](https://github.com/codrops/OnScrollLayoutFormations) | 114 | MIT | Layout formations on scroll. |
| [3DStackMotion](https://github.com/codrops/3DStackMotion) | 120 | MIT | 3D card stack on scroll. |
| [MagneticButtons](https://github.com/codrops/MagneticButtons) | 484 | MIT | Magnetic buttons. |
| [WebGLBlobs](https://github.com/codrops/WebGLBlobs) | 95 | MIT | Deformed, coloured spheres in three.js. |
| [CinemaSeatPreview](https://github.com/codrops/CinemaSeatPreview) | 18 | MIT | 3D cinema you fly through. October 2026. |
| [isle-thorne-collective](https://github.com/codrops/isle-thorne-collective) | 19 | MIT | Complete furniture shop template with page transitions, on Astro. |
| [CodropsTemplate](https://github.com/codrops/CodropsTemplate) | 137 | MIT | The boilerplate Codrops demos start from. |
| [RainEffect](https://github.com/codrops/RainEffect) | 1.8k | none | WebGL rain and water drops. Study only. |
| [PageTransitions](https://github.com/codrops/PageTransitions) | 2.3k | none | Large CSS page-transition showcase. Study only. |

Anime.js demos on Codrops use the older v2 and v3 API, so port them to v4: [GridRevealEffects](https://github.com/codrops/GridRevealEffects), [LetterEffects](https://github.com/codrops/LetterEffects), [TooltipAnimations](https://github.com/codrops/TooltipAnimations). All three have no licence.

### Complete sites, open source

| Repository | Stars | Licence | What it is |
|---|---|---|---|
| [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) | 2.0k | MIT | Bruno Simon's current portfolio. |
| [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) | 4.7k | MIT | The drivable-car portfolio. |
| [HamishMW/portfolio](https://github.com/HamishMW/portfolio) | 3.6k | MIT | React and three.js portfolio with a displacement-shader hero. |
| [Naresh-Khatri/3d-portfolio](https://github.com/Naresh-Khatri/3d-portfolio) | 1.3k | MIT | Next.js, three.js and GSAP portfolio. |
| [alienkitty/alien.js](https://github.com/alienkitty/alien.js) | 1.0k | MIT | Render pipeline and a large set of shader examples. |
| [ITomPoland/portfolio-itom](https://github.com/ITomPoland/portfolio-itom) | 479 | MIT | R3F and GSAP 3D portfolio. |
| [Musab-Hassan/musabhassan.com](https://github.com/Musab-Hassan/musabhassan.com) | 221 | MPL-2.0 | Portfolio featured on Awwwards, with assets. |
| [darkroomengineering/satus](https://github.com/darkroomengineering/satus) | 1.0k | MIT | Studio starter: Next.js App Router, Lenis, WebGL. |
| [basementstudio/website-2k25](https://github.com/basementstudio/website-2k25) | 268 | none | The basement.studio site. Study only. |
| [bizarro/bizar.ro](https://github.com/bizarro/bizar.ro) | 219 | none | Luis Bizarro's 2020 to 2023 portfolio. Study only. |
| [davidhckh/portfolio-2025](https://github.com/davidhckh/portfolio-2025) | 887 | custom | three.js and Vue portfolio. Read the licence. |

### Tutorial builds and clones

Good for learning a full build. None has a licence, and most use another company's brand and assets, so treat them as practice, not as client deliverables.

| Repository | Stars | Stack |
|---|---|---|
| [adrianhajdin/iphone](https://github.com/adrianhajdin/iphone) | 1.7k | GSAP and three.js |
| [adrianhajdin/award-winning-website](https://github.com/adrianhajdin/award-winning-website) | 1.1k | GSAP and React |
| [adrianhajdin/gsap_cocktails](https://github.com/adrianhajdin/gsap_cocktails) | 388 | GSAP SplitText and ScrollTrigger |
| [adrianhajdin/gsap_macbook_landing](https://github.com/adrianhajdin/gsap_macbook_landing) | 218 | GSAP and three.js |
| [adrianhajdin/jsm_gta_vi_landing](https://github.com/adrianhajdin/jsm_gta_vi_landing) | 210 | GSAP pinned scroll |
| [olivierlarose/awwwards-landing-page](https://github.com/olivierlarose/awwwards-landing-page) | 230 | Next.js and GSAP. His account holds dozens of small single-effect repos. |
| [Fullstack-Empire/GSAP-Awwwards-Website](https://github.com/Fullstack-Empire/GSAP-Awwwards-Website) | 304 | GSAP |
| [Z4YT0N/awwwards-collection](https://github.com/Z4YT0N/awwwards-collection) | 30 | Index of 257 creative web projects. |

## 4. WebGL and GLSL

### Learn

| Repository | Stars | Licence | Notes |
|---|---|---|---|
| [patriciogonzalezvivo/thebookofshaders](https://github.com/patriciogonzalezvivo/thebookofshaders) | 7.1k | custom | Fragment shaders step by step. Read it, do not redistribute it. |
| [gfxfundamentals/webgl2-fundamentals](https://github.com/gfxfundamentals/webgl2-fundamentals) | 2.0k | BSD-3-Clause | Raw WebGL 2 from the basics. |
| [gfxfundamentals/webgl-fundamentals](https://github.com/gfxfundamentals/webgl-fundamentals) | 5.0k | custom | Raw WebGL 1. |
| [ekzhang/graphics-workshop](https://github.com/ekzhang/graphics-workshop) | 2.2k | MIT | Learn graphics by writing shaders. |
| [mattdesl/workshop-webgl-glsl](https://github.com/mattdesl/workshop-webgl-glsl) | 1.0k | none | Workshop on WebGL and GLSL. |

### Shader building blocks

| Repository | Stars | Licence | Notes |
|---|---|---|---|
| [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions) | 2.3k | MIT | Each transition states its licence. All are MIT except two under BSD. |
| [ashima/webgl-noise](https://github.com/ashima/webgl-noise) | 3.0k | MIT | Simplex and classic noise. |
| [stegu/webgl-noise](https://github.com/stegu/webgl-noise) | 600 | MIT | The maintained fork of the above. |
| [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | 3.5k | custom | Large shader library. Dual-licensed: free for non-commercial use, and commercial use needs the Patron licence through sponsorship. |
| [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | 16.8k | MIT | The fluid cursor effect seen on many sites. |
| [paper-design/shaders](https://github.com/paper-design/shaders) | 4.0k | Apache-2.0 | Zero-dependency canvas shaders. |
| [basementstudio/shader-lab](https://github.com/basementstudio/shader-lab) | 723 | Apache-2.0 | Create, stack and animate shaders. |
| [tengbao/vanta](https://github.com/tengbao/vanta) | 7.4k | MIT | Drop-in animated 3D backgrounds. Last push March 2024. |
| [shuding/cobe](https://github.com/shuding/cobe) | 6.1k | MIT | 5KB WebGL globe. |

### DOM and WebGL together

| Repository | Stars | Licence | Notes |
|---|---|---|---|
| [martinlaxenaire/curtainsjs](https://github.com/martinlaxenaire/curtainsjs) | 1.8k | MIT | Turns DOM images and videos into WebGL planes. |
| [fand/vfx-js](https://github.com/fand/vfx-js) | 1.2k | MIT | WebGL effects on ordinary DOM elements. |
| [robin-dela/hover-effect](https://github.com/robin-dela/hover-effect) | 1.9k | MIT | Displacement-map image hover. |
| [14islands/r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig) | 993 | MIT | Syncs 3D meshes to DOM elements while scrolling. |
| [akella/webgl-mouseover-effects](https://github.com/akella/webgl-mouseover-effects) | 404 | MIT | Yuri Artiukh's hover effects. |
| [akella/webGLImageTransitions](https://github.com/akella/webGLImageTransitions) | 494 | none | Image transitions. Study only. |
| [bizarro/infinite-webl-gallery](https://github.com/bizarro/infinite-webl-gallery) | 205 | MIT | Infinite auto-scrolling gallery in OGL. |
| [ykob/sketch-threejs](https://github.com/ykob/sketch-threejs) | 2.6k | MIT | A large set of three.js sketches. |

### Tooling

| Repository | Stars | Licence | Notes |
|---|---|---|---|
| [UstymUkhman/vite-plugin-glsl](https://github.com/UstymUkhman/vite-plugin-glsl) | 427 | MIT | Import and `#include` shader files in Vite. |
| [FarazzShaikh/THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) | 1.4k | MIT | Extend three.js standard materials with your own GLSL. |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | 3.0k | Zlib | Post-processing for three.js. |
| [cocopon/tweakpane](https://github.com/cocopon/tweakpane) | 4.7k | MIT | Parameter panel for tuning uniforms live. |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | 2.1k | MIT | Compress and optimise 3D models. |

## 5. Page transitions

| Repository | Stars | Licence | Notes |
|---|---|---|---|
| [barbajs/barba](https://github.com/barbajs/barba) | 13.0k | MIT | The library. |
| [Ihatetomatoes/barbajs-demos](https://github.com/Ihatetomatoes/barbajs-demos) | 75 | MIT | Barba and GSAP demo collection. |
| [codrops/interlude](https://github.com/codrops/interlude) | 51 | MIT | GSAP and WebGL transitions, current code. |
| [swup/swup](https://github.com/swup/swup) | 5.3k | MIT | Maintained alternative with a plugin system. |
| [craftedbygc/taxi](https://github.com/craftedbygc/taxi) | 643 | BSD-3-Clause | Small alternative from a studio. |
| [ismamz/next-transition-router](https://github.com/ismamz/next-transition-router) | 369 | MIT | Animated transitions for the Next.js App Router with GSAP. |

Open-source sites that combine Barba with WebGL are rare. The few that exist are small course follow-alongs such as [madebyalex/awwwards-webgl-barba](https://github.com/madebyalex/awwwards-webgl-barba). The rule that makes the combination work: put the WebGL canvas outside the Barba container so it survives navigation, and animate its uniforms during the transition.

## 6. Animated component libraries

Copy-paste components are easy for an agent to adapt.

| Repository | Stars | Licence | Notes |
|---|---|---|---|
| [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits) | 51.9k | custom | MIT plus Commons Clause: use it in products, do not resell the components themselves. |
| [magicuidesign/magicui](https://github.com/magicuidesign/magicui) | 23.3k | MIT | Animated components for design engineers. |
| [MengTo/threeui](https://github.com/MengTo/threeui) | 7.3k | MIT | Interactive three.js components. |
| [ibelick/motion-primitives](https://github.com/ibelick/motion-primitives) | 7.0k | MIT | Animated UI kit. |
| [DavidHDev/canvas-ui](https://github.com/DavidHDev/canvas-ui) | 5.4k | custom | WebGL effects over real HTML. Same licence as react-bits. |
| [whatisjery/atelier-ui](https://github.com/whatisjery/atelier-ui) | 45 | MIT | WebGL and motion component registry for React. |

## 7. More lists

- [terkelg/awesome-creative-coding](https://github.com/terkelg/awesome-creative-coding) (15.6k)
- [sjfricke/awesome-webgl](https://github.com/sjfricke/awesome-webgl) (1.5k, CC0)
- [vanrez-nez/awesome-glsl](https://github.com/vanrez-nez/awesome-glsl) (1.4k, MIT)
- [AxiomeCG/awesome-threejs](https://github.com/AxiomeCG/awesome-threejs) (1.0k, CC0)
- [mattdesl/graphics-resources](https://github.com/mattdesl/graphics-resources) (1.9k, MIT)

## 8. GitLab

GitLab has no equivalent scene. Checked through the GitLab API on 2026-11-14:

- The `gsap` topic returns zero projects. Searching project names for "gsap" returns hobby repos with one to three stars.
- The most-starred `webgl` project is [giro3d/giro3d](https://gitlab.com/giro3d/giro3d) with 51 stars. It is a three.js framework for geospatial data, useful only if a project needs 3D maps.
- The `glsl` and `shaders` topics top out at one to three stars, mostly game engine work.

Creative web development publishes on GitHub. Time spent searching GitLab is better spent in the Codrops organisation.

## 9. Working with an agent

1. **Install skills first.** GSAP, three.js and shader skills from section 2, before any build prompt.
2. **Keep references outside the product.** Clone with `git clone --depth 1` into a git-ignored `_refs/` folder. The agent reads them and never imports from them.
3. **One reference effect per prompt.** Name the repo, the file and the outcome. Add your own design tokens. "Rebuild the scroll seam from `_refs/SeamTransitions` in our stack, with our colours and type, and no new dependencies" beats "make it award-winning".
4. **Ask for proof.** Screenshots at 390px and 1440px, an empty console, a `prefers-reduced-motion` path, and a fallback when WebGL is unavailable.
5. **Budget for phones.** Cap device pixel ratio, pause the render loop when the canvas is off screen, and keep JavaScript small. A premium site that stutters on a mid-range Android phone on mobile data is not premium.
