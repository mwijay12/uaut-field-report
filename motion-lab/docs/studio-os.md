# Studio OS — the desk, the portal, the invoice and the mail

Studio OS is the small application at `/portal/`. It is one page with two
audiences:

- **the studio** — every client, every job, every invoice, and the mail;
- **a client** — their own job, its stages, and their own invoices, and nothing
  else.

It is deliberately apart from `/admin/`. The admin edits the *site* (prices,
phone lines, backgrounds) and signs in with a fine-grained GitHub token, and it
still does. Studio OS is about the *work*: who it is for, where it has got to,
what it costs, and what has been sent.

## 1. What works before any key is added

The build ships with a **preview desk**: four clients, four jobs and four
invoices in the browser's own storage, and a password gate that says its own
passwords on the screen.

| who | username | password | sees |
| --- | --- | --- | --- |
| studio | `admin` | `altra2026` | everything |
| client | `client` | `client2026` | Shule Direct's job and invoice |

The password is a **preview**. It is checked in the browser, it opens only that
device's copy of the demo records, and it is not a security boundary. It exists
so the desk can be looked at — and shown — before Firebase is wired.

The Google button is on the gate from the first build and stays switched off
until a Firebase web config is in the build (step 3 below). Nothing else has to
change when the keys arrive: the same button becomes the real door.

## 2. Why the address on Vercel can be a build behind

Vercel builds the `motion-lab` project from the `main` branch, from the
`motion-lab/` folder, and publishes `dist/`. Every push to `main` should become a
new production build.

It does not always happen, for a reason that has nothing to do with the code:

- The free plan allows a **fixed number of deployments a day**. When it is used
  up, Vercel accepts the push and **skips the build**, silently. The address
  then keeps serving the last deployment that did build.
- `vercel.json` also sets `createDeployments: disabled` for this project, so
  there is no GitHub Deployment object to look at when a build is skipped; only
  the Vercel dashboard shows it.

So: if `altra-motion-lab.vercel.app` shows an older site than `main`, open
Vercel → the project → **Deployments** and look at the top production row. If
its commit is not the newest on `main`, press **Redeploy** on that row (or wait
for the quota to reset) — pushing the same commit again will not always help.
`https://vercel.com/<account>/altra-motion-lab/deployments` is the page.

## 3. Firebase: Google sign-in, and where the records live

Console: <https://console.firebase.google.com>

1. **Create the project** (or pick the one already used for this studio) and add
   a **Web app**. Copy the config it shows; it is exactly the six values below.
2. **Authentication → Sign-in method → Google → Enable.** Choose a support
   address. Then **Authentication → Settings → Authorized domains** and add
   `altra-motion-lab.vercel.app` (and `localhost` for local work). Without this,
   Google answers `auth/unauthorized-domain`.
3. **Firestore Database → Create database → Production mode**, region
   `europe-west1` (closest to Dar es Salaam that is not in a queue).
4. **Vercel → the project → Settings → Environment Variables.** Add these for
   *Production* and *Preview*, then redeploy:

   | key | value |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `VITE_FIREBASE_SENDER_ID` | `messagingSenderId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |
   | `VITE_ADMIN_EMAILS` | your address(es), comma separated — these see every client |
   | `FIREBASE_API_KEY` | the same `apiKey`, for the mail route to check a sign-in (server only) |
   | `ADMIN_EMAILS` | the same list, for the mail route (server only) |

   Only the `VITE_*` ones reach the browser, and that is by design: a Firebase
   web key is public, and the rules below are what protect the records.
5. **Drop the rules in** (next section): Firestore → Rules → paste → Publish.
6. Open `/portal/`, press **Continue with Google**. The first studio address
   lands on an empty desk; **Settings → Fill the empty desk with the preview
   records** puts the four example clients and invoices in Firestore so there is
   something to look at. Delete them when the real ones start arriving.
7. **Give a client their door.** Their client record must carry the address they
   sign in with (`clients/<id>.email`), and one more document tells Firestore
   which client that address belongs to:

   ```json
   // collection: members   document id: hello@shuledirect.co.tz
   { "clientId": "c-shule" }
   ```

   That is the whole of it: `members/{email}.clientId` → the client record →
   their projects and invoices.

### Collections

| collection | one document holds |
| --- | --- |
| `clients` | `name, trade, contact, email, phone, address, since, note, logo` |
| `projects` | `clientId, name, stage, progress, value, started, due, brief, tasks[], activity[]` |
| `invoices` | `number, clientId, projectId, issued, due, status, taxRate, discount, reference, items[], notes` |
| `members` | `clientId` — keyed by the client's email address |

`stage` is one of `discovery`, `design`, `build`, `launch`, `care`.
`status` is `draft`, `sent` or `paid`; **overdue is never stored** — it is worked
out from the due date every morning, so a record never goes stale.

### Firestore rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function studio() {
      return request.auth != null
        && request.auth.token.email in [
          'davidbyanmwijage@gmail.com'
        ];
    }

    // The email in `members/{email}` is the key, so a client can read exactly
    // one of these documents: their own.
    function myClientId() {
      return get(/databases/$(database)/documents/members/$(request.auth.token.email)).data.clientId;
    }

    match /members/{email} {
      allow read: if studio() || request.auth.token.email == email;
      allow write: if studio();
    }

    match /clients/{id} {
      allow read: if studio() || (request.auth != null
        && resource.data.email == request.auth.token.email);
      allow write: if studio();
    }

    match /projects/{id} {
      allow read: if studio() || (request.auth != null
        && resource.data.clientId == myClientId());
      allow write: if studio();
    }

    match /invoices/{id} {
      allow read: if studio() || (request.auth != null
        && resource.data.clientId == myClientId());
      allow write: if studio();
    }
  }
}
```

