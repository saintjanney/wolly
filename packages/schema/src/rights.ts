import type { FirestoreTimestamp } from './firestore';

/**
 * The rights registry: a per-book ledger of who may do what with a work.
 *
 * NOT THE SAME THING AS `epubs.rightsStatus`. That field is a takedown gate
 * (`clear | disputed | revoked`) read by `getBookDownloadUrl` to decide whether
 * to issue a download at all. This is a record of licensable grants. Collapsing
 * them would mean an author editing a licence could revoke their own book, so
 * they are deliberately separate and the registry NEVER touches the delivery
 * gate: a self-declared field must not be able to disable a book, and must not
 * be able to enable one.
 *
 * A LIABILITY RECORD FIRST, AN AUTHOR FEATURE SECOND. The discovery guide's own
 * tracker scores "authors value rights tracking" at 1 out of 5, so the budget
 * goes on the data model and the declared-versus-verified boundary (both
 * expensive to retrofit, both hard-enforced in rules) and almost nothing on
 * surface. What Wolly actually needs, regardless of whether authors ask for it,
 * is a durable record of who claimed what, in what wording, at what moment.
 *
 * Stored at `epubs/{bookId}/rights/{grantId}`.
 */

/** What a grant covers. Closed enum from day one, so Phase 4 needs no migration. */
export type RightsFormat =
  | 'print'
  | 'ebook'
  | 'audio'
  | 'translation'
  | 'adaptation'
  | 'educational'
  | 'library'
  | 'serialization'
  | 'merchandising';

export type RightsChannel = 'wolly' | 'direct' | 'retail' | 'library' | 'education' | 'other';

/** `unknown` rather than a guess. Most authors will not know, and inventing an answer is worse than recording that. */
export type RightsExclusivity = 'exclusive' | 'sole' | 'non_exclusive' | 'unknown';

export type RightsHolderKind = 'self' | 'publisher' | 'agent' | 'platform' | 'other';

/**
 * The only status axis the AUTHOR sets.
 *
 * `available` means not licensed to anyone. That is precisely the supply signal
 * a rights marketplace would query, so the semantic is kept exact even though
 * no marketplace exists.
 */
export type RightsDisposition = 'available' | 'licensed' | 'restricted';

/**
 * The verification axis, SERVER-OWNED.
 *
 * Absent reads as `unverified`, matching the "absent means clear" convention
 * used elsewhere. An author who could write this could mark their own claim
 * verified, which is the whole thing the boundary exists to prevent.
 */
export type RightsVerificationState =
  | 'unverified'
  | 'evidence_submitted'
  | 'verified'
  | 'needs_evidence'
  | 'disputed';

/** ISO 3166-1 alpha-2, or the sentinel `WORLD`. */
export type TerritoryCode = string;
/** ISO 639-1, or the sentinel `ALL`. */
export type LanguageCode = string;

export interface RightsTerms {
  royaltyPercent?: number | null;
  advanceAmount?: number | null;
  /** Minor units, like every other amount in the platform. */
  currency?: string;
  /** Plain language. In practice the only field most authors will fill. */
  summary?: string | null;
}

/**
 * What the author signed, stored verbatim.
 *
 * IMMUTABLE AFTER CREATE, enforced in rules. Storing the exact sentence that
 * was on screen at the moment of the tick, rather than a boolean, is what makes
 * the record defensible later: "they agreed" is worth little without "to what
 * words, and when". Supersedes the weaker `epubs.ownsCopyright`.
 */
export interface RightsDeclaration {
  declaredBy: string;
  declaredAt: FirestoreTimestamp;
  declarationText: string;
  declarationVersion: string;
}

export interface RightsGrant {
  id: string;
  /** Denormalised from the parent so a collection-group query works for staff. */
  bookId: string;
  ownerUserId: string;

  // ── Scope ────────────────────────────────────────────────────────────────
  format: RightsFormat;
  territories: TerritoryCode[];
  languages: LanguageCode[];
  channels: RightsChannel[];
  exclusivity: RightsExclusivity;

  // ── Counterparty ─────────────────────────────────────────────────────────
  holderKind: RightsHolderKind;
  holderName: string;
  /** Kept for future linkage. Grants no permission whatsoever today. */
  holderUserId?: string | null;

  // ── Time ─────────────────────────────────────────────────────────────────
  /**
   * Calendar dates as `YYYY-MM-DD`, not Timestamps.
   *
   * These come off a contract, and timezone drift on a licence expiry is a real
   * bug rather than a rounding detail.
   */
  startDate: string | null;
  /** Null means perpetual, or until terminated. The UI says exactly that. */
  endDate: string | null;

  terms?: RightsTerms;

  /** The author's own position. See RightsDisposition. */
  disposition: RightsDisposition;

