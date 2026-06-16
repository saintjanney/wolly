import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PaymentMethod {
  id: string;
  display_name: string;
}

export class PaymentMethodService {
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const snapshot = await getDocs(collection(db, 'payment_methods'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        display_name: doc.data().display_name
      }));
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }
}
