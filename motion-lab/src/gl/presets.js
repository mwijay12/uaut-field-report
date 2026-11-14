// Looks for the chart. A section opts in with data-stage="name".
//
// density  contour levels across the height range (more = busier)
// warp     how much the terrain folds on itself
// accent   0..1, share of the high ground drawn in the accent colour
// ink      line strength (keep it low behind long text)
// scale    zoom (lower = broader shapes)
// seedX/Y  where on the chart we are; pages sit far apart so a page
//          transition reads as travelling across the map

export const PRESETS = {
  // Home
  'home-hero': { density: 9, warp: 0.46, accent: 0.2, ink: 1, scale: 1.05, seedX: 0, seedY: 0 },
  'home-statement': { density: 7, warp: 0.3, accent: 0.08, ink: 0.7, scale: 0.85, seedX: 0.35, seedY: -0.3 },
  'home-services': { density: 12, warp: 0.24, accent: 0.14, ink: 0.85, scale: 1.25, seedX: 0.8, seedY: -0.7 },
  'plate-faida': { density: 13, warp: 0.5, accent: 0.34, ink: 1.05, scale: 1.15, seedX: 1.5, seedY: -1.1 },
  'plate-caretrack': { density: 8, warp: 0.28, accent: 0.12, ink: 0.95, scale: 0.8, seedX: 2.3, seedY: -1.2 },
  'plate-uaut': { density: 11, warp: 0.62, accent: 0.22, ink: 1, scale: 1.3, seedX: 3.1, seedY: -1.0 },
  'plate-shule': { density: 15, warp: 0.2, accent: 0.16, ink: 0.9, scale: 1.0, seedX: 3.9, seedY: -1.3 },
  'plate-end': { density: 7, warp: 0.36, accent: 0.28, ink: 0.9, scale: 0.9, seedX: 4.5, seedY: -1.5 },
  'home-route': { density: 10, warp: 0.3, accent: 0.12, ink: 0.8, scale: 1.1, seedX: 5.0, seedY: -2.0 },
  'home-cta': { density: 8, warp: 0.5, accent: 0.3, ink: 1, scale: 0.95, seedX: 5.5, seedY: -2.5 },

  // Work
  'work-hero': { density: 10, warp: 0.4, accent: 0.24, ink: 1, scale: 1.1, seedX: 12, seedY: 3 },
  'work-faida': { density: 13, warp: 0.5, accent: 0.34, ink: 0.95, scale: 1.15, seedX: 12.6, seedY: 2.5 },
  'work-caretrack': { density: 8, warp: 0.28, accent: 0.12, ink: 0.85, scale: 0.8, seedX: 13.3, seedY: 2.0 },
  'work-uaut': { density: 11, warp: 0.62, accent: 0.22, ink: 0.95, scale: 1.3, seedX: 14.0, seedY: 1.5 },
  'work-shule': { density: 15, warp: 0.2, accent: 0.16, ink: 0.8, scale: 1.0, seedX: 14.7, seedY: 1.0 },
  'work-cta': { density: 8, warp: 0.5, accent: 0.3, ink: 1, scale: 0.95, seedX: 15.3, seedY: 0.5 },

  // Contact
  'contact-hero': { density: 9, warp: 0.34, accent: 0.16, ink: 0.9, scale: 1.0, seedX: -9, seedY: 6 },
  'contact-brief': { density: 11, warp: 0.22, accent: 0.1, ink: 0.7, scale: 1.2, seedX: -8.5, seedY: 5.5 },
  'contact-reach': { density: 8, warp: 0.45, accent: 0.26, ink: 1, scale: 0.95, seedX: -8.0, seedY: 5.0 },

  // Shared
  // No seed here: the footer keeps whatever place the page above it had.
  footer: { density: 6, warp: 0.4, accent: 0.2, ink: 0.8, scale: 0.8 },
  lost: { density: 5, warp: 0.7, accent: 0.3, ink: 0.9, scale: 0.7, seedX: -20, seedY: -12 },
};

export const DEFAULT_PRESET = PRESETS['home-hero'];

export function preset(name) {
  return PRESETS[name] ?? DEFAULT_PRESET;
}
