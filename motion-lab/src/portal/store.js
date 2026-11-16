// Where the desk keeps its records.
//
//   demo    localStorage on this device. It is what the preview uses, and it
//           needs no key at all.
//   cloud   Firestore, once VITE_FIREBASE_* is in the build and someone has
//           signed in with Google. One collection each for clients, projects
//           and invoices, one document per record, and the rules in
//           docs/studio-os.md decide who may read which.
//
// A client is not trusted with the whole studio. Their address is looked up in
// `members/{email}`, which holds one field — the id of the client record they
// belong to — and every read after that is narrowed to that client. A studio
// admin reads the collections whole.
//
// The rest of the desk does not care which one it is talking to: it is handed
// the same three lists and the same save() either way.

import { KEYS, firebaseConfig } from './config.js';
import { demoDesk } from './data.js';

const KINDS = ['clients', 'projects', 'invoices'];

// A record is plain JSON before it is stored, so nothing in a Firestore
// document can be a Date, a function or a class instance.
const plain = (value) => JSON.parse(JSON.stringify(value));

function readLocal() {
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEYS.desk) ?? 'null');
    if (kept?.clients && kept?.projects && kept?.invoices) return kept;
  } catch {
    // Unreadable or blocked: start from the demo desk.
  }
  return null;
}

function writeLocal(state) {
  try {
    window.localStorage.setItem(KEYS.desk, JSON.stringify(state));
  } catch {
    // A full or blocked store. The desk keeps working until the page reloads.
  }
}

/** The desk on this device. Synchronous, so the first screen has data at once. */
function openLocal(notify) {
  const state = readLocal() ?? demoDesk();
  let timer = 0;
  const later = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => notify?.(), 0);
  };

  return {
    mode: 'demo',
    state,
    save(kind, item) {
      if (!KINDS.includes(kind)) throw new Error(`There is no ${kind} in the desk.`);
      const list = state[kind];
      const at = list.findIndex((one) => one.id === item.id);
      const record = plain(item);
      if (at === -1) list.unshift(record);
      else list[at] = record;
      writeLocal(state);
      later();
      return record;
    },
    remove(kind, id) {
      state[kind] = state[kind].filter((one) => one.id !== id);
      writeLocal(state);
      later();
    },
    reset() {
      const fresh = demoDesk();
      state.clients = fresh.clients;
      state.projects = fresh.projects;
      state.invoices = fresh.invoices;
      writeLocal(state);
      notify?.();
    },
    seed() {
      const fresh = demoDesk();
      state.clients = fresh.clients;
      state.projects = fresh.projects;
      state.invoices = fresh.invoices;
      writeLocal(state);
      notify?.();
    },
  };
}

/** The desk in Firestore, narrowed to the account that is signed in. */
async function openCloud(session, notify) {
  const config = firebaseConfig();
  const { getApps, initializeApp } = await import('firebase/app');
  const { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, query, where } = await import('firebase/firestore');

  const app = getApps().length ? getApps()[0] : initializeApp(config, 'studio-os');
  const db = getFirestore(app);
  const email = (session?.who?.email ?? '').toLowerCase();
  const isStudio = session?.role === 'admin';

  // Which client record belongs to this address. Kept in one small document so
  // the rules can hand a client their own work and nothing else.
  let clientId = session?.clientId ?? null;
  if (!isStudio && !clientId && email) {
    try {
      const member = await getDoc(doc(db, 'members', email));
      if (member.exists()) clientId = member.data().clientId ?? null;
    } catch {
      // No members document: the client sees an empty desk and the studio adds it.
    }
    if (session) session.clientId = clientId;
  }
  const narrowed = !isStudio && clientId;

  const state = { clients: [], projects: [], invoices: [], meta: { version: 1, cloud: true } };

  /** The query for a collection, as this person is allowed to read it. */
  const source = (kind) => {
    const base = collection(db, kind);
    if (!narrowed) return base;
    if (kind === 'clients') return 'single';
    return query(base, where('clientId', '==', clientId));
  };

  const load = async (kind) => {
    const from = source(kind);
    if (from === 'single') {
      const one = await getDoc(doc(db, 'clients', clientId));
      return one.exists() ? [{ ...one.data(), id: one.id }] : [];
    }
    const snapshot = await getDocs(from);
    return snapshot.docs.map((one) => ({ ...one.data(), id: one.id }));
  };

  for (const kind of KINDS) state[kind] = await load(kind);

  // Someone else editing: the studio adds a job while a client is looking, or
  // a client's invoice is marked paid in another window.
  for (const kind of KINDS) {
    const from = source(kind);
    if (from === 'single') continue;
    onSnapshot(
      from,
      (snapshot) => {
        state[kind] = snapshot.docs.map((one) => ({ ...one.data(), id: one.id }));
        notify?.();
      },
      // A refusal here must not empty a screen that already has records.
      () => {},
    );
  }

  return {
    mode: 'cloud',
    state,
    clientId,
    async save(kind, item) {
      if (!KINDS.includes(kind)) throw new Error(`There is no ${kind} in the desk.`);
      if (narrowed) throw new Error('That is the studio’s to change. You can read it here.');
      const record = plain(item);
      await setDoc(doc(db, kind, record.id), record, { merge: true });
      const at = state[kind].findIndex((one) => one.id === record.id);
      if (at === -1) state[kind].unshift(record);
      else state[kind][at] = record;
      notify?.();
      return record;
    },
    async remove(kind, id) {
      if (narrowed) throw new Error('That is the studio’s to change.');
      await deleteDoc(doc(db, kind, id));
      state[kind] = state[kind].filter((one) => one.id !== id);
      notify?.();
    },
    reset() {
      throw new Error('The shared desk is not reset from the browser.');
    },
    /** The studio's first hour: put the four preview records into Firestore. */
    async seed() {
      if (narrowed) throw new Error('Only the studio can fill the desk.');
      const fresh = demoDesk();
      for (const kind of KINDS) {
        for (const one of fresh[kind]) await setDoc(doc(db, kind, one.id), plain(one), { merge: true });
        state[kind] = fresh[kind].map(plain);
      }
      notify?.();
    },
  };
}

/**
 * Opens the desk: the cloud one when Firebase is in the build, the local one
 * otherwise. `notify` is called whenever a record changed.
 */
export async function openDesk(session, notify) {
  try {
    if (firebaseConfig()) return await openCloud(session, notify);
  } catch (error) {
    // A refused read (rules, or a project with no Firestore yet) must not leave
    // a blank screen: the desk opens on the preview records and says so.
    return { ...openLocal(notify), refused: error?.code ?? error?.message ?? 'cloud refused' };
  }
  return { ...openLocal(notify), clientId: session?.clientId ?? null };
}
