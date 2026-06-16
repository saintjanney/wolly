/**
 * Utility functions for payout calculations and formatting
 */

/**
 * Calculate the first Monday of the next month
 * @returns Date object representing the first Monday of next month
 */
export function getNextPayoutDate(): Date {
  const now = new Date();
  
  // Get the first day of next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  // Find the first Monday
  // getDay() returns 0 (Sunday) to 6 (Saturday)
  const dayOfWeek = nextMonth.getDay();
  
  // Calculate days to add to get to Monday (1)
  // If it's already Monday (1), add 0 days
  // If it's Sunday (0), add 1 day
  // If it's Tuesday (2), add 6 days to get to next Monday
  let daysToAdd = 0;
  if (dayOfWeek === 0) {
    daysToAdd = 1; // Sunday -> Monday
  } else if (dayOfWeek === 1) {
    daysToAdd = 0; // Already Monday
  } else {
    daysToAdd = 8 - dayOfWeek; // Tuesday-Saturday -> Next Monday
  }
  
  nextMonth.setDate(nextMonth.getDate() + daysToAdd);
  return nextMonth;
}

/**
 * Format a date as a readable string
 * @param date - Date to format
 * @param format - Format style ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const options: Intl.DateTimeFormatOptions = 
    format === 'short' 
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : format === 'long'
      ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format currency with proper symbol and formatting
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get Tailwind CSS classes for payment status badges
 * @param status - Payment status
 * @returns Object with text and background color classes
 */
export function getPayoutStatusColor(status: 'pending' | 'processing' | 'completed' | 'failed'): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status) {
    case 'completed':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Completed',
      };
    case 'processing':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Processing',
      };
    case 'pending':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Pending',
      };
    case 'failed':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Failed',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        label: 'Unknown',
      };
  }
}

/**
 * Get label for payment type
 * @param type - Payment type
 * @returns Human-readable label
 */
export function getPaymentTypeLabel(type: 'royalty' | 'bonus' | 'refund' | 'adjustment'): string {
  switch (type) {
    case 'royalty':
      return 'Royalty Payment';
    case 'bonus':
      return 'Bonus Payment';
    case 'refund':
      return 'Refund';
    case 'adjustment':
      return 'Adjustment';
    default:
      return 'Payment';
  }
}

/**
 * Calculate days until a given date
 * @param targetDate - Target date
 * @returns Number of days until target date
 */
export function getDaysUntil(targetDate: Date): number {
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format a date range for display
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = formatDate(startDate, 'short');
  const end = formatDate(endDate, 'short');
  return `${start} - ${end}`;
}
