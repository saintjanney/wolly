import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { COLLECTIONS, type FileType } from '@wolly/schema';
import { PlatformBook, BookCreation } from '@/types/book';
import { GenreService } from './genreService';

// Mock data for demonstration
const mockBooks: PlatformBook[] = [
  {
    id: '1',
    ownerUserId: 'mock-user-123',
    type: 'ebook',
    language: 'English',
    title: 'The Digital Revolution',
    subtitle: 'How Technology is Changing Our World',
    authorName: 'Demo Creator',
    penName: 'Alex Writer',
    description: 'An in-depth exploration of how digital technology is transforming every aspect of our lives, from communication to commerce.',
    shortDescription: 'A comprehensive guide to understanding the digital transformation reshaping our world.',
    isPartOfSeries: false,
    seriesName: '',
    seriesOrder: undefined,
    categories: ['Technology', 'Business', 'Non-fiction'],
    subcategories: ['Digital Transformation', 'Business Strategy'],
    keywords: ['technology', 'digital', 'innovation', 'future'],
    tags: ['bestseller', 'trending'],
    readingAge: '18',
    hasExplicitContent: false,
    contentWarnings: [],
    targetAudience: ['Business professionals', 'Tech enthusiasts'],
    isbn: '978-1234567890',
    isbn13: '9781234567890',
    editionNumber: '1',
    publicationDate: new Date('2024-01-15'),
    pageCount: 320,
    wordCount: 85000,
    trimSize: '6x9',
    paperType: 'white',
    coverFinish: 'matte',
    bindingType: 'perfect',
    coverImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=400&fit=crop',
    manuscriptUrl: '',
    sampleUrl: '',
    audiobookUrl: '',
    aiGenerated: false,
    aiUsageDescription: '',
    aiToolUsed: '',
    ownsCopyright: true,
    copyrightYear: 2024,
    isFree: false,
    price: 9.99,
    currency: 'USD',
    royaltyOption: '70%',
    customerPaysProcessingFee: true,
    wollyRevenueShare: 30,
    distributionChannels: {
      amazon: true,
      apple: true,
      google: true,
      kobo: true,
      barnesNoble: true,
      direct: true,
    },
    status: 'published',
    isPublished: true,
    publishingStatus: {
      manuscriptSubmitted: true,
      coverApproved: true,
      metadataComplete: true,
      pricingSet: true,
      distributionEnabled: true,
    },
    qualityScore: 4.8,
    reviewNotes: [],
    lastReviewedAt: new Date('2024-01-20'),
    reviewedBy: 'system',
    views: 1250,
    downloads: 89,
    sales: 67,
    revenue: 669.33,
    averageRating: 4.5,
    reviewCount: 23,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    publishedAt: new Date('2024-01-20'),
    lastModifiedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    ownerUserId: 'mock-user-123',
    type: 'ebook',
    language: 'English',
    title: 'Creative Writing Mastery',
    subtitle: 'A Complete Guide for Aspiring Authors',
    authorName: 'Demo Creator',
    penName: 'Alex Writer',
    description: 'Learn the art and craft of creative writing with this comprehensive guide covering everything from character development to plot structure.',
    shortDescription: 'Master the fundamentals of creative writing with practical exercises and expert guidance.',
    isPartOfSeries: true,
    seriesName: 'Writing Series',
    seriesOrder: 1,
    categories: ['Writing', 'Education', 'Self-help'],
    subcategories: ['Creative Writing', 'Writing Techniques'],
    keywords: ['writing', 'creativity', 'authorship', 'storytelling'],
    tags: ['guide', 'beginner-friendly'],
    readingAge: '16',
    hasExplicitContent: false,
    contentWarnings: [],
    targetAudience: ['Aspiring writers', 'Students'],
    isbn: '978-1234567891',
    isbn13: '9781234567891',
    editionNumber: '1',
    publicationDate: undefined,
    pageCount: 280,
    wordCount: 70000,
    trimSize: '5x8',
    paperType: 'white',
    coverFinish: 'glossy',
    bindingType: 'perfect',
    coverImageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
    manuscriptUrl: '',
    sampleUrl: '',
    audiobookUrl: '',
    aiGenerated: false,
    aiUsageDescription: '',
    aiToolUsed: '',
    ownsCopyright: true,
    copyrightYear: 2024,
    isFree: true,
    price: 0,
    currency: 'USD',
    royaltyOption: '70%',
    customerPaysProcessingFee: true,
    wollyRevenueShare: 30,
    distributionChannels: {
      amazon: true,
      apple: true,
      google: true,
      kobo: true,
      barnesNoble: true,
      direct: true,
    },
    status: 'draft',
    isPublished: false,
    publishingStatus: {
      manuscriptSubmitted: true,
      coverApproved: false,
      metadataComplete: true,
      pricingSet: true,
      distributionEnabled: false,
    },
    qualityScore: undefined,
    reviewNotes: [],
    lastReviewedAt: undefined,
    reviewedBy: undefined,
    views: 45,
    downloads: 12,
    sales: 0,
    revenue: 0,
    averageRating: 0,
    reviewCount: 0,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-10'),
    publishedAt: undefined,
    lastModifiedAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    ownerUserId: 'mock-user-123',
    type: 'ebook',
    language: 'English',
    title: 'Mindful Living',
    subtitle: 'Finding Peace in a Busy World',
    authorName: 'Demo Creator',
    penName: 'Alex Writer',
    description: 'Discover practical techniques for incorporating mindfulness into your daily routine and finding inner peace.',
    shortDescription: 'Transform your life with simple mindfulness practices for modern living.',
    isPartOfSeries: false,
    seriesName: '',
    seriesOrder: undefined,
    categories: ['Mindfulness', 'Self-help', 'Wellness'],
    subcategories: ['Meditation', 'Stress Management'],
    keywords: ['mindfulness', 'meditation', 'peace', 'wellness'],
    tags: ['bestseller', 'wellness'],
    readingAge: '18',
    hasExplicitContent: false,
    contentWarnings: [],
    targetAudience: ['Wellness seekers', 'Busy professionals'],
    isbn: '978-1234567892',
    isbn13: '9781234567892',
    editionNumber: '1',
    publicationDate: new Date('2024-01-12'),
    pageCount: 240,
    wordCount: 60000,
    trimSize: '6x9',
    paperType: 'white',
    coverFinish: 'matte',
    bindingType: 'perfect',
    coverImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop',
    manuscriptUrl: '',
    sampleUrl: '',
    audiobookUrl: '',
    aiGenerated: false,
    aiUsageDescription: '',
    aiToolUsed: '',
    ownsCopyright: true,
    copyrightYear: 2024,
    isFree: false,
    price: 7.99,
    currency: 'USD',
    royaltyOption: '70%',
    customerPaysProcessingFee: true,
    wollyRevenueShare: 30,
    distributionChannels: {
      amazon: true,
      apple: true,
      google: true,
      kobo: true,
      barnesNoble: true,
      direct: true,
    },
    status: 'published',
    isPublished: true,
    publishingStatus: {
      manuscriptSubmitted: true,
      coverApproved: true,
      metadataComplete: true,
      pricingSet: true,
      distributionEnabled: true,
    },
    qualityScore: 4.6,
    reviewNotes: [],
    lastReviewedAt: new Date('2024-01-12'),
    reviewedBy: 'system',
    views: 890,
    downloads: 67,
    sales: 45,
    revenue: 359.55,
    averageRating: 4.3,
    reviewCount: 18,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12'),
    publishedAt: new Date('2024-01-12'),
    lastModifiedAt: new Date('2024-01-12'),
  }
];

