// Where a model would go, and why nothing is here yet.
//
// Altra answers from src/lib/chat/knowledge.js, in the browser. That answer
// needs no key, no server and no network, and it is the whole reason the page
// can ship today: the words are ours, and a wrong answer is impossible because
// nothing is generated.
//
// A model provider is a separate decision, and it must be made in one place —
// a route on the main site (POST /api/chat) that holds the provider's key on the
// server, next to the team's other secrets. Then set ENDPOINT below to that
// route's address.
//
// What must never happen, and what this file is written to make hard:
//   - a key in this repository, in a NEXT_PUBLIC_ variable, or in anything the
//     browser downloads. A key in the browser is a key someone else is using by
//     the end of the week.
//   - a request to a provider straight from the page. The address below is a
//     path on our own site, and `sameOrigin()` refuses anything else, so the
//     token the route holds never has to travel.
//   - the chat failing when the model does. Every path here returns null, and
//     the notes answer instead.
//
// Until ENDPOINT is set, `ask()` returns null at once and no request is made at
// all: check:chat counts the requests, and expects none.

export const ENDPOINT = '';
export const MODEL = '';

/** A model call is a luxury, not the answer. It gets this long and no longer. */
const MAX_WAIT = 8000;

const sameOrigin = (url) => {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

/**
 * Asks the model behind ENDPOINT, with the notes as context.
 * @param {{ question: string, lang: 'en'|'sw', history: { role: string, text: string }[], notes: string }} input
 * @returns {Promise<{ text: string } | null>} null whenever the notes should answer
 */
export async function ask({ question, lang, history, notes }) {
  if (!ENDPOINT || !sameOrigin(ENDPOINT)) return null;

  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), MAX_WAIT);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: stop.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, question, lang, history: history.slice(-8), notes }),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    return text ? { text } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
