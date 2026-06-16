'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { AnalyticsService, DateRangeFilter } from '@/services/analyticsService';
import { BookService } from '@/services/bookService';
import { PlatformBook } from '@/types/book';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '@/components/ui/StatCard';
import DateRangeToggle from '@/components/ui/DateRangeToggle';
import { formatCurrency } from '@/utils/currency';
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  StarIcon,
  BookOpenIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import BookCreationDialog from '@/components/book-creation/BookCreationDialog';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();
  const [revenueDateFilter, setRevenueDateFilter] = useState<DateRangeFilter>({
    preset: 'month'
  });
  const [geographicDateFilter, setGeographicDateFilter] = useState<DateRangeFilter>({
    preset: 'month'
  });
  const [bookPerformanceDateFilter, setBookPerformanceDateFilter] = useState<DateRangeFilter>({
    preset: 'month'
  });
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [books, setBooks] = useState<PlatformBook[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [geographicLoading, setGeographicLoading] = useState(false);
  const [bookPerformanceLoading, setBookPerformanceLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number; sales: number }[]>([]);
  const [bookPerformance, setBookPerformance] = useState<{ bookId: string; title: string; sales: number; revenue: number; views: number; downloads: number; rating: number }[]>([]);
  const [geographicData, setGeographicData] = useState<{ country: string; sales: number; revenue: number }[]>([]);
  const [overviewStats, setOverviewStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    averageRating: 0,
    activeBooks: 0,
  });
  const [isCreateBookDialogOpen, setIsCreateBookDialogOpen] = useState(false);

  // Set page title
  useEffect(() => {
    setPageTitle('Dashboard', 'Track your book performance and sales metrics');
  }, [setPageTitle]);

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    try {
      const userBooks = await BookService.getUserBooks(user.uid);
      setBooks(userBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }, [user]);

  const loadOverviewAndRevenue = useCallback(async () => {
    if (!user) return;
    try {
      setOverviewLoading(true);
      setRevenueLoading(true);
      const [stats, revenue] = await Promise.all([
        AnalyticsService.getOverviewStats(user.uid, revenueDateFilter),
        AnalyticsService.getRevenueData(user.uid, revenueDateFilter, selectedBookId === 'all' ? undefined : selectedBookId),
      ]);
      setOverviewStats(stats);
      setRevenueData(revenue);
    } catch (error) {
      console.error('Error loading overview/revenue:', error);
    } finally {
      setOverviewLoading(false);
      setRevenueLoading(false);
    }
  }, [user, revenueDateFilter, selectedBookId]);

  const loadGeographic = useCallback(async () => {
    if (!user) return;
    try {
      setGeographicLoading(true);
      const geo = await AnalyticsService.getGeographicData(user.uid, geographicDateFilter, selectedBookId === 'all' ? undefined : selectedBookId);
      setGeographicData(geo);
    } catch (error) {
      console.error('Error loading geographic data:', error);
    } finally {
      setGeographicLoading(false);
    }
  }, [user, geographicDateFilter, selectedBookId]);

  const loadBookPerformance = useCallback(async () => {
    if (!user) return;
    try {
      setBookPerformanceLoading(true);
      const performance = await AnalyticsService.getAllBooksPerformance(user.uid, bookPerformanceDateFilter);
      setBookPerformance(performance);
    } catch (error) {
      console.error('Error loading book performance:', error);
    } finally {
      setBookPerformanceLoading(false);
    }
  }, [user, bookPerformanceDateFilter]);

  // Initial load
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadInitialData();
      loadOverviewAndRevenue();
      loadGeographic();
      loadBookPerformance();
    }
  }, [user, authLoading, router, loadInitialData, loadOverviewAndRevenue, loadGeographic, loadBookPerformance]);

  // Revenue + Overview updates
  useEffect(() => {
    if (user) loadOverviewAndRevenue();
  }, [revenueDateFilter, selectedBookId, loadOverviewAndRevenue, user]);

  // Geographic updates
  useEffect(() => {
    if (user) loadGeographic();
  }, [geographicDateFilter, selectedBookId, loadGeographic, user]);

  // Book Performance updates
  useEffect(() => {
    if (user) loadBookPerformance();
  }, [bookPerformanceDateFilter, loadBookPerformance, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userCurrency = user.currency || 'USD';

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-x-hidden">
      <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 py-4">

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div className="relative">
            {overviewLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <StatCard
              name="Total Revenue"
              value={formatCurrency(overviewStats.totalRevenue, userCurrency)}
              change="+12% this month"
              changeType="positive"
              icon={CurrencyDollarIcon}
              color="purple"
            />
          </div>
          <div className="relative">
            {overviewLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <StatCard
              name="Total Sales"
              value={overviewStats.totalSales.toLocaleString()}
              change="+8% this month"
              changeType="positive"
              icon={ChartBarIcon}
              color="blue"
            />
          </div>
          <StatCard
            name="Average Rating"
            value={overviewStats.averageRating.toFixed(1)}
            change="Based on 1,240 reviews"
            changeType="neutral"
            icon={StarIcon}
            color="yellow"
          />
          <StatCard
            name="Active Books"
            value={overviewStats.activeBooks}
            change={`${books.filter(b => b.isPublished).length} published`}
            changeType="neutral"
            icon={BookOpenIcon}
            color="green"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
            {revenueLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
              <DateRangeToggle
                value={revenueDateFilter}
                onChange={setRevenueDateFilter}
              />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value), userCurrency, { decimals: 2 }), 'Revenue']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString();
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
              </div>

          {/* Geographic Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
            {geographicLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <DateRangeToggle
                  value={geographicDateFilter}
                  onChange={setGeographicDateFilter}
                  className="w-full sm:w-auto"
                />
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="text-xs border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                >
                  <option value="all">All Books</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart 
                data={geographicData.slice(0, 7)} 
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="country" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 13 }}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString(), 'Sales']}
                />
                <Legend />
                <Bar dataKey="sales" fill="#8b5cf6" name="Sales" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Book Performance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 relative">
          {bookPerformanceLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Book Performance</h3>
            <DateRangeToggle
              value={bookPerformanceDateFilter}
              onChange={setBookPerformanceDateFilter}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Book
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookPerformance.map((book) => (
                  <tr key={book.bookId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{book.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.sales.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(book.revenue, userCurrency)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.views.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.downloads.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{book.rating}</span>
                        <StarIcon className="h-4 w-4 text-yellow-400 ml-1" />
          </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsCreateBookDialogOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
        aria-label="Create new book"
      >
        <PlusIcon className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Book Creation Dialog */}
      <BookCreationDialog
        isOpen={isCreateBookDialogOpen}
        onClose={() => setIsCreateBookDialogOpen(false)}
      />
    </div>
  );
}
