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
    // First day of current month
    startDate.setDate(1);
  } else if (filter.preset === 'quarter') {
    // First day of current quarter
    const currentMonth = startDate.getMonth();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    startDate.setMonth(quarterStartMonth);
    startDate.setDate(1);
  } else if (filter.preset === 'year') {
    // January 1st of current year
    startDate.setMonth(0);
    startDate.setDate(1);
  }

  return { startDate, endDate: now };
}

export class AnalyticsService {
  static async getRevenueData(
    filter: DateRangeFilter,
    _bookId?: string
  ): Promise<RevenueDataPoint[]> {
    // Mock data - replace with real Firestore queries later
    const { startDate, endDate } = getDateRangeFromFilter(filter);
    const data: RevenueDataPoint[] = [];
    
    // Calculate days between start and end date
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.random() * 100 + 50,
        sales: Math.floor(Math.random() * 20 + 5),
      });
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(data), 300);
    });
  }

  static async getSalesData(
    _filter: DateRangeFilter,
    _bookId?: string
  ): Promise<SalesByChannel[]> {
    // Mock data
    const channels: SalesByChannel[] = [
      { channel: 'Amazon', sales: 1250, revenue: 8750 },
      { channel: 'Apple Books', sales: 890, revenue: 6230 },
      { channel: 'Google Play', sales: 650, revenue: 4550 },
      { channel: 'Kobo', sales: 320, revenue: 2240 },
      { channel: 'Barnes & Noble', sales: 180, revenue: 1260 },
      { channel: 'Direct', sales: 450, revenue: 3150 },
    ];

    return new Promise((resolve) => {
      setTimeout(() => resolve(channels), 200);
    });
  }

  static async getBookPerformance(bookId: string): Promise<BookPerformance | null> {
    // Mock data - replace with real query later
    const performance: BookPerformance = {
      bookId,
      title: 'Sample Book Title',
      sales: 1250,
      revenue: 8750,
      views: 5600,
      downloads: 890,
      rating: 4.5,
    };

    return new Promise((resolve) => {
      setTimeout(() => resolve(performance), 200);
    });
  }

  static async getAllBooksPerformance(_userId: string, _filter?: DateRangeFilter): Promise<BookPerformance[]> {
    // Mock data - replace with real query later
    const performances: BookPerformance[] = [
      {
        bookId: '1',
        title: 'The Digital Revolution',
        sales: 1250,
        revenue: 8750,
        views: 5600,
        downloads: 890,
        rating: 4.5,
      },
      {
        bookId: '2',
        title: 'Creative Writing Guide',
        sales: 890,
        revenue: 6230,
        views: 4200,
        downloads: 650,
        rating: 4.7,
      },
      {
        bookId: '3',
        title: 'Business Strategy 101',
        sales: 650,
        revenue: 4550,
        views: 3800,
        downloads: 520,
        rating: 4.3,
      },
    ];

    return new Promise((resolve) => {
      setTimeout(() => resolve(performances), 300);
    });
  }

  static async getGeographicData(
    _filter: DateRangeFilter,
    _bookId?: string
  ): Promise<GeographicData[]> {
    // Mock data
    const data: GeographicData[] = [
      { country: 'United States', sales: 1250, revenue: 8750 },
      { country: 'United Kingdom', sales: 450, revenue: 3150 },
      { country: 'Canada', sales: 320, revenue: 2240 },
      { country: 'Australia', sales: 280, revenue: 1960 },
      { country: 'Germany', sales: 190, revenue: 1330 },
      { country: 'France', sales: 150, revenue: 1050 },
    ];

    return new Promise((resolve) => {
      setTimeout(() => resolve(data), 250);
    });
  }

  static async getOverviewStats(_userId: string, _filter: DateRangeFilter): Promise<{
    totalRevenue: number;
    totalSales: number;
    averageRating: number;
    activeBooks: number;
  }> {
    // Mock data - replace with aggregated Firestore query later
    const stats = {
      totalRevenue: 26150,
      totalSales: 3740,
      averageRating: 4.5,
      activeBooks: 12,
    };

    return new Promise((resolve) => {
      setTimeout(() => resolve(stats), 200);
    });
  }
}