export class BookService {
  static async createBook(bookCreation: BookCreation, userId: string): Promise<string> {
    try {
      // 1. Upload files to Firebase Storage
      // Generate book ID first so we can use it in storage paths
      const bookId = doc(collection(db, COLLECTIONS.EPUBS)).id;
      let coverUrl: string | undefined;
      let manuscriptUrl: string | undefined;

      // Derive the reader's `fileType` from the manuscript file extension.
      const manuscriptName = (bookCreation.manuscriptFile?.name || '').toLowerCase();
      const fileType: FileType = manuscriptName.endsWith('.pdf') ? 'pdf' : 'epub';

      // Resolve the first selected category to a `genres` document id so the book
      // appears under the right genre in the reader (creates the genre if needed).
      const genreId = await GenreService.ensureGenreId(bookCreation.categories?.[0]);

      console.log('📤 Starting file uploads for book:', bookId);
      
      // Upload cover image if provided
      if (bookCreation.coverFile) {
        try {
          const coverFileName = `cover_${bookCreation.coverFile.name}`;
          const coverRef = ref(storage, `books/${userId}/${bookId}/${coverFileName}`);
          console.log('📤 Uploading cover image:', coverFileName, `(${(bookCreation.coverFile.size / 1024 / 1024).toFixed(2)} MB)`);
          
          await uploadBytes(coverRef, bookCreation.coverFile);
          coverUrl = await getDownloadURL(coverRef);
          console.log('✅ Cover image uploaded successfully:', coverUrl);
        } catch (error) {
          console.error('❌ Error uploading cover image:', error);
          throw new Error(`Failed to upload cover image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log('⚠️ No cover file provided');
      }

      // Upload manuscript if provided
      if (bookCreation.manuscriptFile) {
        try {
          const manuscriptFileName = `manuscript_${bookCreation.manuscriptFile.name}`;
          const manuscriptRef = ref(storage, `books/${userId}/${bookId}/${manuscriptFileName}`);
          console.log('📤 Uploading manuscript:', manuscriptFileName, `(${(bookCreation.manuscriptFile.size / 1024 / 1024).toFixed(2)} MB)`);
          
          await uploadBytes(manuscriptRef, bookCreation.manuscriptFile);
          manuscriptUrl = await getDownloadURL(manuscriptRef);
          console.log('✅ Manuscript uploaded successfully:', manuscriptUrl);
        } catch (error) {
          console.error('❌ Error uploading manuscript:', error);
          throw new Error(`Failed to upload manuscript: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log('⚠️ No manuscript file provided');
      }

      // Validate that at least one file was uploaded
      if (!coverUrl && !manuscriptUrl) {
        throw new Error('At least one file (cover image or manuscript) must be uploaded');
      }

      // Helper function to remove undefined and null values recursively
      const removeUndefinedValues = (obj: unknown): unknown => {
        if (obj === null || obj === undefined) {
          return undefined;
        }
        
        if (Array.isArray(obj)) {
          return obj.map(removeUndefinedValues).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object' && !(obj instanceof Date) && obj !== null) {
          const cleaned: Record<string, unknown> = {};
          const recordObj = obj as Record<string, unknown>;
          for (const key in recordObj) {
            if (recordObj.hasOwnProperty(key)) {
              const cleanedValue = removeUndefinedValues(recordObj[key]);
              if (cleanedValue !== undefined && cleanedValue !== null) {
                cleaned[key] = cleanedValue;
              }
            }
          }
          return cleaned;
        }
        
        return obj;
      };

      // 2. Create book document in Firestore
      // Build book data, only including fields that have valid values
      const bookDataRaw: Record<string, unknown> = {
        id: bookId,
        ownerUserId: userId,
        type: bookCreation.bookType || 'ebook',
        language: bookCreation.language || 'English',
        title: bookCreation.title || '',
        authorName: bookCreation.authorName || '',
        // Reader contract: the reader reads `author`, `fileType` and `rating`.
        author: bookCreation.authorName || '',
        fileType,
        rating: 0,
        description: bookCreation.description || '',
        isPartOfSeries: bookCreation.isPartOfSeries || false,
        ownsCopyright: bookCreation.ownsCopyright !== undefined ? bookCreation.ownsCopyright : true,
        hasExplicitContent: bookCreation.hasExplicitContent || false,
        categories: bookCreation.categories || [],
        keywords: bookCreation.keywords || [],
        aiGenerated: bookCreation.isAIGenerated || false,
        isFree: bookCreation.isFree || false,
        currency: bookCreation.currency || 'USD',
        royaltyOption: bookCreation.royaltyOption || '70%',
        customerPaysProcessingFee: bookCreation.customerPaysProcessingFee !== undefined ? bookCreation.customerPaysProcessingFee : true,
        distributionChannels: {
          amazon: bookCreation.distributionChannels?.amazon ?? true,
          apple: bookCreation.distributionChannels?.apple ?? true,
          google: bookCreation.distributionChannels?.google ?? true,
          kobo: bookCreation.distributionChannels?.kobo ?? true,
          barnesNoble: bookCreation.distributionChannels?.barnesNoble ?? true,
          direct: bookCreation.distributionChannels?.direct ?? true,
        },
        status: 'draft',
        isPublished: false,
        publishingStatus: {
          manuscriptSubmitted: true,
          coverApproved: false,
          metadataComplete: true,
          pricingSet: true,
          distributionEnabled: false,
        },
        reviewNotes: [],
        views: 0,
        downloads: 0,
        sales: 0,
        revenue: 0,
        averageRating: 0,
        reviewCount: 0,
      };

      // Only add optional fields if they have valid values
      if (bookCreation.subtitle && bookCreation.subtitle.trim()) {
        bookDataRaw.subtitle = bookCreation.subtitle.trim();
      }
      
      if (bookCreation.seriesName && bookCreation.seriesName.trim()) {
        bookDataRaw.seriesName = bookCreation.seriesName.trim();
      }
      
      if (bookCreation.editionNumber && bookCreation.editionNumber.trim()) {
        bookDataRaw.editionNumber = bookCreation.editionNumber.trim();
      }
      
      if (bookCreation.penName && bookCreation.penName.trim()) {
        bookDataRaw.penName = bookCreation.penName.trim();
      }
      
      if (bookCreation.shortDescription && bookCreation.shortDescription.trim()) {
        bookDataRaw.shortDescription = bookCreation.shortDescription.trim();
      }
      
      if (bookCreation.isPartOfSeries && bookCreation.seriesOrder !== undefined && bookCreation.seriesOrder !== null) {
        bookDataRaw.seriesOrder = bookCreation.seriesOrder;
      }
      
      if (bookCreation.readingAge && bookCreation.readingAge.trim()) {
        bookDataRaw.readingAge = bookCreation.readingAge.trim();
      }
      
      if (bookCreation.contentWarnings && bookCreation.contentWarnings.length > 0) {
        bookDataRaw.contentWarnings = bookCreation.contentWarnings;
      }
      
      if (bookCreation.targetAudience && bookCreation.targetAudience.length > 0) {
        bookDataRaw.targetAudience = bookCreation.targetAudience;
      }
      
      if (bookCreation.subcategories && bookCreation.subcategories.length > 0) {
        bookDataRaw.subcategories = bookCreation.subcategories;
      }
      
      if (bookCreation.tags && bookCreation.tags.length > 0) {
        bookDataRaw.tags = bookCreation.tags;
      }
      
      if (bookCreation.isbn && bookCreation.isbn.trim()) {
        bookDataRaw.isbn = bookCreation.isbn.trim();
      }
      
      if (bookCreation.isbn13 && bookCreation.isbn13.trim()) {
        bookDataRaw.isbn13 = bookCreation.isbn13.trim();
      }
      
      if (bookCreation.pageCount !== undefined && bookCreation.pageCount !== null) {
        bookDataRaw.pageCount = bookCreation.pageCount;
      }
      
      if (bookCreation.wordCount !== undefined && bookCreation.wordCount !== null) {
        bookDataRaw.wordCount = bookCreation.wordCount;
      }
      
      if (bookCreation.trimSize && bookCreation.trimSize.trim()) {
        bookDataRaw.trimSize = bookCreation.trimSize.trim();
      }
      
      if (bookCreation.paperType && bookCreation.paperType.trim()) {
        bookDataRaw.paperType = bookCreation.paperType.trim();
      }
      
      if (bookCreation.coverFinish && bookCreation.coverFinish.trim()) {
        bookDataRaw.coverFinish = bookCreation.coverFinish.trim();
      }
      
      if (bookCreation.bindingType && bookCreation.bindingType.trim()) {
        bookDataRaw.bindingType = bookCreation.bindingType.trim();
      }
      
      if (bookCreation.aiUsageDescription && bookCreation.aiUsageDescription.trim()) {
        bookDataRaw.aiUsageDescription = bookCreation.aiUsageDescription.trim();
      }
      
      if (bookCreation.aiToolUsed && bookCreation.aiToolUsed.trim()) {
        bookDataRaw.aiToolUsed = bookCreation.aiToolUsed.trim();
      }
      
      if (bookCreation.copyrightYear !== undefined && bookCreation.copyrightYear !== null) {
        bookDataRaw.copyrightYear = bookCreation.copyrightYear;
      }
      
      if (bookCreation.price !== undefined && bookCreation.price !== null) {
        bookDataRaw.price = bookCreation.price;
      }

      // Reader contract: `genre` is a `genres` document id (omitted if unresolved).
      if (genreId) {
        bookDataRaw.genre = genreId;
      }
      
      if (bookCreation.wollyRevenueShare !== undefined && bookCreation.wollyRevenueShare !== null) {
        bookDataRaw.wollyRevenueShare = bookCreation.wollyRevenueShare;
      }

      // Add file URLs - only include if they were successfully uploaded.
      // The reader reads `coverUrl` / `url`; we keep the hub's own
      // `coverImageUrl` / `manuscriptUrl` alongside them.
      if (coverUrl) {
        bookDataRaw.coverImageUrl = coverUrl;
        bookDataRaw.coverUrl = coverUrl;
        console.log('📝 Adding coverImageUrl/coverUrl to book document');
      }

      if (manuscriptUrl) {
        bookDataRaw.manuscriptUrl = manuscriptUrl;
        bookDataRaw.url = manuscriptUrl;
        console.log('📝 Adding manuscriptUrl/url to book document');
      }

      // Remove all undefined and null values recursively
      const bookData = removeUndefinedValues(bookDataRaw) as Record<string, unknown>;

      // Final safety check - remove any remaining undefined values
      const finalBookData: Record<string, unknown> = {};
      for (const key in bookData) {
        if (bookData.hasOwnProperty(key) && bookData[key] !== undefined && bookData[key] !== null) {
          finalBookData[key] = bookData[key];
        }
      }

      // Add timestamps
      finalBookData.createdAt = serverTimestamp();
      finalBookData.updatedAt = serverTimestamp();
      finalBookData.lastModifiedAt = serverTimestamp();

      console.log('📚 Creating book document in Firestore:', bookId);
      console.log('📋 Book data summary:', {
        title: finalBookData.title,
        author: finalBookData.authorName,
        hasCover: !!finalBookData.coverImageUrl,
        hasManuscript: !!finalBookData.manuscriptUrl,
        coverUrl: finalBookData.coverImageUrl ? '✅ Present' : '❌ Missing',
        manuscriptUrl: finalBookData.manuscriptUrl ? '✅ Present' : '❌ Missing',
      });
      
      // Verify no undefined values remain
      const undefinedKeys = Object.keys(finalBookData).filter(key => finalBookData[key] === undefined);
      if (undefinedKeys.length > 0) {
        console.error('❌ Found undefined values in book data:', undefinedKeys);
        throw new Error(`Cannot create book: undefined values found in fields: ${undefinedKeys.join(', ')}`);
      }

      // Save to Firestore
      await setDoc(doc(db, COLLECTIONS.EPUBS, bookId), finalBookData);
      console.log('✅ Book created successfully in Firestore:', bookId);

      return bookId;
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  }

  static async getUserBooks(userId: string): Promise<PlatformBook[]> {
    try {
      // Return mock data for demonstration
      if (userId === 'mock-user-123') {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockBooks), 500); // Simulate API delay
        });
      }

      const q = query(
        collection(db, COLLECTIONS.EPUBS),
        where('ownerUserId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as PlatformBook[];
    } catch (error) {
      console.error('Error fetching user books:', error);
      throw error;
    }
  }

  static async updateBookPublishStatus(bookId: string, isPublished: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.EPUBS, bookId), {
        isPublished,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating book status:', error);
      throw error;
    }
  }

