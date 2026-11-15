// Saves a brief in the inbox of Altraware's main site, beside the WhatsApp
// message. That inbox is a Firestore collection called "inquiries". Its rules
// let anyone add a record and let only the team read, change or delete one, so
// the project ID is all this needs, and it is not a secret.
//
// The record has the shape the main site's own contact form writes
// (src/lib/leads.ts there), so it shows up in its "Leads & Inquiries" list
// like any other. That list calls .toLowerCase() on name, phone, type and
// message, so those four are always strings here.
//
// Off until content/site.json has leads.projectId (the admin's Leads page).

const endpoint = (projectId, id) =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/inquiries?documentId=${encodeURIComponent(id)}`;

// Longest text kept per field. Nobody types this much; it only stops a paste of a whole document.
const LIMITS = { name: 120, org: 160, phone: 40, type: 60, message: 4000, budget: 80, timeline: 80, notes: 300 };

/** #ALT-4821. The visitor quotes it on WhatsApp and the team finds the record by it. */
export const newRef = () => `#ALT-${Math.floor(1000 + Math.random() * 9000)}`;

/**
 * @param {{ name: string, phone: string, message: string, type?: string, org?: string,
 *           budget?: string, timeline?: string, notes?: string, refCode?: string }} input
 * @param {Date} [now]
 */
export function leadRecord(input, now = new Date()) {
  const text = (key) => String(input[key] ?? '').trim().slice(0, LIMITS[key]);
  const record = {
    // The main site names records inq-<milliseconds>. Two more digits keep two
    // briefs sent in the same millisecond apart.
    id: `inq-${now.getTime()}${Math.floor(10 + Math.random() * 90)}`,
    refCode: input.refCode || newRef(),
    name: text('name'),
    phone: text('phone'),
    type: text('type') || 'Consultation',
    message: text('message'),
    status: 'new',
    createdAt: now.toISOString(),
    source: 'altra-motion-lab',
  };
  for (const key of ['org', 'budget', 'timeline', 'notes']) {
    const value = text(key);
    if (value) record[key] = value;
  }
  return record;
}

/** The body Firestore's REST API expects: every value wrapped with its type. */
export const toDocument = (record) => ({
  fields: Object.fromEntries(Object.entries(record).map(([key, value]) => [key, { stringValue: String(value) }])),
});

/**
 * Adds the record. Never throws: the WhatsApp message is what must not fail,
 * and it does not depend on this.
 * @returns {Promise<{ ok: boolean, status: number, reason?: string, message?: string }>}
 */
export async function saveLead(projectId, record, { keepalive = false } = {}) {
  try {
    const response = await fetch(endpoint(projectId, record.id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toDocument(record)),
      // keepalive lets the request finish if the browser hands over to WhatsApp straight away.
      keepalive,
    });
    if (response.ok) return { ok: true, status: response.status };
    const detail = await response.json().catch(() => null);
    return {
      ok: false,
      status: response.status,
      reason: detail?.error?.status ?? '',
      message: detail?.error?.message ?? response.statusText,
    };
  } catch (error) {
    return { ok: false, status: 0, reason: 'NETWORK', message: error.message };
  }
}

/** What went wrong, in words a person can act on. For the admin's test button. */
export function explain(result) {
  if (result.ok) return 'Saved.';
  if (result.reason === 'NETWORK') return 'The request did not reach Google. Check the connection and try again.';
  if (result.status === 404 || result.reason === 'NOT_FOUND') return 'Google has no Firestore database under that project ID. Check the ID in the Firebase console, under Project settings.';
  if (result.status === 403 || result.reason === 'PERMISSION_DENIED') return 'The project exists, but its rules refused the record. The "inquiries" collection must allow create.';
  if (result.status === 409 || result.reason === 'ALREADY_EXISTS') return 'A record with that ID already exists. Try again.';
  if (result.status === 429) return 'Google is rate-limiting this project. Try again in a minute.';
  return `Google answered ${result.status}: ${result.message}`;
}
