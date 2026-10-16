import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '@/lib/firebase';
import {
  DEFAULT_REVENUE_TERMS,
  PUBLISHING_AGREEMENT_V1,
  readRevenueTerms,
  type PublishingContract,
  type RevenueTerms,
} from '@wolly/schema';

const EPUBS = 'epubs';
const CONTRACTS = 'contracts';

export class PublishError extends Error {
  /** Which blocking checks stopped the signing, when the server said. */
  readonly problems: Array<{ check: string; message: string }>;
  constructor(message: string, problems: Array<{ check: string; message: string }> = []) {
    super(message);
    this.problems = problems;
  }
}

export class PublishService {
  /**
   * The terms Wolly is currently offering.
   *
   * Read for DISPLAY, so the author sees what they are about to agree to. The
   * contract is signed by the server, which reads them again and freezes them,
   * so a stale value in a browser tab can never become the agreed rate.
   */
  static async currentTerms(bookId?: string): Promise<RevenueTerms> {
    try {
      if (bookId) {
        const book = await getDoc(doc(db, EPUBS, bookId));
        const override = book.data()?.revenueTerms;
        if (override) return readRevenueTerms(override);
      }
      const snap = await getDoc(doc(db, 'platform_settings', 'revenue'));
      return readRevenueTerms(snap.exists() ? snap.data() : null);
    } catch {
      // A settings read failing must not block the screen. The server reads it
      // again anyway, and this value is only ever shown.
      return { ...DEFAULT_REVENUE_TERMS };
    }
  }

  /** The exact words to render, and to send back with the signature. */
  static agreement(): { version: string; text: string } {
    return { version: PUBLISHING_AGREEMENT_V1.version, text: PUBLISHING_AGREEMENT_V1.text };
  }

  /**
   * Signs the contract.
   *
   * The agreement text is sent back to the server rather than looked up there,
   * so what is stored is what was on screen. The server refuses a signature
   * that arrives without it.
   */
  static async sign(input: {
    bookId: string;
    isFree: boolean;
    priceMinor: number;
  }): Promise<{ contractId: string; authorShare: number; revenueBasis: string }> {
    const { version, text } = PublishService.agreement();
    const call = httpsCallable<
      Record<string, unknown>,
      { contractId: string; authorShare: number; revenueBasis: string }
    >(functions, 'signPublishingContract');

    try {
      const { data } = await call({
        bookId: input.bookId,
        isFree: input.isFree,
        priceMinor: input.priceMinor,
        agreementVersion: version,
        agreementText: text,
      });
      return data;
    } catch (error) {
      const err = error as { message?: string; details?: { problems?: Array<{ check: string; message: string }> } };
      throw new PublishError(
        err.message || 'Wolly could not record the agreement.',
        err.details?.problems ?? [],
      );
    }
  }

  /** Contracts for a book, newest first. Ended ones are kept and shown. */
  static async history(bookId: string): Promise<PublishingContract[]> {
    const snap = await getDocs(collection(db, EPUBS, bookId, CONTRACTS));
    return snap.docs
      .map((d) => ({ ...(d.data() as PublishingContract), id: d.id }))
      .sort((a, b) => String(b.signedAt ?? '').localeCompare(String(a.signedAt ?? '')));
  }

  /** Whether the author has somewhere to be paid. Read from their own profile. */
  static async hasPayoutDestination(userId: string): Promise<boolean> {
    const snap = await getDoc(doc(db, 'users', userId));
    const info = snap.data()?.paymentInfo ?? {};
    return Boolean(info.payment_option) && Object.keys(info.payment_details ?? {}).length > 0;
  }

  /** Titles this author has, for the books list to group by flow. */
  static async titles(userId: string) {
    const snap = await getDocs(query(collection(db, EPUBS), where('ownerUserId', '==', userId)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  }
}
