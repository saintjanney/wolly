import type { FirestoreTimestamp } from './firestore';

/**
 * The revenue share between an author and Wolly.
 *
 * CONFIGURABLE, AND FROZEN AT THE MOMENT IT MATTERS. Those two properties are
 * in tension and the tension is the whole design.
 *
 * Staff set the terms in the backoffice, so the platform can change what it
 * offers without a deploy. But an author who signed a contract saying they keep
 * 70% keeps 70%, and a sale that already happened at 70% stays at 70% forever.
 * So the settings document is the DEFAULT FOR THE NEXT CONTRACT, never a value
 * anything reads at payout time.
 *
 * There are therefore three copies of the terms, and that is correct:
 *
 *   1. `platform_settings/revenue`  what Wolly currently offers
 *   2. the publishing contract       what this author agreed to, at signing
 *   3. the transaction row           what this sale actually paid, at sale time
 *
 * Reading (1) when computing (3) is the bug this file exists to prevent. It is
 * the same defect the transaction ledger was built to fix: earnings were once
 * derived from the book's CURRENT royalty setting, so changing it rewrote money
 * an author had already been shown.
 *
 * MINOR UNITS THROUGHOUT. All amounts are pesewas (GHS x 100).
 */

/**
 * What the author's share is a share OF.
 *
 * `gross` means the author's cut is a clean percentage of the sticker price and
 * Wolly absorbs the processor's fee out of its own share. It is the default
 * because it is the only version an author can check against a receipt: the
 * same book at the same price always earns the same amount, whether the reader
 * paid by mobile money or by card.
 *
 * `net` takes the fee off the top first and both sides share it. It protects
 * Wolly's margin, at the cost of an author's earnings on identical sales
 * differing by payment channel, which is hard to explain on a statement.
 */
export type RevenueBasis = 'gross' | 'net';

/** The terms themselves. Small on purpose: this shape gets copied and frozen. */
export interface RevenueTerms {
  /** The author's share of a sale, as a fraction in 0..1. */
  authorShare: number;
  basis: RevenueBasis;
}

/** The one document staff edit. */
export const REVENUE_SETTINGS_COLLECTION = 'platform_settings';
export const REVENUE_SETTINGS_DOC = 'revenue';
export const REVENUE_SETTINGS_PATH = `${REVENUE_SETTINGS_COLLECTION}/${REVENUE_SETTINGS_DOC}`;

/**
 * Used when the settings document is missing, unreadable, or invalid.
 *
 * A missing config must not stop a sale or pay someone nothing, so there is
 * always an answer. 70/30 on gross is what the platform offered before the
 * terms became configurable, so falling back to it changes nothing for anyone.
 */
export const DEFAULT_REVENUE_TERMS: RevenueTerms = { authorShare: 0.7, basis: 'gross' };

/** The stored shape, which is the terms plus an audit trail of who set them. */
export interface RevenueSettings extends RevenueTerms {
  updatedAt?: FirestoreTimestamp;
  updatedBy?: string;
  /** Why the terms changed, for the backoffice history. */
  note?: string;
}

/**
 * The widest share staff may set.
 *
 * Not 1. An author share of 100% leaves Wolly paying the processor's fee out of
 * nothing on every sale, which is not a business decision anyone would make on
 * purpose, so it is far more likely to be a typo than an intention.
 */
export const MAX_AUTHOR_SHARE = 0.95;

/**
 * Reads terms out of whatever Firestore returned, and refuses nonsense.
 *
 * THIS IS A SAFETY BOUNDARY, not defensive habit. The settings document is
 * hand-edited by staff, and `authorShare: 70` typed instead of `0.7` would pay
 * an author seventy times the sale price. A percentage typed as a percentage is
 * the single most likely mistake here, and it is silent: the number looks
 * right in the console.
 *
 * Anything invalid falls back to the platform default rather than throwing,
 * because the alternative is a config typo taking checkout down.
 */
export function readRevenueTerms(raw: unknown): RevenueTerms {
  const source = (raw ?? {}) as Partial<RevenueTerms>;
  const share = Number(source.authorShare);
  const basis: RevenueBasis = source.basis === 'net' ? 'net' : 'gross';

  if (!Number.isFinite(share) || share <= 0 || share > MAX_AUTHOR_SHARE) {
    return { ...DEFAULT_REVENUE_TERMS };
  }
  return { authorShare: share, basis };
}

/**
 * Whether a set of terms is safe to SAVE.
 *
 * Stricter than `readRevenueTerms`, and deliberately so: on the way in, a bad
 * value is rejected so a human can fix it; on the way out, a bad value already
 * stored must not break checkout. Returns the reason rather than a boolean, so
 * the backoffice can say what is wrong instead of just refusing.
 */
export function revenueTermsProblem(terms: RevenueTerms): string | null {
  const share = Number(terms.authorShare);
  if (!Number.isFinite(share)) return 'The author share must be a number.';
  if (share > 1) {
    return 'The author share is a fraction, not a percentage. 70% is 0.7.';
  }
  if (share <= 0) return 'The author share must be greater than zero.';
  if (share > MAX_AUTHOR_SHARE) {
    return `The author share cannot exceed ${Math.round(MAX_AUTHOR_SHARE * 100)}%, because Wolly still pays the payment processor out of its own share.`;
  }
  if (terms.basis !== 'gross' && terms.basis !== 'net') {
    return 'The basis must be either gross or net.';
  }
  return null;
}

/** For a screen: "You keep 70% of every sale." */
export function describeTerms(terms: RevenueTerms): string {
  const percent = Math.round(terms.authorShare * 1000) / 10;
  return terms.basis === 'gross'
    ? `You keep ${percent}% of every sale.`
    : `You keep ${percent}% of every sale after payment charges.`;
}
