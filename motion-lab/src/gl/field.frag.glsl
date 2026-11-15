#version 300 es
// The chart: a slow height field drawn as contour lines with a light relief.
// One full-screen pass. Every look on the site is a set of values for the
// uniforms below (see presets.js), tweened by tween.js in stage.js.
precision highp float;

uniform vec2 uRes;      // drawing buffer size in device pixels
uniform float uPx;      // device pixels per CSS pixel
uniform float uTime;    // seconds
uniform vec2 uPointer;  // pointer in device pixels, origin bottom left
uniform float uPress;   // 0..1, how much the pointer lifts the ground
uniform float uScroll;  // scroll position in viewport heights
uniform float uDay;     // 0 night palette, 1 day palette
uniform float uDensity; // contour levels across the height range
uniform float uWarp;    // how much the terrain folds
uniform float uAccent;  // 0..1, share of the high ground drawn in the accent colour
uniform float uInk;     // line strength
uniform float uSurge;   // 0..1, raised during page transitions
uniform float uScale;   // zoom
uniform vec2 uSeed;     // where on the chart we are
uniform float uRush;    // 0..1, how fast the page is scrolling
uniform float uCalm;    // 0 the full chart, 1 the flat page colour

out vec4 fragColor;

// Simplex 3D noise by Ian McEwan and Stefan Gustavson (Ashima Arts).
// https://github.com/stegu/webgl-noise, MIT licence.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Hash without sine by Dave Hoskins, MIT licence. Used for film grain only.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Broad relief plus two finer octaves. Returns roughly -1..1.
float terrain(vec2 p, float t) {
  float n = snoise(vec3(p, t));
  n += 0.5 * snoise(vec3(p * 2.03 + 11.7, t * 1.3));
  n += 0.22 * snoise(vec3(p * 4.01 - 5.3, t * 1.7));
  return n / 1.72;
}

// 1 on a contour line, 0 away from it. `halfWidth` is in device pixels.
float contour(float value, float halfWidth) {
  float distancePx = abs(fract(value - 0.5) - 0.5) / max(fwidth(value), 1e-5);
  return 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, distancePx);
}

// Night: deep navy, soft violet lines, gold on the high ground.
const vec3 NIGHT_LOW = vec3(0.016, 0.035, 0.086);
const vec3 NIGHT_HIGH = vec3(0.043, 0.094, 0.235);
const vec3 NIGHT_LINE = vec3(0.640, 0.610, 0.960);
const vec3 NIGHT_ACCENT = vec3(0.918, 0.702, 0.031);

// Day: paper, navy lines, violet on the high ground.
const vec3 DAY_LOW = vec3(0.933, 0.925, 0.898);
const vec3 DAY_HIGH = vec3(0.984, 0.980, 0.965);
const vec3 DAY_LINE = vec3(0.039, 0.090, 0.208);
const vec3 DAY_ACCENT = vec3(0.486, 0.227, 0.929);

// The page colours themselves (--bg in tokens.css). A plain section shows only these.
const vec3 NIGHT_PLAIN = vec3(0.027, 0.063, 0.133);
const vec3 DAY_PLAIN = vec3(0.969, 0.965, 0.949);

void main() {
  float shortSide = min(uRes.x, uRes.y);
  vec2 screen = (gl_FragCoord.xy - 0.5 * uRes) / shortSide;

  // Zoom about the middle of the screen, then move to our place on the chart.
  // The chart drifts up more slowly than the page, which gives it depth.
  // Fast scrolling pulls the terrain out along the direction of travel.
  vec2 stretched = screen * vec2(1.0 + uRush * 0.10, 1.0 - uRush * 0.30);
  vec2 q = stretched * uScale + uSeed;
  q.y -= uScroll * 0.22;
  float t = uTime * 0.03;

  vec2 fold = vec2(
    snoise(vec3(q * 0.55, t + 3.1)),
    snoise(vec3(q * 0.55 + 7.9, t - 1.4)));
  q += fold * (uWarp + uSurge * 0.5);

  float height = terrain(q, t);

  // The pointer lifts a small hill under it.
  vec2 pointer = (uPointer - 0.5 * uRes) / shortSide;
  float reach = length(screen - pointer);
  float hill = exp(-reach * reach * 7.0) * uPress;
  height += hill * 0.5;

  float levels = uDensity * (1.0 + uSurge * 0.9);
  float value = height * levels;

  // Thin line on every level, a heavier index line on every fifth.
  float crowd = fwidth(value);
  float minor = contour(value, 0.5 * uPx) * (1.0 - smoothstep(0.22, 0.55, crowd));
  float major = contour(value / 5.0, 0.8 * uPx) * (1.0 - smoothstep(0.6, 1.4, crowd));

  float level = smoothstep(-0.85, 0.85, height);

  vec3 ground = mix(mix(NIGHT_LOW, NIGHT_HIGH, level * level), mix(DAY_LOW, DAY_HIGH, level), uDay);

  // Relief: light the slope from the top left.
  vec2 slope = vec2(dFdx(height), dFdy(height)) * shortSide;
  vec3 normal = normalize(vec3(-slope * 0.55, 1.0));
  vec3 light = normalize(vec3(-0.55, 0.62, 0.56));
  float relief = dot(normal, light) - light.z;
  ground += relief * mix(vec3(0.030, 0.040, 0.085), vec3(0.040), uDay);

  float high = smoothstep(1.0 - uAccent - 0.10, 1.0 - uAccent + 0.10, level) * step(0.001, uAccent);
  vec3 ink = mix(mix(NIGHT_LINE, NIGHT_ACCENT, high), mix(DAY_LINE, DAY_ACCENT, high), uDay);

  float minorAlpha = mix(0.20, 0.13, uDay) + high * mix(0.26, 0.20, uDay);
  float majorAlpha = mix(0.26, 0.17, uDay) + high * mix(0.30, 0.22, uDay);
  float alpha = (minor * minorAlpha + major * majorAlpha) * uInk * (1.0 + uSurge * 0.9 + uRush * 0.35);

  vec3 color = mix(ground, ink, clamp(alpha, 0.0, 1.0));

  // A little light where the pointer is, at night only.
  color += NIGHT_LINE * hill * 0.05 * (1.0 - uDay);

  // Vignette, strong at night and barely there by day.
  float vignette = smoothstep(1.25, 0.2, length(screen * vec2(0.85, 1.0)));
  color *= mix(mix(0.62, 0.955, uDay), 1.0, vignette);

  // Grain hides banding in the dark gradients.
  float grain = hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5;
  color += grain * mix(0.030, 0.018, uDay);

  // Calm takes all of the above away: at 1 the screen is the flat page colour.
  color = mix(color, mix(NIGHT_PLAIN, DAY_PLAIN, uDay), uCalm);

  fragColor = vec4(color, 1.0);
}
