// Every page of the site, in menu order.
//
// The order matters: going to a later page the curtain rises, going to an
// earlier one it falls. `word` is the Swahili name shown on the curtain.

export const ROUTES = [
  { name: 'home', path: '/', word: 'Nyumbani', label: 'Home' },
  { name: 'work', path: '/work/', word: 'Kazi', label: 'Work' },
  { name: 'services', path: '/services/', word: 'Huduma', label: 'Services' },
  { name: 'pricing', path: '/pricing/', word: 'Bei', label: 'Pricing' },
  { name: 'studio', path: '/studio/', word: 'Sisi', label: 'Studio' },
  { name: 'contact', path: '/contact/', word: 'Tuongee', label: 'Start a project' },
];

/** The route a path belongs to. Anything unknown counts as home. */
export function routeOf(path) {
  const wanted = path.endsWith('/') ? path : `${path}/`;
  return ROUTES.find((route) => route.path !== '/' && wanted.startsWith(route.path)) ?? ROUTES[0];
}
