import 'server-only';

import { getApps, initializeApp, applicationDefault, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Admin SDK singleton for server-side reads.
 *
 * The public blog reads Firestore on the server rather than from the browser.
 * That is what lets logged-out readers and search-engine crawlers see published
 * posts without opening Firestore to unauthenticated access: no rule has to be
 * relaxed, because the browser never talks to Firestore for post content.
 *
 * The trade-off is that Admin SDK reads BYPASS security rules entirely, so this
 * surface must enforce the paywall itself. That happens in one place only, in
 * `blog-data.ts`, via `resolvePostAccess()` from `@wolly/schema`, the same
 * function the Firestore rules mirror for the Flutter reader.
 *
 * Credentials: on Cloud Run the metadata server supplies them via
 * `applicationDefault()`. Locally, set GOOGLE_APPLICATION_CREDENTIALS to a
 * service-account path, or FIREBASE_SERVICE_ACCOUNT to the JSON itself.
 */
/** The shared Admin app. Initialised once per server instance. */
export function adminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'wolly-1133d';
  const inlineCredentials = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (inlineCredentials) {
    return initializeApp({
      credential: cert(JSON.parse(inlineCredentials)),
      projectId,
    });
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

let cached: Firestore | undefined;

export function adminDb(): Firestore {
  if (!cached) {
    cached = getFirestore(adminApp());
    // Treat `undefined` as "field absent" rather than throwing, matching how
    // the client SDK behaves in the other apps.
    cached.settings({ ignoreUndefinedProperties: true });
  }
  return cached;
}
