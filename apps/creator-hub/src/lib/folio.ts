/**
 * Folio: Wolly's short-story site.
 *
 * Folio is a separate deployment (a static site on Cloudflare Pages backed by
 * Supabase) rather than a route in this app, so the hub links out to it. The
 * address lives here, once, so that when Folio moves under a Wolly domain only
 * this file or the build-time variable has to change.
 */
export const FOLIO_URL =
  process.env.NEXT_PUBLIC_FOLIO_URL || 'https://folio-35v.pages.dev';
