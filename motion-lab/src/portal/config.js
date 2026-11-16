// What the studio desk is told once, and reads everywhere else.
//
// Nothing here is a secret. The keys come from the build (VITE_* below) and the
// server (api/welcome.js); this file only says what the studio is called and
// who may look at the desk before any key is added.

/** The studio's own details, printed at the head of every invoice. */
export const STUDIO = {
  name: 'Altraware Technology',
  short: 'Altraware',
  line: 'Rooted at home. Engineered for the world.',
  address: ['Dar es Salaam, Tanzania', '6.7924° S, 39.2083° E'],
  phone: '+255 790 942 616',
  email: 'altrawaretechnology@gmail.com',
  registration: 'BRELA registered · PDPA No. 11 of 2022',
  tin: 'TIN 145-892-733',
  bank: { name: 'CRDB Bank', account: '0150 4472 9900', holder: 'Altraware Technology' },
  mobile: { name: 'M-Pesa', number: '+255 790 942 616', holder: 'Altraware Technology' },
  terms: 'Payment due within 14 days of the issue date. Work begins on the first instalment; later instalments follow the milestones in the project brief.',
  vat: 0.18,
};

/** The stages a project moves through. The order is the pipeline's order. */
export const STAGES = [
  { key: 'discovery', name: 'Discovery' },
  { key: 'design', name: 'Design' },
  { key: 'build', name: 'Build' },
  { key: 'launch', name: 'Launch' },
  { key: 'care', name: 'Care' },
];

/**
 * The demo desk, and the way in while no key is added.
 *
 * The user asked to see the admin on the build before wiring Firebase, so the
 * gate says the passwords out loud. They are checked in the browser and open
 * nothing but this device's own copy of the demo desk. The moment a Firebase
 * config is in the build (see VITE_FIREBASE_* below), the Google button becomes
 * the real door and these two are labelled a preview.
 */
export const PREVIEW = {
  admin: { username: 'admin', password: 'altra2026', name: 'Davie Mwijage', email: 'davidbyanmwijage@gmail.com', label: 'Studio admin' },
  client: { username: 'client', password: 'client2026', label: 'Client (Shule Direct)' },
  clientId: 'c-shule',
};

/**
 * Keys, read at build time. Vercel passes VITE_* to `npm run build`.
 *
 *   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
 *   VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_SENDER_ID, VITE_FIREBASE_APP_ID
 *   VITE_ADMIN_EMAILS   the accounts that see the whole studio, comma separated
 *
 * Anything missing simply leaves Studio OS on the demo desk; it never throws.
 */
export function firebaseConfig() {
  const env = import.meta.env ?? {};
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  const ready = Boolean(config.apiKey && config.authDomain && config.projectId);
  return ready ? config : null;
}

/** Is a Firebase config in this build? */
export const configured = () => Boolean(firebaseConfig());

/** The addresses that may see every client. No config, no one. */
export function adminEmails() {
  const raw = (import.meta.env?.VITE_ADMIN_EMAILS ?? '').trim();
  return raw ? raw.split(',').map((one) => one.trim().toLowerCase()).filter(Boolean) : [];
}

/** Where the welcome mail is sent from. Only the server route knows the keys. */
export const MAIL_ENDPOINT = '/api/welcome';

/** How long a signed-in desk lasts, and how long it may sit idle. */
export const SESSION = { longest: 8 * 60 * 60 * 1000, idle: 30 * 60 * 1000 };

/** Storage keys. One prefix, so nothing collides with the site or the admin. */
export const KEYS = {
  desk: 'altra-studio:desk',
  session: 'altra-studio:session',
  draft: 'altra-studio:draft',
};
