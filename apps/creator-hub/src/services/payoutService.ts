import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, type EpubBook, type Purchase } from '@wolly/schema';
import { Payment } from '@/types/book';

/**
 * Real payout history, derived from the `purchases` collection.
 *
 * There is no separate settlement/ledger system yet, so a "payout" here is a
 * per-calendar-month aggregate of the creator's sales: gross revenue, the
 * creator's royalty (per the book's royaltyOption), and the platform's share.
 * The in-progress (current) month is reported as `pending`; earlier months as
 * `completed`.
 */
export class PayoutService {
  static async getPayoutHistory(userId: string, currency = 'GHS'): Promise<Payment[]> {
    const books = await PayoutService.getCreatorBooks(userId);
    if (books.length === 0) return [];

    const royaltyByBook = new Map<string, number>();
    for (const b of books) royaltyByBook.set(b.id, royaltyRateOf(b));

    const sales = await PayoutService.getSales(books.map((b) => b.id));
    if (sales.length === 0) return [];

    // Group by calendar month (key: YYYY-MM).
    interface Bucket {
      periodStart: Date;
      periodEnd: Date;
      totalSales: number;
      totalRevenue: number;
      totalRoyalty: number;
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
          totalRoyalty: 0,
          saleCurrency: sale.currency,
        };
      bucket.totalSales += 1;
      bucket.totalRevenue += sale.amount;
      bucket.totalRoyalty += sale.amount * (royaltyByBook.get(sale.bookId) ?? 0.7);
      buckets.set(key, bucket);
    }

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;

    const payments: Payment[] = Array.from(buckets.entries()).map(([key, b]) => {
      const netAmount = round2(b.totalRoyalty);
      const platformFee = round2(b.totalRevenue - b.totalRoyalty);
      const royaltyRate = b.totalRevenue > 0 ? b.totalRoyalty / b.totalRevenue : 0.7;
      const isCurrent = key === currentKey;
      return {
        id: `payout-${b.periodStart.getTime()}`,
        userId,
        bookId: '',
        amount: netAmount,
        currency: b.saleCurrency || currency,
        type: 'royalty',
        status: isCurrent ? 'pending' : 'completed',
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
        processedAt: isCurrent
          ? undefined
          : new Date(b.periodEnd.getFullYear(), b.periodEnd.getMonth() + 1, 5),
        paidAt: isCurrent
          ? undefined
          : new Date(b.periodEnd.getFullYear(), b.periodEnd.getMonth() + 1, 7),
      };
    });

    // Most recent first.
    return payments.sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime());
  }

  private static async getCreatorBooks(userId: string): Promise<EpubBook[]> {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.EPUBS), where('ownerUserId', '==', userId)),
    );
    return snap.docs.map((d) => ({ ...(d.data() as EpubBook), id: d.id }));
  }

  private static async getSales(
    bookIds: string[],
  ): Promise<{ bookId: string; amount: number; date: Date; currency: string }[]> {
    const out: { bookId: string; amount: number; date: Date; currency: string }[] = [];
    for (let i = 0; i < bookIds.length; i += 10) {
      const ids = bookIds.slice(i, i + 10);
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.PURCHASES), where('bookId', 'in', ids)),
      );
      snap.forEach((docSnap) => {
        const p = docSnap.data() as Purchase;
        out.push({
          bookId: p.bookId,
          amount: (p.amountInPesewas ?? 0) / 100,
          date: toDate(p.purchasedAt),
          currency: p.currency || 'GHS',
        });
      });
    }
    return out;
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

function royaltyRateOf(book: EpubBook): number {
  if (book.royaltyOption === '35%') return 0.35;
  if (book.royaltyOption === '70%') return 0.7;
  return 0.7;
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
