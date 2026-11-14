import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PaymentSchedule {
  id: string;
  display_name: string;
  description: string;
  value: string;
  sort_order: number;
}

export class PaymentScheduleService {
  static async getPaymentSchedules(): Promise<PaymentSchedule[]> {
    try {
      const snapshot = await getDocs(collection(db, 'payment_schedules'));
      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<PaymentSchedule, 'id'>
      }));
      
      // Sort by sort_order
      return schedules.sort((a, b) => a.sort_order - b.sort_order);
    } catch (error) {
      console.error('Error fetching payment schedules:', error);
      throw error;
    }
  }
}