  static async updateBook(bookId: string, updates: Partial<PlatformBook>): Promise<void> {
    try {
      const bookRef = doc(db, COLLECTIONS.EPUBS, bookId);
      const cleanedUpdates: Record<string, unknown> = {};

      // Remove undefined/null values and drop non-serializable values (e.g. the
      // File objects carried on BookCreation, which Firestore cannot store).
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null) continue;
        if (typeof File !== 'undefined' && value instanceof File) continue;
        if (typeof Blob !== 'undefined' && value instanceof Blob) continue;
        cleanedUpdates[key] = value;
      }

      // Keep the reader-contract aliases in sync with the hub's own fields.
      const updatesRecord = updates as Record<string, unknown>;
      if (typeof updatesRecord.authorName === 'string') {
        cleanedUpdates.author = updatesRecord.authorName;
      }
      if (typeof updatesRecord.coverImageUrl === 'string') {
        cleanedUpdates.coverUrl = updatesRecord.coverImageUrl;
      }
      if (typeof updatesRecord.manuscriptUrl === 'string') {
        cleanedUpdates.url = updatesRecord.manuscriptUrl;
      }
      if (typeof updatesRecord.averageRating === 'number') {
        cleanedUpdates.rating = updatesRecord.averageRating;
      }
      const firstCategory = Array.isArray(updatesRecord.categories)
        ? (updatesRecord.categories as unknown[])[0]
        : undefined;
      if (typeof firstCategory === 'string') {
        const genreId = await GenreService.ensureGenreId(firstCategory);
        if (genreId) cleanedUpdates.genre = genreId;
      }

