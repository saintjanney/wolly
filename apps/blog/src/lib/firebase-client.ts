'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

/**
 * Browser-side Firebase for the blog.
 *
 * Distinct from `firebase-admin.ts`, which is server-only. This one signs the
 * reader in and lets them comment, like and subscribe under their own identity,
 * so security rules apply. Server rendering still uses the Admin SDK for reading
 * posts, and the two meet at the session cookie.
 *
 * These values are the public web config, not secrets: they identify the project
 * and are visible in any Firebase web app. Access is controlled by security
 * rules, not by hiding this.
 */
const config = {
  apiKey: 'AIzaSyC2Y5LE3kfuv14Viz7pzcSbEZhdySOUbcM',
  authDomain: 'wolly-1133d.firebaseapp.com',
  projectId: 'wolly-1133d',
  storageBucket: 'wolly-1133d.appspot.com',
  messagingSenderId: '550264739666',
  appId: '1:550264739666:web:889ef63529c127a1d8cc8b',
};

function app() {
  return getApps().length ? getApp() : initializeApp(config);
}

export function clientAuth(): Auth {
  return getAuth(app());
}

export function clientDb(): Firestore {
  return getFirestore(app());
}

export function clientFunctions(): Functions {
  // Must match the region services/api deploys to.
  return getFunctions(app(), 'europe-west2');
}

/**
 * Hands the current ID token to the server so it can mint a session cookie.
 *
 * Server-rendered pages cannot read the client's auth state, so without this
 * step a signed-in reader would still look logged out to the paywall.
 */
export async function syncSessionCookie(): Promise<void> {
  const user = clientAuth().currentUser;
  if (!user) return;
  const idToken = await user.getIdToken(true);
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
}

export async function clearSessionCookie(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' });
}
