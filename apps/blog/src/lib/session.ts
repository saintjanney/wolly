import 'server-only';

import { cookies } from 'next/headers';

/**
 * The viewing user's uid, or null for a logged-out reader.
 *
 * PHASE 1: always null. Every visitor is treated as logged out, which is the
 * correct default, free posts render for everyone and anything paywalled shows
 * the paywall. Nothing is leaked by this stub; it only means a paying
 * subscriber does not yet get their paid content on the website.
 *
 * PHASE 2 fills this in. The plan is a Firebase session cookie: the client
 * signs in (email link), posts its ID token to `/api/session`, and the server
 * mints a session cookie with `getAuth().createSessionCookie()`. This function
 * then verifies it with `verifySessionCookie(cookie, true)` and returns `uid`.
 *
 * It must stay the single source of viewer identity: `loadPostForViewer()` is
 * the only paywall enforcement point on this surface, and it trusts whatever
 * this returns.
 */
export async function getViewerUserId(): Promise<string | null> {
  const store = await cookies();
  const session = store.get('__session');
  if (!session) return null;

  // Deliberately not verified yet. Returning null rather than trusting an
  // unverified cookie is the safe direction: it under-grants, never over-grants.
  return null;
}