Two things worth knowing about these rules:

- A client's reads are **queries narrowed to their own id**
  (`where('clientId', '==', …)`), because Firestore rules are not filters: an
  unfiltered read of a collection a client may only partly see is refused
  outright. `src/portal/store.js` builds the query, not the screen.
- `myClientId()` is a document read inside a rule. It is billed as one, which is
  the honest price of letting an email address decide what may be read.

## 4. The mail

`api/welcome.js` is a Vercel function. The letter itself is
`src/lib/mail/template.js`, which both the route and the desk import — so the
preview on the Mail screen is byte for byte what is sent.

Two letters: **welcome** (the first one a client gets) and **invoice** (the
figure, the words, and the way to pay).

| key | what it is |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com`, `smtp.zoho.com`, `smtp.resend.com`… |
| `SMTP_PORT` | `465` (secure) or `587` (STARTTLS) |
| `SMTP_SECURE` | `true` on 465 |
| `SMTP_USER` | the mailbox |
| `SMTP_PASS` | an **app password**, not the account password |
| `SMTP_FROM` | `Altraware Technology <altrawaretechnology@gmail.com>` |
| `SITE_ORIGIN` | `https://altra-motion-lab.vercel.app` |
| `ADMIN_EMAILS` | who may send, comma separated |
| `PORTAL_MAIL_SECRET` | optional, for a script to send without a person |

Who may send: a signed-in studio admin (a Firebase ID token, checked against
`FIREBASE_API_KEY`, whose address is in `ADMIN_EMAILS`), or a caller holding
`PORTAL_MAIL_SECRET`. A missing key answers `503` and names the key it wants, so
the desk can say what to add instead of "something went wrong".

**Gmail** will not take the account password. Turn on 2-Step Verification, then
create an **App password** (Google Account → Security → App passwords) and use
that as `SMTP_PASS`. Zoho and Resend work the same way with their own app
passwords.

## 5. The invoice, and the PDF

The paper on the Invoices screen is a real A4 page — 210 × 297 mm, written in
millimetres, printed by the browser itself:

1. Open an invoice, fill it in on the left; the page on the right follows.
2. **Save as PDF** opens the print dialog. Choose **Save as PDF**, paper **A4**,
   margins **None** (the page carries its own), and **Background graphics** on.
   The brand colours are printed and the file is named after the client.

Every invoice carries: the studio's mark and details, **the client's own logo**,
the lines with quantity and unit, subtotal, discount, **VAT 18%**, the total, and
**the total written out in words** — which is what makes it hard to alter, and
easy to read down a phone line.

**The client logo** is chosen on the Clients screen (or in the client drawer):
PNG, JPG or SVG, up to 6 MB. It is shrunk to 560 px, kept with the client record,
and appears on every invoice after that. For a logo that has to stay sharp in
print at large sizes, upload it to Cloudinary and paste the delivered URL into
`clients/<id>.logo` instead — the page accepts either a data URL or an https URL.

Why the browser's print and not a PDF library: a PDF library adds a megabyte and
its own idea of typography, and its output is only as good as the font it embeds.
The print dialog uses the page as it is drawn, with the studio's own type, and
every machine already has it.

## 6. Keys, in one table

| key | where | what it turns on |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Vercel (build) | Google sign-in, Firestore |
| `VITE_FIREBASE_AUTH_DOMAIN` | Vercel (build) | the same project |
| `VITE_FIREBASE_PROJECT_ID` | Vercel (build) | the same project |
| `VITE_FIREBASE_STORAGE_BUCKET` | Vercel (build) | the same project |
| `VITE_FIREBASE_SENDER_ID` | Vercel (build) | the same project |
| `VITE_FIREBASE_APP_ID` | Vercel (build) | the same project |
| `VITE_ADMIN_EMAILS` | Vercel (build) | who sees every client |
| `FIREBASE_API_KEY` | Vercel (server) | checking a sign-in on the mail route |
| `ADMIN_EMAILS` | Vercel (server) | who may send mail |
| `SMTP_*`, `SMTP_FROM` | Vercel (server) | the mailbox |
| `SITE_ORIGIN` | Vercel (server) | the links inside the letters |
| `PORTAL_MAIL_SECRET` | Vercel (server) | sending from a script |

## 7. Checking it

```sh
cd motion-lab
npm i --no-save puppeteer-core @sparticuz/chromium
npm run build && npm run preview &
npm run check:portal          # 23 steps: the gate, the desk, an invoice, the mail, a client
npm run check:portal -- --shots   # and a picture of each screen in ./shots
```

The walk is the one a person takes: a wrong password, the right one, a project,
a milestone ticked, a client's logo, an invoice, a quantity changed, the print
media, the two letters, the settings, the way out — and then the same desk as a
client, who must see one invoice and no way to edit it. It fails on a console
error, a failed request or a step that did not happen.
