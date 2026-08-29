import { createHash, randomUUID } from 'node:crypto';

/**
 * Content provenance: the "tag in the source code" the product asked for.
 *
 * Every file Wolly presses carries a provenance record in THREE places, so
 * stripping it takes deliberate effort in each format:
 *
 *  - machine-readable metadata (EPUB OPF / PDF document info), where honest
 *    tooling reads it;
 *  - a human-readable colophon page, where a casual copier does not think to
 *    look;
 *  - the fingerprint stored server-side on the book record, which is what a
 *    found-in-the-wild file is matched against.
 *
 * WHAT THIS IS: forensic attribution. A file that surfaces outside Wolly can be
 * traced to the exact pressing (and, once per-copy stamping ships, the exact
 * account that downloaded it).
 *
 * WHAT THIS IS NOT: telemetry. EPUB readers strip scripts and PDF viewers block
 * them, so a file cannot report its own location. Tracking means tracing, not
 * phoning home. Remote destruction of a copied file is likewise impossible for
 * open formats; what Wolly enforces instead is revocation at the delivery gate
 * (see rightsStatus in services/api/src/download.ts).
 */
export interface Provenance {
  /** Unique per pressing. Stored on the book record for later matching. */
  fingerprint: string;
  bookId: string;
  title: string;
  author: string;
  publisher: string;
  pressedAt: string; // ISO 8601
  /** Short statement of the licence readers are bound by. */
  rights: string;
}

export function mintProvenance(input: {
  bookId: string;
  title: string;
  author: string;
}): Provenance {
  return {
    fingerprint: `wolly-${randomUUID()}`,
    bookId: input.bookId,
    title: input.title,
    author: input.author,
    publisher: 'Wolly',
    pressedAt: new Date().toISOString(),
    rights:
      'Published by Wolly for personal reading. Redistribution requires the ' +
      'publisher’s permission. This copy is individually identifiable.',
  };
}

/**
 * A stable content hash of the pressed inputs, recorded alongside the random
 * fingerprint. The fingerprint answers "which pressing is this file"; the
 * content hash answers "has this file been altered since Wolly pressed it".
 */
export function contentHash(parts: Array<string | Buffer>): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part);
  return hash.digest('hex');
}