      cleanedUpdates.updatedAt = serverTimestamp();
      cleanedUpdates.lastModifiedAt = serverTimestamp();
      
      await updateDoc(bookRef, cleanedUpdates);
      console.log(`Book ${bookId} updated successfully`);
    } catch (error) {
      console.error('Error updating book:', error);
      throw error;
    }
  }

  static async deleteBook(bookId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.EPUBS, bookId));
      console.log(`Book ${bookId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  }

  static async bulkUpdateBooks(bookIds: string[], updates: Partial<PlatformBook>): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      const cleanedUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          cleanedUpdates[key] = value;
        }
      }
      cleanedUpdates.updatedAt = serverTimestamp();
      cleanedUpdates.lastModifiedAt = serverTimestamp();
      
      bookIds.forEach((bookId) => {
        const bookRef = doc(db, COLLECTIONS.EPUBS, bookId);
        batch.update(bookRef, cleanedUpdates);
      });
      
      await batch.commit();
      console.log(`Bulk updated ${bookIds.length} books`);
    } catch (error) {
      console.error('Error bulk updating books:', error);
      throw error;
    }
  }

  static async getBooksWithFilters(
    userId: string,
    filters: {
      status?: 'draft' | 'review' | 'approved' | 'published' | 'suspended' | 'archived' | 'all';
      category?: string;
      searchQuery?: string;
      sortBy?: 'title' | 'date' | 'status' | 'revenue';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PlatformBook[]> {
    try {
      let q = query(
        collection(db, COLLECTIONS.EPUBS),
        where('ownerUserId', '==', userId)
      );

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'published') {
          q = query(q, where('isPublished', '==', true));
        } else {
          q = query(q, where('status', '==', filters.status));
        }
      }

      // Apply sorting
      const sortField = filters.sortBy === 'date' 
        ? 'updatedAt' 
        : filters.sortBy === 'title'
        ? 'title'
        : filters.sortBy === 'revenue'
        ? 'revenue'
        : 'updatedAt';
      
      q = query(q, orderBy(sortField, filters.sortOrder || 'desc'));

      const querySnapshot = await getDocs(q);
      let books = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        publishedAt: doc.data().publishedAt?.toDate(),
        lastModifiedAt: doc.data().lastModifiedAt?.toDate() || new Date(),
      })) as PlatformBook[];

      // Apply client-side filters (category, search)
      if (filters.category) {
        books = books.filter(book => 
          book.categories.some(cat => 
            cat.toLowerCase().includes(filters.category!.toLowerCase())
          )
        );
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        books = books.filter(book =>
          book.title.toLowerCase().includes(query) ||
          book.authorName.toLowerCase().includes(query) ||
          book.description.toLowerCase().includes(query) ||
          book.categories.some(cat => cat.toLowerCase().includes(query))
        );
      }

      return books;
    } catch (error) {
      console.error('Error fetching books with filters:', error);
      throw error;
    }
  }
}
