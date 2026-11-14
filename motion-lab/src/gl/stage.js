// The persistent WebGL layer. Raw WebGL 2, one program, one full-screen triangle.
// It lives outside the Barba container, so it keeps running across page changes.
//
// tween.js owns the shader values. Nothing else writes to `state`.

import { Easing, Group, Tween } from '@tweenjs/tween.js';
import fragmentSource from './field.frag.glsl?raw';
import vertexSource from './stage.vert.glsl?raw';
import { DEFAULT_PRESET, preset } from './presets.js';

const UNIFORMS = [
  'uRes', 'uPx', 'uTime', 'uPointer', 'uPress', 'uScroll', 'uDay',
  'uDensity', 'uWarp', 'uAccent', 'uInk', 'uSurge', 'uScale', 'uSeed',
];

// Device pixel ratio is capped: the field is smooth, so extra pixels cost a lot and add little.
const MAX_RATIO_FINE = 1.75;
const MAX_RATIO_COARSE = 1.5;

// If frames run slow, step the drawing buffer down. It never steps back up.
const QUALITY = [1, 0.8, 0.65, 0.5];
const SLOW_FRAME_MS = 25;
const SAMPLE_FRAMES = 45;
const WARM_UP_FRAMES = 30;

// If frames are hopeless even after the page has settled (no usable GPU), stop
// animating and only redraw when something changes.
const HOPELESS_FRAME_MS = 120;
const HOPELESS_SAMPLE = 8;
const HOPELESS_AFTER_MS = 1500;
const STILL_QUALITY = 2;

// The moment shown when the scene is drawn once and left alone.
const STILL_TIME = 42;

function isSoftwareRenderer(gl) {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return /swiftshader|llvmpipe|softpipe|software/i.test(String(renderer));
}

/**
 * Compile and link without freezing the page. Where the browser offers
 * KHR_parallel_shader_compile the result is polled; elsewhere it is read at once.
 */
function build(gl, onReady, onFail) {
  const shader = (type, source) => {
    const object = gl.createShader(type);
    gl.shaderSource(object, source);
    gl.compileShader(object);
    return object;
  };

  const vertex = shader(gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  const finish = () => {
    if (gl.isContextLost()) return;
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      onReady(program);
      return;
    }
    console.warn('WebGL program failed to link.', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment));
    onFail();
  };

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  if (!parallel) {
    finish();
    return;
  }
  const poll = () => {
    if (gl.isContextLost()) return;
    if (gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) finish();
    else requestAnimationFrame(poll);
  };
  poll();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} options
 * @param {boolean} [options.still]  Draw only when something changes: no drift, no pointer, no tweening.
 * @param {'auto'|'live'|'still'} [options.mode]  'auto' falls back to still on software rendering.
 * @param {() => void} [options.onFail]  Called if the shader cannot be built.
 * @returns the stage, or null when WebGL 2 is not available.
 */
