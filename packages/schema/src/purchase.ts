import type { FirestoreTimestamp } from './firestore';

/**
 * A document in the `purchases` collection — one row per sale. Written by the
 * reader on successful checkout; aggregated by the creator-hub dashboard and
 * the backoffice for real sales/revenue analytics.
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
  purchasedAt: FirestoreTimestamp;
}
