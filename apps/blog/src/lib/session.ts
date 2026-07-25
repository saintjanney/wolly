import 'server-only';

import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';

import { adminApp } from './firebase-admin';

/**
 * The session cookie name.
 *
 * MUST be `__session`. Firebase Hosting strips every cookie except this one
 * before forwarding a request to the backend, so any other name simply never
 * arrives and the reader looks permanently logged out.
 */
export const SESSION_COOKIE = '__session';

/** Two weeks, the maximum Firebase allows for a session cookie. */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * The viewing user's uid, or null for a logged-out reader.
 *
 * `verifySessionCookie(cookie, true)` checks revocation as well as the
 * signature, so signing out or disabling an account takes effect immediately
 * rather than at expiry.
 *
 * Any failure returns null. That under-grants rather than over-grants: a reader
 * with a broken cookie sees the paywall instead of accidentally seeing paid
 * content.
 */
export async function getViewerUserId(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await getAuth(adminApp()).verifySessionCookie(cookie, true);
    return decoded.uid;
  } catch {
    // Expired, revoked, or forged.
    return null;
  }
}
