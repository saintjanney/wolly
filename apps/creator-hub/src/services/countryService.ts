import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Country } from '@/types/creator';

export class CountryService {
  private static readonly COLLECTION_NAME = 'countries';

  /**
   * Get all active countries, sorted by sortOrder and name
   */
  static async getCountries(includeInactive = false): Promise<Country[]> {
    try {
      console.log('[CountryService] Starting to fetch countries from Firestore...');
      console.log('[CountryService] Collection name:', this.COLLECTION_NAME);
      console.log('[CountryService] DB instance:', db ? 'Initialized' : 'Not initialized');
      
      // Use a simple query without orderBy to avoid index requirements
      // We'll filter and sort in JavaScript instead
      const countriesCollection = collection(db, this.COLLECTION_NAME);
      console.log('[CountryService] Collection reference created');
      
      const q = query(countriesCollection);
      console.log('[CountryService] Query created, executing...');
      
      const querySnapshot = await getDocs(q);
      console.log('[CountryService] Query executed, docs returned:', querySnapshot.size);
      console.log('[CountryService] Docs:', querySnapshot.docs.map(d => ({ id: d.id, data: d.data() })));
      
      // Convert to Country objects
      let countries = querySnapshot.docs.map(doc => {
        try {
          return this.convertFirestoreDoc(doc);
        } catch (convertError) {
          console.error(`[CountryService] Error converting doc ${doc.id}:`, convertError);
          return null;
        }
      }).filter((country): country is Country => country !== null);
      
      console.log('[CountryService] Converted countries:', countries.length);
      
      // Filter by active status if needed
      if (!includeInactive) {
        const beforeFilter = countries.length;
        countries = countries.filter(country => country.isActive);
        console.log(`[CountryService] Filtered inactive: ${beforeFilter} -> ${countries.length}`);
      }
      
      // Sort by sortOrder first, then by name as a secondary sort
      const sorted = countries.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });
      
      console.log('[CountryService] Returning', sorted.length, 'countries');
      return sorted;
    } catch (error: unknown) {
      console.error('[CountryService] Error fetching countries:', error);
      console.error('[CountryService] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      // If it's a permission error, provide more helpful message
      const firebaseError = error as { code?: string };
      if (firebaseError?.code === 'permission-denied') {
        throw new Error('Permission denied: Check Firestore security rules');
      }
      
      throw error;
    }
  }

  /**
   * Get popular countries (commonly selected)
   */
  static async getPopularCountries(): Promise<Country[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('isActive', '==', true),
        where('isPopular', '==', true),
        orderBy('sortOrder', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
    } catch (error) {
      console.error('[CountryService] Error fetching popular countries:', error);
      throw error;
    }
  }

  /**
   * Get a single country by its code
   */
  static async getCountryByCode(countryCode: string): Promise<Country | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, countryCode.toUpperCase());
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return this.convertFirestoreDoc(docSnap);
    } catch (error) {
      console.error(`[CountryService] Error fetching country ${countryCode}:`, error);
      throw error;
    }
  }

  /**
   * Get countries by continent
   */
  static async getCountriesByContinent(continent: string): Promise<Country[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('isActive', '==', true),
        where('continent', '==', continent),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreDoc(doc));
    } catch (error) {
      console.error(`[CountryService] Error fetching countries for continent ${continent}:`, error);
      throw error;
    }
  }

  /**
   * Convert Firestore document to Country object
   */
  private static convertFirestoreDoc(doc: { id: string; data: () => Record<string, unknown> }): Country {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = doc.data() as any;
    
    // Helper to safely convert Firestore Timestamp to Date
    const toDate = (timestamp: unknown): Date => {
      if (!timestamp) return new Date();
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
        return (timestamp as { toDate: () => Date }).toDate();
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp);
      }
      return new Date();
    };
    
    return {
      id: doc.id,
      code: (typeof data.code === 'string' ? data.code : doc.id) || doc.id,
      name: data.name || '',
      nameNative: data.nameNative,
      flag: data.flag || '🌍',
      continent: data.continent || '',
      region: data.region || '',
      subregion: data.subregion,
      currency: data.currency || { code: 'USD', symbol: '$', name: 'US Dollar' },
      vatRate: data.vatRate,
      salesTaxRate: data.salesTaxRate,
      minAge: data.minAge ?? 13,
      gdprCompliant: data.gdprCompliant ?? false,
      requiresTaxId: data.requiresTaxId ?? false,
      taxIdFormat: data.taxIdFormat,
      requiresVatNumber: data.requiresVatNumber ?? false,
      isbnAgency: data.isbnAgency,
      requiresIsbn: data.requiresIsbn ?? false,
      distributionChannels: data.distributionChannels || {
        amazon: true,
        apple: true,
        google: true,
        kobo: true,
        barnesNoble: true,
        direct: true,
      },
      publishingRestrictions: data.publishingRestrictions,
      timezones: data.timezones || [],
      primaryLanguage: data.primaryLanguage || 'en',
      languages: data.languages || [data.primaryLanguage || 'en'],
      dateFormat: data.dateFormat || 'MM/DD/YYYY',
      numberFormat: data.numberFormat || '1,234.56',
      supportedPaymentMethods: data.supportedPaymentMethods || ['stripe', 'paypal', 'bank_transfer'],
      bankTransferDetails: data.bankTransferDetails,
      stats: data.stats ? {
        ...data.stats,
        lastUpdated: toDate(data.stats.lastUpdated),
      } : undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
      isPopular: data.isPopular ?? false,
      notes: data.notes,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }
}