export function createStage(canvas, { still = false, mode = 'auto', onFail = () => {} } = {}) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  let quality = 0;
  if (mode === 'still' || (mode === 'auto' && isSoftwareRenderer(gl))) {
    still = true;
    quality = STILL_QUALITY;
  }

  // Everything the shader reads that is animated. Flat numbers so tween.js can drive them.
  const state = { day: 0, surge: 0, ...DEFAULT_PRESET };
  const pointer = { x: 0.7, y: 0.45, targetX: 0.7, targetY: 0.45, press: 0, targetPress: 0 };

  let uniforms = null; // null until the program is ready
  let ratio = 1;
  let cssHeight = 1;
  let dirty = true;
  let shown = false;
  let frames = 0;
  let sampled = 0;
  let sampleTotal = 0;
  let firstDrawAt = 0;
  let judged = mode === 'live'; // forced live: never fall back to still

  const start = () =>
    build(
      gl,
      (program) => {
        gl.useProgram(program);
        uniforms = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]));
        dirty = true;
      },
      () => {
        uniforms = null;
        onFail();
      },
    );
  start();

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const cap = coarse ? MAX_RATIO_COARSE : MAX_RATIO_FINE;
    const scale = Math.min(window.devicePixelRatio || 1, cap) * QUALITY[quality];
    const w = Math.max(2, Math.round(width * scale));
    const h = Math.max(2, Math.round(height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    ratio = w / width;
    cssHeight = height;
    dirty = true;
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  if (!coarse) {
    window.addEventListener('pointermove', (event) => {
      if (still || event.pointerType === 'touch') return;
      pointer.targetX = event.clientX / window.innerWidth;
      pointer.targetY = event.clientY / cssHeight;
      pointer.targetPress = 1;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      pointer.targetPress = 0;
    });
  }

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    uniforms = null;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    start();
    resize();
  });

  // One tween per channel. Starting a new one stops the one before it, so two
  // tweens never fight over the same value.
  const group = new Group();
  const running = new Map();

  function stopChannel(channel) {
    const previous = running.get(channel);
    if (!previous) return;
    previous.stop();
    group.remove(previous);
    running.delete(channel);
  }

  function tween(channel, values, { duration = 1100, easing = Easing.Quartic.InOut } = {}) {
    stopChannel(channel);
    if (still || duration <= 0) {
      Object.assign(state, values);
      dirty = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const next = new Tween(state, group)
        .to(values, duration)
        .easing(easing)
        .onComplete(() => {
          group.remove(next);
          if (running.get(channel) === next) running.delete(channel);
          resolve();
        })
        .onStop(resolve)
        .start();
      running.set(channel, next);
    });
  }

  // Give up on animation: finish every tween where it was heading and hold still.
  function holdStill() {
    still = true;
    quality = Math.max(quality, STILL_QUALITY);
    for (const channel of [...running.keys()]) {
      const active = running.get(channel);
      active.end();
      stopChannel(channel);
    }
    pointer.press = 0;
    resize();
  }

  function draw(seconds) {
    gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uPx, Math.max(1, ratio));
    gl.uniform1f(uniforms.uTime, seconds);
    gl.uniform2f(uniforms.uPointer, pointer.x * canvas.width, (1 - pointer.y) * canvas.height);
    gl.uniform1f(uniforms.uPress, pointer.press);
    gl.uniform1f(uniforms.uScroll, still ? 0 : window.scrollY / Math.max(1, window.innerHeight));
    gl.uniform1f(uniforms.uDay, state.day);
    gl.uniform1f(uniforms.uDensity, state.density);
    gl.uniform1f(uniforms.uWarp, state.warp);
    gl.uniform1f(uniforms.uAccent, state.accent);
    gl.uniform1f(uniforms.uInk, state.ink);
    gl.uniform1f(uniforms.uSurge, state.surge);
    gl.uniform1f(uniforms.uScale, state.scale);
    gl.uniform2f(uniforms.uSeed, state.seedX, state.seedY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // The canvas starts transparent in CSS and fades up once it has a picture.
    if (!shown) {
      shown = true;
      firstDrawAt = performance.now();
      requestAnimationFrame(() => requestAnimationFrame(() => canvas.classList.add('is-live')));
    }
  }

  function measure(delta) {
    if (delta > 1500) return; // the tab was in the background

    // Once, shortly after the page has settled: is this machine able to animate at all?
    if (!judged) {
      if (performance.now() - firstDrawAt < HOPELESS_AFTER_MS) return;
      sampled += 1;
      sampleTotal += delta;
      if (sampled < HOPELESS_SAMPLE) return;
      if (sampleTotal / sampled > HOPELESS_FRAME_MS) holdStill();
      judged = true;
      sampled = 0;
      sampleTotal = 0;
      return;
    }

    frames += 1;
    if (frames < WARM_UP_FRAMES || delta > 100) return;
    sampled += 1;
    sampleTotal += delta;
    if (sampled < SAMPLE_FRAMES) return;
    if (sampleTotal / sampled > SLOW_FRAME_MS && quality < QUALITY.length - 1) {
      quality += 1;
      resize();
    }
    sampled = 0;
    sampleTotal = 0;
  }

  return {
    state,

    /** Call once per frame from the shared ticker. `seconds` is the clock, `delta` the frame time in ms. */
    tick(seconds, delta) {
      if (!uniforms || document.hidden) return;
      group.update();

      if (still) {
        if (dirty) {
          draw(STILL_TIME);
          dirty = false;
        }
        return;
      }

      measure(delta);
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;
      pointer.press += (pointer.targetPress - pointer.press) * 0.05;
      draw(seconds);
    },

    /** Move to a named preset (or a plain object of values). */
    look(nameOrValues, options) {
      const values = typeof nameOrValues === 'string' ? preset(nameOrValues) : nameOrValues;
      return tween('look', values, options);
    },

    /** Night or day palette. */
    theme(isDay, options) {
      return tween('theme', { day: isDay ? 1 : 0 }, { duration: 900, ...options });
    },

    /** 0..1. Raised while one page leaves and the next arrives. */
    surge(value, options) {
      return tween('surge', { surge: value }, options);
    },
  };
}

/** Stand-in used when WebGL 2 is missing, so callers never have to check. */
export function createNullStage() {
  const done = () => Promise.resolve();
  return { state: {}, tick() {}, look: done, theme: done, surge: done };
}

export { Easing };
