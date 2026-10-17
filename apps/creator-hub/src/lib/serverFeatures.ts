'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the server half of Wolly is answering.
 *
 * Typesetting, previews, downloads, publishing agreements and blog publishing
 * all run in Cloud Functions, and a function is one billing lapse, outage or
 * bad deploy away from answering with Google's own error page instead of
 * itself. Every screen that depends on one used to find that out only when the
 * author clicked, and then said something unhelpful ("internal"). This module
 * lets a screen know up front, so it can say so plainly and keep the author's
 * work safe, and lets a catch block say the same thing when a call fails.
 *
 * The probe is a bare POST to a callable with no token. When the function is
 * up it answers 401 as JSON, with CORS headers; when the platform is down the
 * answer is a 5xx HTML page, or a CORS failure that surfaces as a thrown
 * TypeError. Either of the latter means unavailable. One invocation when it is
 * up, cached for a minute, is a price worth paying for a screen that tells the
 * truth before the click rather than after it.
 */
export type ServerFeatureState = 'unknown' | 'available' | 'unavailable';

const PROBE_URL =
  'https://europe-west2-wolly-1133d.cloudfunctions.net/getBookPreviewBytes';
const CACHE_MS = 60_000;

/** One line, used everywhere, so the hub never contradicts itself. */
export const SERVER_UNAVAILABLE_MESSAGE =
  'This part of Wolly is temporarily unavailable. Your work is saved, and you can try again later.';

let cached: { state: ServerFeatureState; at: number } | null = null;
let inFlight: Promise<ServerFeatureState> | null = null;

export async function probeServerFeatures(force = false): Promise<ServerFeatureState> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.state;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    let state: ServerFeatureState;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(PROBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"data":{}}',
        signal: controller.signal,
      });
      clearTimeout(timer);
      // A 4xx is the function answering as itself (unauthenticated, bad
      // argument). A 5xx is the platform.
      state = res.status < 500 ? 'available' : 'unavailable';
    } catch {
      state = 'unavailable';
    }
    cached = { state, at: Date.now() };
    inFlight = null;
    return state;
  })();
  return inFlight;
}

/** The probe as a hook: 'unknown' until it answers, then cached. */
export function useServerFeatures(): ServerFeatureState {
  const [state, setState] = useState<ServerFeatureState>(cached?.state ?? 'unknown');
  useEffect(() => {
    let live = true;
    probeServerFeatures().then((s) => {
      if (live) setState(s);
    });
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/**
 * Whether an error from a callable means the server was not there, as opposed
 * to the server refusing. A refusal carries a message written for the author
 * and must be shown as it is; this must not be.
 */
export function isServerUnavailableError(error: unknown): boolean {
  const e = error as { code?: string; message?: string; name?: string } | null;
  if (!e) return false;
  const code = e.code ?? '';
  if (
    code === 'functions/unavailable' ||
    code === 'functions/internal' ||
    code === 'functions/not-found' ||
    code === 'functions/deadline-exceeded' ||
    code === 'functions/cancelled' ||
    code === 'functions/unknown'
  ) {
    return true;
  }
  // fetch() failing outright (CORS on Google's error page, no network).
  if (e.name === 'TypeError' && /fetch|network/i.test(e.message ?? '')) return true;
  return false;
}

/** The message to show for a failed call: the server's own, or the one line. */
export function describeServerError(error: unknown, fallback: string): string {
  if (isServerUnavailableError(error)) return SERVER_UNAVAILABLE_MESSAGE;
  const message = (error as { message?: string } | null)?.message;
  return message && message.trim() ? message : fallback;
}

/**
 * Uploads go to Cloud Storage, which answers 402 when the project's plan does
 * not cover it. The SDK reports that as `storage/quota-exceeded`, and its own
 * message talks about quota and pricing, which is not the author's problem to
 * solve.
 */
export const UPLOADS_UNAVAILABLE_MESSAGE =
  'Uploads are temporarily unavailable. Your title is saved; please try this upload again later.';

export function isStorageUnavailableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? '';
  return (
    code === 'storage/quota-exceeded' ||
    code === 'storage/retry-limit-exceeded' ||
    code === 'storage/unknown'
  );
}

/** For a failed upload: the app's own message if it had one, else the one line. */
export function describeUploadError(error: unknown, fallback: string): string {
  if (isStorageUnavailableError(error)) return UPLOADS_UNAVAILABLE_MESSAGE;
  if (isServerUnavailableError(error)) return SERVER_UNAVAILABLE_MESSAGE;
  const message = (error as { message?: string } | null)?.message;
  return message && message.trim() ? message : fallback;
}
