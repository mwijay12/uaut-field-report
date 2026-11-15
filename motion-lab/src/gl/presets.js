// Looks for the chart. A section opts in with data-stage="name".
//
// density  contour levels across the height range (more = busier)
// warp     how much the terrain folds on itself
// accent   0..1, share of the high ground drawn in the accent colour
// ink      line strength. Keep it at 0.6 or lower behind long text that has
//          no glass panel under it.
// scale    zoom (lower = broader shapes)
// seedX/Y  where on the chart we are; pages sit far apart so a page
//          transition reads as travelling across the map

export const PRESETS = {
  // Home
  'home-hero': { density: 9, warp: 0.46, accent: 0.2, ink: 1, scale: 1.05, seedX: 0, seedY: 0 },
  'home-statement': { density: 7, warp: 0.3, accent: 0.08, ink: 0.6, scale: 0.85, seedX: 0.35, seedY: -0.3 },
  'home-figures': { density: 6, warp: 0.5, accent: 0.26, ink: 0.7, scale: 0.75, seedX: 0.6, seedY: -0.5 },
  'home-services': { density: 12, warp: 0.24, accent: 0.14, ink: 0.7, scale: 1.25, seedX: 0.8, seedY: -0.7 },
  'plate-faida': { density: 13, warp: 0.5, accent: 0.34, ink: 0.95, scale: 1.15, seedX: 1.5, seedY: -1.1 },
  'plate-uaut': { density: 8, warp: 0.28, accent: 0.12, ink: 0.9, scale: 0.8, seedX: 2.2, seedY: -1.2 },
  'plate-aymi': { density: 11, warp: 0.62, accent: 0.22, ink: 0.95, scale: 1.3, seedX: 2.9, seedY: -1.0 },
  'plate-volta': { density: 15, warp: 0.2, accent: 0.16, ink: 0.85, scale: 1.0, seedX: 3.6, seedY: -1.3 },
  'plate-bongo': { density: 9, warp: 0.44, accent: 0.3, ink: 0.9, scale: 0.9, seedX: 4.3, seedY: -1.1 },
  'plate-audenic': { density: 12, warp: 0.34, accent: 0.1, ink: 0.9, scale: 1.2, seedX: 5.0, seedY: -1.4 },
  'plate-end': { density: 7, warp: 0.36, accent: 0.28, ink: 0.9, scale: 0.9, seedX: 5.6, seedY: -1.6 },
  'home-route': { density: 10, warp: 0.3, accent: 0.12, ink: 0.7, scale: 1.1, seedX: 6.1, seedY: -2.1 },
  'home-cta': { density: 8, warp: 0.5, accent: 0.3, ink: 1, scale: 0.95, seedX: 6.6, seedY: -2.6 },

  // Work
  'work-hero': { density: 10, warp: 0.4, accent: 0.24, ink: 1, scale: 1.1, seedX: 12, seedY: 3 },
  'work-faida': { density: 13, warp: 0.5, accent: 0.34, ink: 0.85, scale: 1.15, seedX: 12.6, seedY: 2.5 },
  'work-caretrack': { density: 8, warp: 0.28, accent: 0.12, ink: 0.7, scale: 0.8, seedX: 13.3, seedY: 2.0 },
  'work-uaut': { density: 11, warp: 0.62, accent: 0.22, ink: 0.85, scale: 1.3, seedX: 14.0, seedY: 1.5 },
  'work-shule': { density: 15, warp: 0.2, accent: 0.16, ink: 0.65, scale: 1.0, seedX: 14.7, seedY: 1.0 },
  'work-more': { density: 9, warp: 0.38, accent: 0.2, ink: 0.75, scale: 0.9, seedX: 15.4, seedY: 0.4 },
  'work-cta': { density: 8, warp: 0.5, accent: 0.3, ink: 1, scale: 0.95, seedX: 16.0, seedY: -0.1 },

  // Services
  'services-hero': { density: 11, warp: 0.52, accent: 0.18, ink: 1, scale: 1.2, seedX: -14, seedY: -7 },
  'services-list': { density: 8, warp: 0.26, accent: 0.1, ink: 0.55, scale: 0.85, seedX: -13.4, seedY: -7.5 },
  'services-serve': { density: 10, warp: 0.44, accent: 0.28, ink: 0.85, scale: 1.0, seedX: -12.8, seedY: -8.0 },
  'services-process': { density: 12, warp: 0.22, accent: 0.12, ink: 0.55, scale: 1.2, seedX: -12.2, seedY: -8.5 },
  'services-cta': { density: 8, warp: 0.5, accent: 0.3, ink: 1, scale: 0.95, seedX: -11.6, seedY: -9.0 },

  // Pricing
  'pricing-hero': { density: 9, warp: 0.3, accent: 0.16, ink: 0.9, scale: 1.0, seedX: 7, seedY: 14 },
  'pricing-packages': { density: 11, warp: 0.22, accent: 0.1, ink: 0.55, scale: 1.2, seedX: 7.5, seedY: 13.5 },
  'pricing-estimator': { density: 8, warp: 0.46, accent: 0.26, ink: 0.7, scale: 0.9, seedX: 8.1, seedY: 13.0 },
  'pricing-support': { density: 12, warp: 0.26, accent: 0.12, ink: 0.55, scale: 1.15, seedX: 8.7, seedY: 12.5 },
  'pricing-faq': { density: 7, warp: 0.4, accent: 0.2, ink: 0.6, scale: 0.85, seedX: 9.3, seedY: 12.0 },
  'pricing-cta': { density: 8, warp: 0.5, accent: 0.3, ink: 1, scale: 0.95, seedX: 9.9, seedY: 11.5 },

  // Studio
  'studio-hero': { density: 8, warp: 0.56, accent: 0.24, ink: 1, scale: 0.95, seedX: -4, seedY: 18 },
  'studio-story': { density: 7, warp: 0.3, accent: 0.1, ink: 0.6, scale: 0.8, seedX: -3.5, seedY: 17.5 },
  'studio-people': { density: 11, warp: 0.24, accent: 0.12, ink: 0.55, scale: 1.15, seedX: -2.9, seedY: 17.0 },
  'studio-values': { density: 9, warp: 0.44, accent: 0.26, ink: 0.7, scale: 0.9, seedX: -2.3, seedY: 16.5 },
  'studio-paper': { density: 13, warp: 0.18, accent: 0.08, ink: 0.5, scale: 1.25, seedX: -2.0, seedY: 16.2 },
  'studio-cta': { density: 8, warp: 0.5, accent: 0.3, ink: 1, scale: 0.95, seedX: -1.7, seedY: 16.0 },

  // Contact
  'contact-hero': { density: 9, warp: 0.34, accent: 0.16, ink: 0.9, scale: 1.0, seedX: -9, seedY: 6 },
  'contact-brief': { density: 11, warp: 0.22, accent: 0.1, ink: 0.55, scale: 1.2, seedX: -8.5, seedY: 5.5 },
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
