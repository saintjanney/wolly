import type { FirestoreTimestamp } from './firestore';
import { DEFAULT_REVENUE_TERMS, type RevenueBasis, type RevenueTerms } from './revenue';

/**
 * A completed sale, recorded once and never recalculated.
 *
 * WHY THIS EXISTS SEPARATELY FROM `purchases`. A purchase document answers
 * "may this reader open this book" and is keyed `{uid}_{bookId}`, so there is
 * exactly one per reader per book and it is mutated as checkout progresses.
 * Money needs the opposite properties: one immutable row per sale, carrying the
 * numbers as they stood at the moment it happened.
 *
 * Deriving earnings from `purchases` plus the book's current settings produced
 * two real defects. Revenue counted `pending` rows, because the status filter
 * was implicit and two call sites forgot it. And the author's share was read from
 * the book's *current* setting, so changing it rewrote earnings that had
 * already been shown. Both are structurally impossible here:
 * only completed sales are ever written, and every number is frozen on the row.
 *
 * MINOR UNITS THROUGHOUT. All amounts are pesewas (GHS x 100). Floats do not
 * belong anywhere near money, and `amountInPesewas` on `purchases` already set
 * this convention.
 */
export interface Transaction {
  /** The provider reference, which is unique per attempt and idempotent. */
  id: string;

  bookId: string;
  /** Denormalised so a ledger row is readable without a join. */
  bookTitle: string;
  /** The reader who paid. */
  buyerUserId: string;
  /** The creator who earns. Denormalised at sale time: if a book changes hands,
   *  past sales still belong to whoever earned them. */
  authorUserId: string;

  currency: string;

  /** What the buyer was charged. */
  grossMinor: number;
  /**
   * What Paystack kept, from `fees` on the verification response.
   *
   * Previously discarded, which made Wolly's true margin unknowable: gross
   * minus the author's share is not profit until the processor is paid.
   */
  providerFeeMinor: number;
  /** grossMinor - providerFeeMinor. What actually settles to Wolly. */
  netMinor: number;

  /**
   * The author's share, FROZEN AT SALE TIME.
   *
   * Never read from the platform settings, and never from the book, when
   * reporting or paying. Staff can change what Wolly offers tomorrow; this row
   * records what this sale actually paid today. That is the entire reason the
   * ledger exists.
   */
  authorShare: number;
  /** What `authorShare` was a share of, also frozen. See RevenueBasis. */
  revenueBasis: RevenueBasis;
  /**
   * The author's money, in pesewas.
   *
   * On the `gross` basis this is a clean percentage of the sticker price, and
   * Wolly absorbs the processor's fee out of its own share, so the author earns
   * the same on the same book at the same price however the reader paid. On the
   * `net` basis the fee comes off first and both sides carry it.
   */
  authorEarningsMinor: number;
  /**
   * netMinor - authorEarningsMinor. Wolly's actual margin after the processor.
   *
   * CAN BE NEGATIVE on a cheap enough book, because Paystack's fee has a fixed
   * component. That is a pricing-floor question, not a bug, and it is recorded
   * rather than clamped so it is visible when it happens.
   */
  platformNetMinor: number;

  provider: 'paystack';
  providerReference: string;
  /** Paystack channel: card, mobile_money, bank. */
  channel?: string;
  /** ISO country code of the buyer, when the provider reports one. */
  countryCode?: string;

  /** When the money actually moved, per the provider. */
  occurredAt: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;

  /** Set when a payout run includes this row. Absent means still owed. */
  payoutId?: string;
}

/**
 * Splits a sale into its parts.
 *
 * Pure, so it can be tested without Firestore and reused by the payout run.
 * Rounding is applied once, to the author's share, and the platform takes the
 * remainder: that way the parts always sum back to the gross exactly, with no
 * stray pesewa appearing or vanishing.
 */
export function splitSale(input: {
  grossMinor: number;
  providerFeeMinor: number;
  /** The terms FROZEN on the purchase, never the platform's current settings. */
  terms: RevenueTerms;
}): Pick<
  Transaction,
  | 'grossMinor'
  | 'providerFeeMinor'
  | 'netMinor'
  | 'authorShare'
  | 'revenueBasis'
  | 'authorEarningsMinor'
  | 'platformNetMinor'
> {
  const grossMinor = Math.round(input.grossMinor);
  const providerFeeMinor = Math.max(0, Math.round(input.providerFeeMinor));
  const netMinor = grossMinor - providerFeeMinor;

  const { authorShare, basis } = input.terms;
  // The basis decides who carries the processor's fee, and nothing else.
  const shareOf = basis === 'net' ? netMinor : grossMinor;
  const authorEarningsMinor = Math.max(0, Math.round(shareOf * authorShare));

  return {
    grossMinor,
    providerFeeMinor,
    netMinor,
    authorShare,
    revenueBasis: basis,
    authorEarningsMinor,
    // The remainder, never a second rounded multiplication, so the parts always
    // sum back to net exactly and no pesewa appears or vanishes.
    platformNetMinor: netMinor - authorEarningsMinor,
  };
}

/**
 * The terms to use for a sale, given what was frozen on the purchase.
 *
 * A purchase created before the terms became configurable carries the old
 * `royaltyRate` and no basis. Those were all shares of gross, so that is what
 * they are read as. Without this, a checkout begun before a deploy and verified
 * after it would fall back to the platform default and pay the wrong amount.
 */
export function termsFromPurchase(purchase: {
  authorShare?: number | null;
  revenueBasis?: string | null;
  royaltyRate?: number | null;
}): RevenueTerms {
  const share = Number(purchase.authorShare ?? purchase.royaltyRate);
  if (!Number.isFinite(share) || share <= 0 || share > 1) {
    return { ...DEFAULT_REVENUE_TERMS };
  }
  return { authorShare: share, basis: purchase.revenueBasis === 'net' ? 'net' : 'gross' };
}
