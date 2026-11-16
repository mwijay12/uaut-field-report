// Two doors, one desk.
//
//   1. A password, checked here in the browser. It is a preview: it opens the
//      demo desk on this device and nothing else. It is what the studio asked
//      for first, so the admin can be looked at on the build before any key.
//
//   2. Google, once a Firebase web config is in the build. That is the real
//      door: Firebase proves who the person is, and the desk reads the studio's
//      records from Firestore under their own account.
//
// The role is decided by the address, never by what the person types:
// VITE_ADMIN_EMAILS sees every client; anyone else is a client, and sees only
// the work and the invoices matched to their own email.

import { KEYS, PREVIEW, SESSION, adminEmails, firebaseConfig } from './config.js';

/** Is Firebase in this build? Decided once, at load. */
export const configured = () => Boolean(firebaseConfig());

// The Firebase SDK is a large download, and the demo desk does not need it.
// It is only fetched the first time someone presses the Google button.
let sdk = null;
let auth = null;

async function loadFirebase() {
  if (sdk) return sdk;
  const config = firebaseConfig();
  if (!config) throw new Error('Firebase is not in this build yet. Add the VITE_FIREBASE_* keys (docs/studio-os.md).');
  const [appModule, authModule] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = appModule.getApps().length ? appModule.getApps()[0] : appModule.initializeApp(config, 'studio-os');
  auth = authModule.getAuth(app);
  await authModule.setPersistence(auth, authModule.browserLocalPersistence).catch(() => {});
  sdk = { ...authModule, app };
  return sdk;
}

/** A message a person can act on, rather than the SDK's own words. */
function explain(error) {
  const code = error?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'The Google window was closed before it finished.';
  if (code === 'auth/popup-blocked') return 'The browser blocked the Google window. Allow pop-ups for this site and try again.';
  if (code === 'auth/unauthorized-domain') return 'This address is not on Firebase’s allowed list. Add it under Authentication → Settings → Authorized domains.';
  if (code === 'auth/operation-not-allowed') return 'Google is not switched on for this Firebase project. Authentication → Sign-in method → Google.';
  if (code === 'auth/network-request-failed') return 'The network refused the sign-in. Check the connection and try again.';
  return error?.message ?? 'Sign-in did not finish.';
}

/**
 * Google. Returns { who } and leaves nothing behind if it fails.
 * The Firebase user is the source of truth for the name, the address and the
 * photo; the role comes from auth.resolveRole below.
 */
export async function signInWithGoogle() {
  const api = await loadFirebase();
  const provider = new api.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await api.signInWithPopup(auth, provider);
    const person = result.user;
    return {
      who: {
        name: person.displayName || person.email?.split('@')[0] || 'Studio',
        email: (person.email || '').toLowerCase(),
        photo: person.photoURL || '',
        via: 'google',
        uid: person.uid,
      },
    };
  } catch (error) {
    throw new Error(explain(error));
  }
}

/** The address is the only thing that decides what may be seen. */
export function resolveRole(who, clients = []) {
  const email = (who?.email ?? '').toLowerCase();
  const admins = adminEmails();
  if (email && admins.includes(email)) return { role: 'admin', clientId: null };
  const client = clients.find((one) => (one.email ?? '').toLowerCase() === email);
  return { role: 'client', clientId: client?.id ?? null };
}

/** The password door. Returns the person, or throws with what to say. */
export function signInWithPassword(username, password) {
  const name = String(username ?? '').trim().toLowerCase();
  const secret = String(password ?? '');
  if (!name || !secret) throw new Error('Type the username and the password.');
  if (name === PREVIEW.admin.username && secret === PREVIEW.admin.password) {
    return { who: { name: PREVIEW.admin.name, email: PREVIEW.admin.email, via: 'password' }, role: 'admin', clientId: null };
  }
  if (name === PREVIEW.client.username && secret === PREVIEW.client.password) {
    return {
      who: { name: 'Amina Mwakalinga', email: 'hello@shuledirect.co.tz', via: 'password' },
      role: 'client',
      clientId: PREVIEW.clientId,
    };
  }
  throw new Error('That username and password do not match. The preview pair is written above.');
}

// ---------- The session ----------
// sessionStorage: this tab, this visit. It is gone when the tab closes, and it
// expires after eight hours or thirty minutes with nothing touched, whichever
// comes first.

const store = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export function startSession({ who, role, clientId }) {
  const now = Date.now();
  const session = { who, role, clientId: clientId ?? null, at: now, seen: now };
  try {
    store()?.setItem(KEYS.session, JSON.stringify(session));
  } catch {
    // Blocked storage: the desk still works for this page load.
  }
  return session;
}

/** The session, or null when it has run out. A stale one is thrown away. */
export function readSession() {
  let session = null;
  try {
    session = JSON.parse(store()?.getItem(KEYS.session) ?? 'null');
  } catch {
    session = null;
  }
  if (!session?.who) return null;
  const now = Date.now();
  if (now - session.at > SESSION.longest || now - session.seen > SESSION.idle) {
    endSession();
    return null;
  }
  return session;
}

export function touchSession() {
  let session = null;
  try {
    session = JSON.parse(store()?.getItem(KEYS.session) ?? 'null');
  } catch {
    return;
  }
  if (!session?.who) return;
  // Writing on every pointer move would be silly; once every ten seconds is enough.
  if (Date.now() - session.seen < 10_000) return;
  try {
    store()?.setItem(KEYS.session, JSON.stringify({ ...session, seen: Date.now() }));
  } catch {
    // Nothing to do.
  }
}

/**
 * The Firebase ID token, for a route that has to know who is asking.
 * Null when there is no key, or no one is signed in with Google.
 */
export async function idToken(force = false) {
  try {
    if (!configured()) return null;
    await loadFirebase();
    return (await auth?.currentUser?.getIdToken(force)) ?? null;
  } catch {
    return null;
  }
}

/**
 * After a reload the Firebase user is restored from its own storage, which
 * takes a moment. The desk waits for that moment instead of pretending the
 * person is signed out.
 */
export async function restore() {
  try {
    if (!configured()) return null;
    await loadFirebase();
    if (auth.currentUser) return auth.currentUser;
    return await new Promise((resolve) => {
      const stop = setTimeout(() => resolve(null), 3000);
      sdk.onAuthStateChanged(auth, (person) => {
        clearTimeout(stop);
        resolve(person ?? null);
      });
    });
  } catch {
    return null;
  }
}

export function endSession() {
  try {
    store()?.removeItem(KEYS.session);
  } catch {
    // Nothing to remove.
  }
  if (auth && sdk) sdk.signOut(auth).catch(() => {});
}
