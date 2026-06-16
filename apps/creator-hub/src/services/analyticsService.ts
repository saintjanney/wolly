import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, type EpubBook, type Purchase } from '@wolly/schema';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';

export type TimeRangePreset = 'month' | 'quarter' | 'year' | 'custom';

export interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeFilter {
  preset: TimeRangePreset;
  customRange?: CustomDateRange;
}

interface RevenueDataPoint {
  date: string;
  revenue: number;
  sales: number;
}

interface SalesByChannel {
  channel: string;
  sales: number;
  revenue: number;
}

interface BookPerformance {
  bookId: string;
  title: string;
  sales: number;
  revenue: number;
  views: number;
  downloads: number;
  rating: number;
}

interface GeographicData {
  country: string;
  sales: number;
  revenue: number;
}

// Helper function to convert DateRangeFilter to actual date range
function getDateRangeFromFilter(filter: DateRangeFilter): { startDate: Date; endDate: Date } {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today

  if (filter.preset === 'custom' && filter.customRange) {
    return {
      startDate: filter.customRange.startDate,
      endDate: filter.customRange.endDate,
    };
  }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (filter.preset === 'month') {
    startDate.setDate(1);
  } else if (filter.preset === 'quarter') {
    const currentMonth = startDate.getMonth();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    startDate.setMonth(quarterStartMonth);
    startDate.setDate(1);
  } else if (filter.preset === 'year') {
    startDate.setMonth(0);
    startDate.setDate(1);
  }

  return { startDate, endDate: now };
}

