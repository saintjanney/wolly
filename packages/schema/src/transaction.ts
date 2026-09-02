import type { FirestoreTimestamp } from './firestore';

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
 * was implicit and two call sites forgot it. And the royalty rate was read from
 * the book's *current* `royaltyOption`, so an author changing it rewrote
 * earnings they had already been shown. Both are structurally impossible here:
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
   * The author's share, FROZEN. Not read from the book at report time.
   */
  royaltyRate: number;
  /**
   * round(grossMinor * royaltyRate).
   *
   * Deliberately a share of GROSS, not of net: it is the number the pricing
   * screen showed the author when they set the price, and paying them less than
   * they were told because a processor took a cut would be a surprise they never
   * agreed to. Wolly absorbs the processing fee out of its own share.
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
  royaltyRate: number;
}): Pick<
  Transaction,
  'grossMinor' | 'providerFeeMinor' | 'netMinor' | 'royaltyRate' | 'authorEarningsMinor' | 'platformNetMinor'
> {
  const grossMinor = Math.round(input.grossMinor);
  const providerFeeMinor = Math.max(0, Math.round(input.providerFeeMinor));
  const royaltyRate = input.royaltyRate;
  const netMinor = grossMinor - providerFeeMinor;
  const authorEarningsMinor = Math.round(grossMinor * royaltyRate);
  return {
    grossMinor,
    providerFeeMinor,
    netMinor,
    royaltyRate,
    authorEarningsMinor,
    platformNetMinor: netMinor - authorEarningsMinor,
  };
}

/** The royalty options a book may carry, as a rate. */
export function royaltyRateFor(royaltyOption: string | undefined): number {
  return royaltyOption === '35%' ? 0.35 : 0.7;
}
