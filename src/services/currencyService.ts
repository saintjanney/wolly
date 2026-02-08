import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SupportedCurrency {
  id: string;
  currency_code: string;
  display_name: string;
  symbol: string;
  payout_threshold: number;
  is_active: boolean;
  sort_order: number;
}

export class CurrencyService {
  static async getSupportedCurrencies(): Promise<SupportedCurrency[]> {
    try {
      const snapshot = await getDocs(collection(db, 'supported_currencies'));
      const currencies = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SupportedCurrency))
        .filter(c => c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
      return currencies;
    } catch (error) {
      console.error('Error fetching supported currencies:', error);
      throw error;
    }
  }
  
  static async getCurrencyById(currencyId: string): Promise<SupportedCurrency | null> {
    try {
      const docRef = doc(db, 'supported_currencies', currencyId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as SupportedCurrency;
    } catch (error) {
      console.error('Error fetching currency by ID:', error);
      return null;
    }
  }
}
