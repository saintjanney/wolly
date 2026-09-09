import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, type Transaction } from '@wolly/schema';
import { Payment } from '@/types/book';

/**
 * Real payout history, derived from the `transactions` ledger.
 *
 * READ FROM THE LEDGER, NEVER RECOMPUTED. Each transaction row carries
 * `authorEarningsMinor` frozen at the moment of the sale, so this function adds
 * up money that was actually agreed rather than re-deriving it.
 *
 * It used to multiply completed purchases by the book's CURRENT share, which
 * was already wrong (an author editing a setting rewrote earnings they had been
 * shown) and became far worse when the revenue share moved into staff-editable
 * platform settings: one change in the backoffice would have retroactively
 * rewritten what every author on the platform was owed. The ledger exists
 * precisely so that cannot happen; this simply reads it.
 *
 * A "payout" here is still a per-calendar-month aggregate, because there is no
 * settlement system yet. Everything is `pending` until a real record exists in
 * `payouts`.
 */
export class PayoutService {
  static async getPayoutHistory(userId: string, currency = 'GHS'): Promise<Payment[]> {
    const sales = await PayoutService.getSales(userId);
    if (sales.length === 0) return [];

    // Group by calendar month (key: YYYY-MM).
    interface Bucket {
      periodStart: Date;
      periodEnd: Date;
      totalSales: number;
      totalRevenue: number;
      totalEarnings: number;
      saleCurrency: string;
    }
    const buckets = new Map<string, Bucket>();
    for (const sale of sales) {
      const d = sale.date;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket =
        buckets.get(key) ??
        {
          periodStart: new Date(d.getFullYear(), d.getMonth(), 1),
          periodEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0),
          totalSales: 0,
          totalRevenue: 0,
          totalEarnings: 0,
          saleCurrency: sale.currency,
        };
      bucket.totalSales += 1;
      bucket.totalRevenue += sale.amount;
      // Summed from the row, not multiplied by a rate read now.
      bucket.totalEarnings += sale.authorEarnings;
      buckets.set(key, bucket);
    }

    const payments: Payment[] = Array.from(buckets.values()).map((b) => {
      const netAmount = round2(b.totalEarnings);
      const platformFee = round2(b.totalRevenue - b.totalEarnings);
      // The EFFECTIVE share actually paid across the month, derived from the
      // money rather than asserted. If sales in one month were agreed on
      // different terms, this reports the blend, which is the truth.
      const royaltyRate = b.totalRevenue > 0 ? b.totalEarnings / b.totalRevenue : 0;
      return {
        id: `payout-${b.periodStart.getTime()}`,
        userId,
        bookId: '',
        amount: netAmount,
        currency: b.saleCurrency || currency,
        type: 'royalty',
        // Everything is owed until a real payout record says otherwise. See below.
        status: 'pending',
        periodStart: b.periodStart,
        periodEnd: b.periodEnd,
        salesData: {
          totalSales: b.totalSales,
          totalRevenue: round2(b.totalRevenue),
          royaltyRate,
          platformFee,
          netAmount,
        },
        paymentMethod: { type: 'bank_transfer', details: {} },
        createdAt: new Date(b.periodEnd.getFullYear(), b.periodEnd.getMonth() + 1, 1),
        // NOT SET, deliberately.
        //
        // These used to be fabricated: any period that was not the current month
        // was marked `completed` with a `processedAt` of the 5th and a `paidAt`
        // of the 7th of the following month. No money had moved and the
        // `payouts` collection is empty, so the screen told an author they had
        // been paid, on a specific date, when they had not.
        //
        // What this function can honestly derive is EARNINGS, from completed
        // purchases. Whether they were paid is a fact about a payout run, and it
        // belongs to the `payouts` collection, which ops writes through the
        // Admin SDK. Until a record exists there, everything owed is pending.
        processedAt: undefined,
        paidAt: undefined,
      };
    });

    // Most recent first.
    return payments.sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime());
  }

  /**
   * Completed sales for this creator, straight off the ledger.
   *
   * One query on `authorUserId`, rather than fetching the creator's books and
   * chunking their ids ten at a time into an `in` filter. The ledger row
   * denormalises the author, so a book changing hands leaves past sales with
   * whoever earned them.
   *
   * Only completed sales are ever written to `transactions`, so there is no
   * status filter to forget here, which is the defect that inflated earnings
   * when this read `purchases`.
   */
  private static async getSales(
    userId: string,
  ): Promise<{ bookId: string; amount: number; authorEarnings: number; date: Date; currency: string }[]> {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.TRANSACTIONS), where('authorUserId', '==', userId)),
    );
    return snap.docs.map((docSnap) => {
      const t = docSnap.data() as Transaction;
      return {
        bookId: t.bookId,
        amount: (t.grossMinor ?? 0) / 100,
        authorEarnings: (t.authorEarningsMinor ?? 0) / 100,
        date: toDate(t.occurredAt),
        currency: t.currency || 'GHS',
      };
    });
  }
}

/** Aggregate stats for the payout summary cards. */
export function calculatePayoutStats(payments: Payment[]) {
  const completed = payments.filter((p) => p.status === 'completed');
  const pending = payments.filter((p) => p.status === 'pending' || p.status === 'processing');
  const totalEarnings = completed.reduce((sum, p) => sum + p.amount, 0);
  const pendingBalance = pending.reduce((sum, p) => sum + p.amount, 0);
  const nextPayout = pending[0];
  return {
    totalEarnings: round2(totalEarnings),
    pendingBalance: round2(pendingBalance),
    nextPayoutAmount: nextPayout ? round2(nextPayout.amount) : 0,
    lifetimePayouts: completed.length,
    totalPending: pending.length,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'number') return new Date(value);
  return new Date(0);
}