/** A single sale, normalised from a `purchases` document. */
interface NormalisedSale {
  bookId: string;
  /** Amount in major currency units (purchases store minor units). */
  amount: number;
  date: Date;
  countryCode: string;
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function dayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Real Firestore-backed analytics. Sales/revenue are aggregated from the
 * `purchases` collection (written by the reader on checkout) scoped to the
 * creator's own books in `epubs`. Per-book `views`/`downloads`/`rating` come
 * from the book document.
 *
 * Note: purchase amounts are summed in their stored currency's major unit; a
 * cross-currency conversion layer is out of scope. Geographic data depends on
 * the reader recording `countryCode` on purchases.
 */
export class AnalyticsService {
  private static async getCreatorBooks(userId: string): Promise<EpubBook[]> {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.EPUBS), where('ownerUserId', '==', userId)),
    );
    return snap.docs.map((d) => ({ ...(d.data() as EpubBook), id: d.id }));
  }

  private static async getSalesForBooks(
    bookIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<NormalisedSale[]> {
    if (bookIds.length === 0) return [];
    const sales: NormalisedSale[] = [];
    // Firestore `in` queries are limited to 30 values; chunk and filter by date
    // client-side to avoid requiring a composite index.
    for (const ids of chunk(bookIds, 10)) {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.PURCHASES), where('bookId', 'in', ids)),
      );
      snap.forEach((doc) => {
        const p = doc.data() as Purchase;
        const date = toDate(p.purchasedAt);
        if (date >= startDate && date <= endDate) {
          sales.push({
            bookId: p.bookId,
            amount: (p.amountInPesewas ?? 0) / 100,
            date,
            countryCode: p.countryCode || 'Unknown',
          });
        }
      });
    }
    return sales;
  }

  private static resolveBookIds(books: EpubBook[], bookId?: string): string[] {
    if (bookId) return books.some((b) => b.id === bookId) ? [bookId] : [];
    return books.map((b) => b.id);
  }

  static async getRevenueData(
    userId: string,
    filter: DateRangeFilter,
    bookId?: string,
  ): Promise<RevenueDataPoint[]> {
    const { startDate, endDate } = getDateRangeFromFilter(filter);
    const books = await AnalyticsService.getCreatorBooks(userId);
    const sales = await AnalyticsService.getSalesForBooks(
      AnalyticsService.resolveBookIds(books, bookId),
      startDate,
      endDate,
    );

    const byDay = new Map<string, { revenue: number; sales: number }>();
    for (const sale of sales) {
      const key = dayKey(sale.date);
      const entry = byDay.get(key) ?? { revenue: 0, sales: 0 };
      entry.revenue += sale.amount;
      entry.sales += 1;
      byDay.set(key, entry);
    }

    // Emit a continuous series so the chart has no gaps.
    const data: RevenueDataPoint[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(endDate);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      const key = dayKey(cursor);
      const entry = byDay.get(key) ?? { revenue: 0, sales: 0 };
      data.push({ date: key, revenue: entry.revenue, sales: entry.sales });
      cursor.setDate(cursor.getDate() + 1);
    }
    return data;
  }

  static async getGeographicData(
    userId: string,
    filter: DateRangeFilter,
    bookId?: string,
  ): Promise<GeographicData[]> {
    const { startDate, endDate } = getDateRangeFromFilter(filter);
    const books = await AnalyticsService.getCreatorBooks(userId);
    const sales = await AnalyticsService.getSalesForBooks(
      AnalyticsService.resolveBookIds(books, bookId),
      startDate,
      endDate,
    );

    const byCountry = new Map<string, { sales: number; revenue: number }>();
    for (const sale of sales) {
      const entry = byCountry.get(sale.countryCode) ?? { sales: 0, revenue: 0 };
      entry.sales += 1;
      entry.revenue += sale.amount;
      byCountry.set(sale.countryCode, entry);
    }

    return Array.from(byCountry.entries())
      .map(([country, v]) => ({ country, sales: v.sales, revenue: v.revenue }))
      .sort((a, b) => b.sales - a.sales);
  }

  static async getAllBooksPerformance(
    userId: string,
    filter?: DateRangeFilter,
  ): Promise<BookPerformance[]> {
    const { startDate, endDate } = filter
      ? getDateRangeFromFilter(filter)
      : { startDate: new Date(0), endDate: new Date() };
    const books = await AnalyticsService.getCreatorBooks(userId);
    const sales = await AnalyticsService.getSalesForBooks(
      books.map((b) => b.id),
      startDate,
      endDate,
    );

    const byBook = new Map<string, { sales: number; revenue: number }>();
    for (const sale of sales) {
      const entry = byBook.get(sale.bookId) ?? { sales: 0, revenue: 0 };
      entry.sales += 1;
      entry.revenue += sale.amount;
      byBook.set(sale.bookId, entry);
    }

    return books
      .map((book) => {
        const agg = byBook.get(book.id) ?? { sales: 0, revenue: 0 };
        return {
          bookId: book.id,
          title: book.title,
          sales: agg.sales,
          revenue: agg.revenue,
          views: book.views ?? 0,
          downloads: book.downloads ?? 0,
          rating: book.rating ?? 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  static async getOverviewStats(
    userId: string,
    filter: DateRangeFilter,
  ): Promise<{
    totalRevenue: number;
    totalSales: number;
    averageRating: number;
    activeBooks: number;
  }> {
    const { startDate, endDate } = getDateRangeFromFilter(filter);
    const books = await AnalyticsService.getCreatorBooks(userId);
    const sales = await AnalyticsService.getSalesForBooks(
      books.map((b) => b.id),
      startDate,
      endDate,
    );

    const published = books.filter((b) => b.isPublished);
    const ratings = published.map((b) => b.rating ?? 0).filter((r) => r > 0);

    return {
      totalRevenue: sales.reduce((sum, s) => sum + s.amount, 0),
      totalSales: sales.length,
      averageRating: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0,
      activeBooks: published.length,
    };
  }

  static async getBookPerformance(
    userId: string,
    bookId: string,
  ): Promise<BookPerformance | null> {
    const all = await AnalyticsService.getAllBooksPerformance(userId);
    return all.find((b) => b.bookId === bookId) ?? null;
  }

  static async getSalesData(
    userId: string,
    filter: DateRangeFilter,
    bookId?: string,
  ): Promise<SalesByChannel[]> {
    // The reader sells directly; there is no per-channel breakdown yet, so all
    // sales are attributed to the Direct channel.
    const books = await AnalyticsService.getCreatorBooks(userId);
    const { startDate, endDate } = getDateRangeFromFilter(filter);
    const sales = await AnalyticsService.getSalesForBooks(
      AnalyticsService.resolveBookIds(books, bookId),
      startDate,
      endDate,
    );
    return [
      {
        channel: 'Direct',
        sales: sales.length,
        revenue: sales.reduce((sum, s) => sum + s.amount, 0),
      },
    ];
  }
}
