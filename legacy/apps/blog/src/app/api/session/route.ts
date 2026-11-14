import { getAuth } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';

import { adminApp } from '@/lib/firebase-admin';
import { SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/session';

/**
 * Exchanges a Firebase ID token for an HttpOnly session cookie.
 *
 * The blog renders on the server, so it needs the viewer's identity server-side
 * to decide whether to include a post's paid segment. An ID token in
 * JavaScript-readable storage would not reach the server on a navigation, so the
 * standard Firebase pattern applies: the client signs in, posts its ID token
 * here once, and the server sets a cookie it can verify on every request.
 *
 * The cookie is HttpOnly (script cannot read it), Secure, and SameSite=Lax so it
 * survives normal navigation but is not sent on cross-site POSTs.
 */
export async function POST(request: Request) {
  let idToken: string | undefined;
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = body.idToken;
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  if (!idToken) {
    return NextResponse.json({ error: 'idToken is required.' }, { status: 400 });
  }

  const auth = getAuth(adminApp());

  try {
    // Verify before minting. checkRevoked catches a token issued to an account
    // that has since been disabled.
    const decoded = await auth.verifyIdToken(idToken, true);

    // Refuse a stale token. A session cookie lasts two weeks, so it should only
    // ever be minted from a fresh sign-in, not from a token found lying around.
    const ageMs = Date.now() - decoded.auth_time * 1000;
    if (ageMs > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Please sign in again.' },
        { status: 401 },
      );
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_TTL_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionCookie,
      maxAge: SESSION_TTL_MS / 1000,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch {
    // Deliberately not echoing the reason: it would tell a prober which tokens
    // are real.
    return NextResponse.json({ error: 'Could not sign in.' }, { status: 401 });
  }
}

/** Signs out by clearing the cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
