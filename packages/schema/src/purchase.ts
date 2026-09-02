import type { FirestoreTimestamp } from './firestore';

/**
 * Where a purchase is in the Paystack flow.
 *
 * `pending` means checkout was started, NOT that anything was paid. Only
 * `completed` grants ownership; anything else must be treated as unpaid.
 */
export type PurchaseStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'abandoned';

/**
 * A document in the `purchases` collection, one row per sale.
 *
 * SERVER-WRITTEN ONLY. Security rules deny client creates and all updates. The
 * reader used to write this document itself, immediately after launching the
 * Paystack checkout URL, which meant merely opening the browser granted
 * ownership without any payment. Now `initializePaystackCheckout` creates it as
 * `pending` and `verifyPaystackPayment` promotes it to `completed` only after
 * confirming the transaction with Paystack and checking the amount matches
 * (see services/payments).
 */
export interface Purchase {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  /** The creator who earns from this sale (denormalised from the book). */
  ownerUserId?: string;
  /** Payment provider reference (e.g. Paystack). */
  reference: string;
  /** Amount in the currency's minor unit (e.g. pesewas for GHS). */
  amountInPesewas: number;
  currency: string;
  /** ISO country code of the buyer, when known (powers geographic analytics). */
  countryCode?: string;

  /**
   * Only `completed` means paid. Absent on documents written before
   * verification existed; treat absent as NOT paid.
   */
  status?: PurchaseStatus;
  /** When checkout was started. Not evidence of payment. */
  launchedAt?: FirestoreTimestamp;
  /** Paystack's `gateway_response`, kept for support and dispute handling. */
  gatewayResponse?: string;
  /** Paystack channel, e.g. card, mobile_money, bank. */
  channel?: string;

  /** Set when Paystack confirms the payment. */
  purchasedAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

/**
 * Whether a purchase represents money that actually arrived.
 *
 * The ONLY correct test for revenue, royalties, entitlement and analytics.
 * Defined here rather than at each call site because it was previously implicit
 * and two call sites simply omitted it: `analyticsService.getSalesForBooks()`
 * and `payoutService.getSales()` both queried `purchases` by `bookId` with no
 * status filter, so a reader who opened checkout and walked away permanently
 * inflated the author's reported earnings.
 *
 * Absent status is NOT paid, per the field contract above. Documents written
 * before verification existed carry no status, and there is no way to tell a
 * genuine legacy sale from an abandoned one; counting them would be guessing
 * with an author's money.
 */
export function isPaid(purchase: Pick<Purchase, 'status'>): boolean {
  return purchase.status === 'completed';
}