  declaration: RightsDeclaration;

  // ── Verification, server-owned ───────────────────────────────────────────
  //
  // Kept FLAT rather than nested in an `assurance` map on purpose: Firestore
  // rules' diff().affectedKeys() enumerates top-level keys only, so a nested map
  // cannot be protected field by field.
  verificationState?: RightsVerificationState;
  verifiedBy?: string | null;
  verifiedAt?: FirestoreTimestamp | null;
  verificationNote?: string | null;
  /**
   * What was actually checked, in honest words.
   *
   * "Saw a signed 2024 agreement naming Sub-Saharan Africa print rights", never
   * "Wolly confirms this author owns this work". Same discipline RIGHTS.md
   * applies to takedown claims, applied to rights claims.
   */
  verifiedScope?: string | null;

  /** Archived rather than deleted, so the record of what was once claimed survives. */
  archivedAt?: FirestoreTimestamp | null;

  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

/** Fields only the server may write. Mirrors `serverOwnedBookFields()` in the rules. */
export const SERVER_OWNED_RIGHTS_FIELDS = [
  'verificationState',
  'verifiedBy',
  'verifiedAt',
  'verificationNote',
  'verifiedScope',
] as const;

/** A grant is flagged as expiring this far before its end date. */
export const EXPIRING_WINDOW_DAYS = 90;

/**
 * What to show against a grant.
 *
 * The spec lists six statuses. Only three of them are stored: the rest are
 * DERIVED, because a stored `expired` goes stale the moment the clock passes
 * midnight and nobody runs a job. Deriving them means no status can ever be
 * wrong.
 *
 * Precedence, in order: expired, then expiring, then needs-verification, then
 * the author's own disposition. Expired outranks needs-verification because an
 * expired grant needs renewing rather than checking.
 */
export type RightsBadge =
  | 'expired'
  | 'expiring'
  | 'needs_verification'
  | 'available'
  | 'licensed'
  | 'restricted';

export function deriveRightsBadge(
  grant: Pick<
    RightsGrant,
    'endDate' | 'disposition' | 'verificationState' | 'holderKind'
  > & { evidenceRef?: string | null },
  now: Date = new Date(),
): RightsBadge {
  if (grant.endDate) {
    const end = Date.parse(`${grant.endDate}T23:59:59Z`);
    if (Number.isFinite(end)) {
      if (end < now.getTime()) return 'expired';
      if (end <= now.getTime() + EXPIRING_WINDOW_DAYS * 86_400_000) return 'expiring';
    }
  }
  if (needsVerification(grant)) return 'needs_verification';
  return grant.disposition;
}

/**
 * Deliberately does not nag the majority who hold everything themselves.
 *
 * If you say a publisher holds your print rights, Wolly asks for the agreement.
 * If you say you hold everything yourself, it asks for nothing. A registry that
 * demands paperwork from every author is a registry nobody fills in.
 */
export function needsVerification(
  grant: Pick<RightsGrant, 'verificationState' | 'holderKind'> & { evidenceRef?: string | null },
): boolean {
  const state = grant.verificationState ?? 'unverified';
  if (state === 'disputed' || state === 'needs_evidence') return true;
  return grant.holderKind !== 'self' && !grant.evidenceRef && state === 'unverified';
}

/**
 * The grant Wolly proposes when an author has declared nothing.
 *
 * One tap to confirm. Worldwide rather than Ghana-only, because narrowing an
 * author's own claim on their behalf is the more harmful error, and most
 * self-publishing authors do hold everything.
 */
export function proposedDefaultGrant(input: {
  bookId: string;
  ownerUserId: string;
  authorName: string;
}): Omit<RightsGrant, 'id' | 'declaration'> {
  return {
    bookId: input.bookId,
    ownerUserId: input.ownerUserId,
    format: 'ebook',
    territories: ['WORLD'],
    languages: ['ALL'],
    channels: ['wolly'],
    exclusivity: 'unknown',
    holderKind: 'self',
    holderName: input.authorName,
    startDate: null,
    endDate: null,
    disposition: 'available',
  };
}

/**
 * The exact sentence an author confirms. Stored verbatim on the grant.
 *
 * Every word here is load-bearing. RIGHTS.md bans registered, certified,
 * protected, secured, proof and ownership confirmed across every rights
 * surface; the permitted vocabulary is recorded, your record, checked, and you
 * told us.
 */
export const RIGHTS_DECLARATION_V1 = {
  version: 'rights-declaration-v1',
  text:
    'I hold the rights I have described here, and the information is accurate ' +
    'to the best of my knowledge. Wolly records what I tell it. Wolly does not ' +
    'verify it, and this record is not a copyright registration and does not by ' +
    'itself prove ownership.',
} as const;
