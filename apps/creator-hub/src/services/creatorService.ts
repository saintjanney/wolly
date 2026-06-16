import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/book';
import { CreatorOnboarding, Genre } from '@/types/creator';

// Mock genres data - in production this would come from Firestore
const mockGenres: Genre[] = [
  { id: '1', name: 'Fiction', slug: 'fiction', description: 'Imaginative storytelling', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: 'Non-Fiction', slug: 'non-fiction', description: 'Factual and educational content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '3', name: 'Romance', slug: 'romance', description: 'Love stories and relationships', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '4', name: 'Mystery & Thriller', slug: 'mystery-thriller', description: 'Suspenseful and mysterious stories', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '5', name: 'Science Fiction', slug: 'science-fiction', description: 'Futuristic and scientific themes', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '6', name: 'Fantasy', slug: 'fantasy', description: 'Magical and supernatural elements', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '7', name: 'Horror', slug: 'horror', description: 'Scary and suspenseful content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '8', name: 'Biography & Memoir', slug: 'biography-memoir', description: 'Personal life stories', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '9', name: 'Self-Help', slug: 'self-help', description: 'Personal development and improvement', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '10', name: 'Business & Economics', slug: 'business-economics', description: 'Professional and economic content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '11', name: 'History', slug: 'history', description: 'Historical events and periods', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '12', name: 'Science & Technology', slug: 'science-technology', description: 'Scientific and technological content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '13', name: 'Health & Fitness', slug: 'health-fitness', description: 'Wellness and physical health', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '14', name: 'Travel', slug: 'travel', description: 'Travel guides and experiences', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '15', name: 'Cooking', slug: 'cooking', description: 'Recipes and culinary content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '16', name: 'Poetry', slug: 'poetry', description: 'Poetic and lyrical content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '17', name: 'Drama', slug: 'drama', description: 'Dramatic and theatrical content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '18', name: 'Comedy', slug: 'comedy', description: 'Humorous and entertaining content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '19', name: 'Adventure', slug: 'adventure', description: 'Exciting and adventurous stories', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '20', name: 'Educational', slug: 'educational', description: 'Learning and instructional content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
];

export class CreatorService {
  static async getGenres(): Promise<Genre[]> {
    try {
      // For now, return mock data
      // Later: const querySnapshot = await getDocs(collection(db, 'genres'));
      // return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Genre));
      
      return mockGenres;
    } catch (error) {
      console.error('Error fetching genres:', error);
      throw error;
    }
  }

  static async addCustomGenre(genreName: string): Promise<Genre> {
    try {
      const newGenre: Genre = {
        id: `custom-${Date.now()}`,
        name: genreName,
        slug: genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `Custom genre: ${genreName}`,
        isActive: true,
        bookCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // For now, just return the new genre
      // Later: const docRef = await addDoc(collection(db, 'genres'), newGenre);
      // return { ...newGenre, id: docRef.id };

      return newGenre;
    } catch (error) {
      console.error('Error adding custom genre:', error);
      throw error;
    }
  }

  static async completeOnboarding(
    userId: string, 
    onboardingData: CreatorOnboarding,
    userInfo?: { email?: string; displayName?: string; photoURL?: string }
  ): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      
      // Check if user document exists
      const userDocSnap = await getDoc(userDoc);
      const existingDataRaw = userDocSnap.exists() ? userDocSnap.data() : {};
      
      // Clean existing data to remove undefined/null values
      // Explicitly exclude photoURL if it's undefined/null/empty
      const existingData: Record<string, unknown> = {};
      if (existingDataRaw) {
        for (const [key, value] of Object.entries(existingDataRaw)) {
          // Skip photoURL entirely if it's undefined/null/empty
          if (key === 'photoURL') {
            if (value && typeof value === 'string' && value.trim().length > 0) {
              existingData[key] = value.trim();
            }
            // Don't include photoURL if invalid
            continue;
          }
          
          if (value !== undefined && value !== null) {
            existingData[key] = value;
          }
        }
      }
      
      // Get country info for default values
      const countryCode = onboardingData.countryOfResidence;
      const defaultCurrency = 'USD';
      const defaultTimezone = 'America/New_York';
      const defaultLanguage = 'English';
      
      // Prepare user data - merge with existing data if document exists
      const userDataRaw: Record<string, unknown> = {};
      
      // Core required fields
      userDataRaw.uid = existingData.uid || userId;
      userDataRaw.email = existingData.email || userInfo?.email || '';
      userDataRaw.displayName = existingData.displayName || userInfo?.displayName || `${onboardingData.firstName} ${onboardingData.lastName}`;
      
      // Add photoURL only if it has a valid non-empty string value
      // Check both existing data and userInfo, but ensure it's a valid string
      let photoURLValue: string | undefined = undefined;
      if (existingData.photoURL && typeof existingData.photoURL === 'string' && existingData.photoURL.trim().length > 0) {
        photoURLValue = existingData.photoURL.trim();
      } else if (userInfo?.photoURL && typeof userInfo.photoURL === 'string' && userInfo.photoURL.trim().length > 0) {
        photoURLValue = userInfo.photoURL.trim();
      }
      
      // Only add photoURL to userDataRaw if we have a valid value
      if (photoURLValue) {
        userDataRaw.photoURL = photoURLValue;
      }
      // Explicitly do NOT add photoURL to userDataRaw if there's no valid value
      
      // Onboarding required fields
      userDataRaw.firstName = onboardingData.firstName;
      userDataRaw.lastName = onboardingData.lastName;
      userDataRaw.dateOfBirth = onboardingData.dateOfBirth;
      userDataRaw.countryOfResidence = onboardingData.countryOfResidence;
      userDataRaw.selectedGenres = onboardingData.selectedGenres;
      userDataRaw.customGenres = onboardingData.customGenres;
      
      // Onboarding status
      userDataRaw.onboardingCompleted = true;
      userDataRaw.onboardingStep = 3;
      
      // Optional onboarding fields - only add if they have values
      if (onboardingData.phoneNumber?.trim()) {
        userDataRaw.phoneNumber = onboardingData.phoneNumber.trim();
      }
      if (onboardingData.penName?.trim()) {
        userDataRaw.penName = onboardingData.penName.trim();
      }
      if (onboardingData.bio?.trim()) {
        userDataRaw.bio = onboardingData.bio.trim();
      }
      if (onboardingData.website?.trim()) {
        userDataRaw.website = onboardingData.website.trim();
      }
      
      // Default settings based on country or existing values
      userDataRaw.country = existingData?.country || countryCode;
      userDataRaw.timezone = existingData?.timezone || defaultTimezone;
      userDataRaw.language = existingData?.language || defaultLanguage;
      userDataRaw.currency = existingData?.currency || defaultCurrency;
      
      // Preserve existing profile fields
      userDataRaw.specialties = existingData?.specialties || [];
      userDataRaw.writingExperience = existingData?.writingExperience || 'Beginner';
      userDataRaw.publishedBooks = existingData?.publishedBooks || 0;
      
      // Initialize authorBio if not present
      userDataRaw.authorBio = existingData?.authorBio || '';
      
      // Initialize socialLinks if not present
      userDataRaw.socialLinks = existingData?.socialLinks || {};
      
      // Preserve existing notification settings or use defaults
      userDataRaw.notificationSettings = existingData?.notificationSettings || {
        emailMarketing: true,
        salesUpdates: true,
        platformUpdates: true,
        weeklyDigest: false,
      };
      
      // Initialize preferences with defaults if not present
      userDataRaw.preferences = existingData?.preferences || {
        theme: 'light',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      };
      
      // Initialize paymentInfo with defaults if not present
      userDataRaw.paymentInfo = existingData?.paymentInfo || {
        paymentMethod: {
          type: 'bank_transfer',
          details: {},
        },
        payoutSchedule: 'monthly',
      };
      
      // Preserve existing stats or initialize to zero
      userDataRaw.totalRevenue = existingData?.totalRevenue || 0;
      userDataRaw.totalBooks = existingData?.totalBooks || 0;
      userDataRaw.totalSales = existingData?.totalSales || 0;
      userDataRaw.averageRating = existingData?.averageRating || 0;
      
      // Timestamps
      userDataRaw.updatedAt = serverTimestamp();
      userDataRaw.onboardingCompletedAt = serverTimestamp();
      
      // Set createdAt and lastLoginAt only if document doesn't exist
      if (!userDocSnap.exists()) {
        userDataRaw.createdAt = serverTimestamp();
        userDataRaw.lastLoginAt = serverTimestamp();
      }

      // CRITICAL: Remove photoURL from userDataRaw if it's invalid BEFORE building userData
      // This is a safety check in case photoURL somehow got set to undefined/null/empty
      if ('photoURL' in userDataRaw) {
        const photoURLVal = userDataRaw.photoURL;
        if (!photoURLVal || typeof photoURLVal !== 'string' || photoURLVal.trim().length === 0) {
          delete userDataRaw.photoURL;
          console.log('[CreatorService] Removed invalid photoURL from userDataRaw');
        }
      }

      // Remove all undefined and null values - Firestore doesn't allow them
      const userData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(userDataRaw)) {
        // Skip photoURL entirely if it's undefined or not a valid string
        if (key === 'photoURL') {
          if (value && typeof value === 'string' && value.trim().length > 0) {
            userData[key] = value.trim();
          }
          // Explicitly skip if invalid - don't add to userData at all
          continue;
        }
        
        // Only add the field if it has a valid value
        if (value !== undefined && value !== null) {
          // Additional check for empty strings in optional fields
          if (typeof value === 'string' && value.trim().length === 0 && 
              (key === 'phoneNumber' || key === 'penName' || key === 'bio' || key === 'website')) {
            // Skip empty strings for optional fields
            continue;
          }
          
          // Clean nested objects recursively
          if (typeof value === 'object' && value !== null && !Array.isArray(value) && value.constructor === Object) {
            const cleanedNested: Record<string, unknown> = {};
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
              if (nestedValue !== undefined && nestedValue !== null) {
                cleanedNested[nestedKey] = nestedValue;
              }
            }
            userData[key] = cleanedNested;
          } else {
            userData[key] = value;
          }
        }
      }

      // Final safety check: explicitly remove photoURL if it somehow got set to undefined
      if ('photoURL' in userData && (userData.photoURL === undefined || userData.photoURL === null)) {
        delete userData.photoURL;
      }

      // Debug logging to verify no undefined values
      console.log('[CreatorService] User data keys:', Object.keys(userData));
      const hasUndefined = Object.values(userData).some(v => {
        if (v === undefined) return true;
        if (typeof v === 'object' && v !== null) {
          return Object.values(v).some(nested => nested === undefined);
        }
        return false;
      });
      
      if (hasUndefined) {
        const undefinedKeys = Object.entries(userData)
          .filter(([_, v]) => {
            if (v === undefined) return true;
            if (typeof v === 'object' && v !== null) {
              return Object.values(v).some(nested => nested === undefined);
            }
            return false;
          })
          .map(([k]) => k);
        console.error('[CreatorService] ERROR: Found undefined values in userData:', undefinedKeys);
        throw new Error(`Cannot save user data with undefined values in fields: ${undefinedKeys.join(', ')}`);
      }

      // Use setDoc with merge to create or update
      await setDoc(userDoc, userData, { merge: true });
      
      console.log(`✅ Successfully ${userDocSnap.exists() ? 'updated' : 'created'} user document for ${userId}`);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  static async getUser(_userId: string): Promise<User | null> {
    try {
      // For now, return mock user data
      // Later: const userDoc = await getDoc(doc(db, 'users', userId));
      // return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;
      
      return null; // Will be implemented when we have real user data
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      await setDoc(userDoc, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async updateProfile(
    userId: string,
    profileData: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      bio?: string;
      photoURL?: string;
      penName?: string;
      authorBio?: string;
      website?: string;
      socialLinks?: {
        twitter?: string;
        linkedin?: string;
        instagram?: string;
        facebook?: string;
      };
    }
  ): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      const updates: Record<string, unknown> = {
        ...profileData,
        updatedAt: serverTimestamp(),
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      await updateDoc(userDoc, updates);
      console.log(`Profile updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  static async updateAccountSettings(
    userId: string,
    settings: {
      country?: string;
      timezone?: string;
      language?: string;
      currency?: string;
      currency_id?: string; // Document ID from supported_currencies collection
    }
  ): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      const updates: Record<string, unknown> = {
        ...settings,
        updatedAt: serverTimestamp(),
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      await updateDoc(userDoc, updates);
      console.log(`Account settings updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating account settings:', error);
      throw error;
    }
  }

  static async updateNotificationSettings(
    userId: string,
    settings: {
      emailMarketing?: boolean;
      salesUpdates?: boolean;
      platformUpdates?: boolean;
      weeklyDigest?: boolean;
    }
  ): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDoc);
      const existingData = userDocSnap.exists() ? userDocSnap.data() : {};
      
      const updates: Record<string, unknown> = {
        notificationSettings: {
          ...(existingData.notificationSettings || {}),
          ...settings,
        },
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userDoc, updates);
      console.log(`Notification settings updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  static async updatePaymentInfo(
    userId: string,
    paymentData: {
      payment_option?: string; // Document ID from payment_methods collection
      payout_schedule?: string; // Document ID from payment_schedules collection
      payment_details?: {
        bank_name?: string;
        branch_name?: string;
        account_name?: string;
        account_number?: string;
        provider?: string;
      };
    }
  ): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      const updates: Record<string, unknown> = {
        paymentInfo: paymentData,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userDoc, updates);
      console.log(`Payment info updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating payment info:', error);
      throw error;
    }
  }

  static async updatePreferences(
    userId: string,
    preferences: {
      theme?: string;
      dateFormat?: string;
      timeFormat?: string;
    }
  ): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      const updates: Record<string, unknown> = {
        preferences: preferences,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userDoc, updates);
      console.log(`Preferences updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }
}
