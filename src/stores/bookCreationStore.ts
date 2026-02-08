import { create } from 'zustand';
import { BookCreation, PlatformBook } from '@/types/book';

interface BookCreationStore {
  bookCreation: BookCreation;
  currentStep: number;
  editingBookId?: string;
  setBookCreation: (book: Partial<BookCreation>) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
  initializeFromBook: (book: PlatformBook) => void;
  validateStep: (stepIndex: number) => { valid: boolean; errors: string[] };
  saveDraft: () => void;
  loadDraft: () => BookCreation | null;
  clearDraft: () => void;
  getCompletionPercentage: () => number;
}

const initialBookCreation: BookCreation = {
  categories: [],
  keywords: [],
  ownsCopyright: true,
  hasExplicitContent: false,
  isAIGenerated: false,
  isFree: false,
  customerPaysProcessingFee: true,
  useWollyIsbn: true,
  isLowContentBook: false,
  isLargePrintBook: false,
  hasPaperbackVersion: false,
  createdAt: new Date(),
};

const DRAFT_STORAGE_KEY = 'wolly-draft-book';

export const useBookCreationStore = create<BookCreationStore>((set, get) => ({
  bookCreation: initialBookCreation,
  currentStep: 0,
  editingBookId: undefined,
  setBookCreation: (book) =>
    set((state) => ({
      bookCreation: { ...state.bookCreation, ...book },
    })),
  setCurrentStep: (step) => set({ currentStep: step }),
  reset: () => set({ bookCreation: initialBookCreation, currentStep: 0, editingBookId: undefined }),
  initializeFromBook: (book: PlatformBook) =>
    set({
      editingBookId: book.id,
      bookCreation: {
        title: book.title,
        subtitle: book.subtitle,
        authorName: book.authorName,
        description: book.description,
        language: book.language,
        categories: book.categories,
        keywords: book.keywords || [],
        ownsCopyright: book.ownsCopyright ?? true,
        hasExplicitContent: book.hasExplicitContent ?? false,
        isAIGenerated: book.aiGenerated ?? false,
        isFree: book.isFree,
        price: book.price,
        currency: book.currency,
        isbn: book.isbn,
        pageCount: book.pageCount,
        createdAt: book.createdAt,
        distributionChannels: book.distributionChannels,
      },
      currentStep: 0,
    }),
  validateStep: (stepIndex: number) => {
    const { bookCreation } = get();
    const errors: string[] = [];

    switch (stepIndex) {
      case 0: // Book Details
        if (!bookCreation.title || bookCreation.title.trim() === '') {
          errors.push('Book title is required');
        }
        if (!bookCreation.authorName || bookCreation.authorName.trim() === '') {
          errors.push('Author name is required');
        }
        if (!bookCreation.bookType) {
          errors.push('Book type is required');
        }
        if (!bookCreation.language) {
          errors.push('Language is required');
        }
        if (!bookCreation.categories || bookCreation.categories.length === 0) {
          errors.push('At least one category is required');
        }
        if (!bookCreation.description || bookCreation.description.trim() === '') {
          errors.push('Book description is required');
        }
        break;

      case 1: // Upload Content
        if (!bookCreation.manuscriptFile) {
          errors.push('Manuscript file is required');
        }
        if (!bookCreation.coverFile) {
          errors.push('Cover image is required');
        }
        break;

      case 2: // Pricing & Distribution
        if (!bookCreation.isFree) {
          if (!bookCreation.price || bookCreation.price < 0.99) {
            errors.push('Price must be at least $0.99');
          }
        }
        if (!bookCreation.royaltyOption) {
          errors.push('Royalty option is required');
        }
        break;

      case 3: // Review & Publish
        // All validations should have passed in previous steps
        break;

      default:
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
  saveDraft: () => {
    const { bookCreation } = get();
    try {
      // Don't save files to localStorage (too large)
      const draftData = {
        ...bookCreation,
        manuscriptFile: undefined,
        coverFile: undefined,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  },
  loadDraft: () => {
    try {
      const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        // Remove savedAt timestamp before returning
        const { savedAt, ...draftData } = draft;
        return draftData;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  },
  clearDraft: () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  },
  getCompletionPercentage: () => {
    const { bookCreation } = get();
    let completedFields = 0;
    let totalFields = 0;

    // Step 0: Book Details (8 required fields)
    totalFields += 8;
    if (bookCreation.title) completedFields++;
    if (bookCreation.authorName) completedFields++;
    if (bookCreation.bookType) completedFields++;
    if (bookCreation.language) completedFields++;
    if (bookCreation.categories && bookCreation.categories.length > 0) completedFields++;
    if (bookCreation.description) completedFields++;
    if (bookCreation.ownsCopyright !== undefined) completedFields++;
    if (bookCreation.hasExplicitContent !== undefined) completedFields++;

    // Step 1: Upload Content (2 required fields)
    totalFields += 2;
    if (bookCreation.manuscriptFile) completedFields++;
    if (bookCreation.coverFile) completedFields++;

    // Step 2: Pricing (2 required fields)
    totalFields += 2;
    if (bookCreation.isFree || (bookCreation.price && bookCreation.price >= 0.99)) completedFields++;
    if (bookCreation.royaltyOption) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  },
}));
