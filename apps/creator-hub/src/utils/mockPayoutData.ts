import { Payment } from '@/types/book';

/**
 * Generate mock payout history data
 * Creates realistic historical payment records for the last 12 months
 */
export function generateMockPayoutData(userId: string = 'mock-user-id', currency: string = 'USD'): Payment[] {
  const payments: Payment[] = [];
  const now = new Date();
  
  // Generate 12 months of historical data
  for (let i = 11; i >= 0; i--) {
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 0); // Last day of month
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1); // First day of month
    
    // Skip future months
    if (periodEnd > now) continue;
    
    // Determine status based on how recent the payment is
    let status: 'pending' | 'processing' | 'completed' | 'failed';
    let processedAt: Date | undefined;
    let paidAt: Date | undefined;
    
    if (i === 0) {
      // Current month - pending
      status = 'pending';
    } else if (i === 1) {
      // Last month - processing
      status = 'processing';
      processedAt = new Date(now.getFullYear(), now.getMonth(), 5);
    } else if (i === 4 && Math.random() > 0.9) {
      // Occasional failed payment
      status = 'failed';
      processedAt = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 5);
    } else {
      // Older months - completed
      status = 'completed';
      processedAt = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 5);
      paidAt = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 7);
    }
    
    // Generate realistic sales data
    const totalSales = Math.floor(Math.random() * 200) + 50; // 50-250 sales
    const averagePrice = 9.99;
    const totalRevenue = totalSales * averagePrice;
    const royaltyRate = 0.70; // 70% royalty
    const platformFee = totalRevenue * 0.05; // 5% platform fee
    const grossRoyalty = totalRevenue * royaltyRate;
    const netAmount = grossRoyalty - platformFee;
    
    // Determine payment type
    let type: 'royalty' | 'bonus' | 'refund' | 'adjustment' = 'royalty';
    let amount = netAmount;
    
    // Add occasional bonuses or adjustments
    if (i === 6 && Math.random() > 0.7) {
      type = 'bonus';
      amount = 500; // Bonus payment
    } else if (i === 8 && Math.random() > 0.8) {
      type = 'adjustment';
      amount = -25.50; // Small adjustment
    }
    
    const payment: Payment = {
      id: `payment-${periodStart.getTime()}`,
      userId,
      bookId: `book-${Math.floor(Math.random() * 3) + 1}`, // Random book ID
      amount: Math.round(amount * 100) / 100,
      currency: currency,
      type,
      status,
      periodStart,
      periodEnd,
      salesData: {
        totalSales,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        royaltyRate,
        platformFee: Math.round(platformFee * 100) / 100,
        netAmount: Math.round(netAmount * 100) / 100,
      },
      paymentMethod: {
        type: 'bank_transfer',
        details: {
          account: '****1234',
        },
      },
      createdAt: new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1),
      processedAt,
      paidAt,
    };
    
    payments.push(payment);
  }
  
  // Add one more pending payment for next month (estimated)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  
  // Estimate based on current month's performance
  const estimatedSales = Math.floor(Math.random() * 150) + 80;
  const estimatedRevenue = estimatedSales * 9.99;
  const estimatedRoyalty = estimatedRevenue * 0.70;
  const estimatedFee = estimatedRevenue * 0.05;
  const estimatedNet = estimatedRoyalty - estimatedFee;
  
  payments.unshift({
    id: `payment-next-${nextMonthStart.getTime()}`,
    userId,
    bookId: 'book-1',
    amount: Math.round(estimatedNet * 100) / 100,
    currency: 'USD',
    type: 'royalty',
    status: 'pending',
    periodStart: nextMonthStart,
    periodEnd: nextMonthEnd,
    salesData: {
      totalSales: estimatedSales,
      totalRevenue: Math.round(estimatedRevenue * 100) / 100,
      royaltyRate: 0.70,
      platformFee: Math.round(estimatedFee * 100) / 100,
      netAmount: Math.round(estimatedNet * 100) / 100,
    },
    paymentMethod: {
      type: 'bank_transfer',
      details: {
        account: '****1234',
      },
    },
    createdAt: new Date(),
  });
  
  return payments.reverse(); // Most recent first
}

/**
 * Calculate payout statistics from payment history
 */
export function calculatePayoutStats(payments: Payment[]) {
  const completed = payments.filter(p => p.status === 'completed');
  const pending = payments.filter(p => p.status === 'pending' || p.status === 'processing');
  
  const totalEarnings = completed.reduce((sum, p) => sum + p.amount, 0);
  const pendingBalance = pending.reduce((sum, p) => sum + p.amount, 0);
  
  // Get next pending payment (should be sorted most recent first)
  const nextPayout = pending[0];
  
  return {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    pendingBalance: Math.round(pendingBalance * 100) / 100,
    nextPayoutAmount: nextPayout ? Math.round(nextPayout.amount * 100) / 100 : 0,
    lifetimePayouts: completed.length,
    totalPending: pending.length,
  };
}

/**
 * Get mock book titles for payment details
 */
export function getBookTitle(bookId: string): string {
  const titles: Record<string, string> = {
    'book-1': 'The Art of Digital Storytelling',
    'book-2': 'Modern Web Development',
    'book-3': 'Creative Writing Masterclass',
  };
  return titles[bookId] || 'Untitled Book';
}
