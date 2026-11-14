export interface BookCreation {
  // Core metadata
  bookType?: 'ebook' | 'paperback' | 'hardcover' | 'audiobook';
  language?: string;
  title?: string;
  subtitle?: string;
  isPartOfSeries?: boolean;
  seriesName?: string;
  seriesOrder?: number;
  editionNumber?: string;
  authorName?: string;
  penName?: string;
  contributors?: string;
  description?: string;
  shortDescription?: string;
  
  // Classification
  ownsCopyright?: boolean;
  hasExplicitContent?: boolean;
  readingAge?: string;
  contentWarnings?: string[];
  targetAudience?: string[];
  categories: string[];
  subcategories?: string[];
  keywords: string[];
  tags?: string[];
  
  // Files
  manuscriptFile?: File;
  coverFile?: File;
  sampleFile?: File;
  audiobookFile?: File;
  
  // AI provenance
  isAIGenerated?: boolean;
  aiUsageDescription?: string;
  aiToolUsed?: string;
  copyrightYear?: number;
  
  // Pricing
  isFree?: boolean;
  price?: number;
  currency?: string;
  royaltyOption?: '35%' | '70%';
  customerPaysProcessingFee?: boolean;
  wollyRevenueShare?: number;
  
  // Distribution
  distributionChannels?: {
    amazon?: boolean;
    apple?: boolean;
    google?: boolean;
    kobo?: boolean;
    barnesNoble?: boolean;
    direct?: boolean;
  };
  
  // Physical book details
  isLowContentBook?: boolean;
  isLargePrintBook?: boolean;
  paperType?: 'white' | 'cream';
  trimSize?: string;
  coverFinish?: 'matte' | 'glossy';
  bindingType?: 'perfect' | 'case';
  isbn?: string;
  isbn13?: string;
  useWollyIsbn?: boolean;
  hasPaperbackVersion?: boolean;
  pageCount?: number;
  wordCount?: number;
  
  createdAt: Date;
}

export interface PlatformBook {
  id: string;
  ownerUserId: string;
  
  // Core metadata
  type: 'ebook' | 'paperback' | 'hardcover' | 'audiobook';
  language: string;
  title: string;
  subtitle?: string;
  authorName: string;
  penName?: string;
  description: string;
  shortDescription?: string;
  
  // Series information
  isPartOfSeries: boolean;
  seriesName?: string;
  seriesOrder?: number;
  
  // Classification
  categories: string[];
  subcategories?: string[];
  keywords: string[];
  tags?: string[];
  readingAge?: string;
  hasExplicitContent: boolean;
  contentWarnings?: string[];
  targetAudience?: string[];
  
  // Publishing information
  isbn?: string;
  isbn13?: string;
  editionNumber: string;
  publicationDate?: Date;
  pageCount?: number;
  wordCount?: number;
  
  // Physical book details
  trimSize?: string;
  paperType?: 'white' | 'cream';
  coverFinish?: 'matte' | 'glossy';
  bindingType?: 'perfect' | 'case';
  
  // Content files
  manuscriptUrl?: string;
  coverImageUrl?: string;
  sampleUrl?: string;
  audiobookUrl?: string;
  
  // AI and copyright
  aiGenerated: boolean;
  aiUsageDescription?: string;
  aiToolUsed?: string;
  ownsCopyright: boolean;
  copyrightYear?: number;
  
  // Pricing and distribution
  isFree: boolean;
  price?: number;
  currency: string;
  royaltyOption: '35%' | '70%';
  customerPaysProcessingFee: boolean;
  wollyRevenueShare: number;
  
  // Distribution channels
  distributionChannels: {
    amazon: boolean;
    apple: boolean;
    google: boolean;
    kobo: boolean;
    barnesNoble: boolean;
    direct: boolean;
  };
  
  // Status and workflow
  status: 'draft' | 'review' | 'approved' | 'published' | 'suspended' | 'archived';
  isPublished: boolean;
  publishingStatus: {
    manuscriptSubmitted: boolean;
    coverApproved: boolean;
    metadataComplete: boolean;
    pricingSet: boolean;
    distributionEnabled: boolean;
  };
  
  // Quality control
  qualityScore?: number;
  reviewNotes?: string[];
  lastReviewedAt?: Date;
  reviewedBy?: string;
  
  // Performance metrics
  views: number;
  downloads: number;
  sales: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  lastModifiedAt: Date;
}

// Additional type definitions for comprehensive platform

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Creator Onboarding Fields
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phoneNumber?: string;
  countryOfResidence: string;
  
  // Creator Profile
  bio?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  penName?: string;
  authorBio?: string;
  
  // Creator Specialties and Genres
  selectedGenres: string[]; // Genres they plan to create content for
  customGenres?: string[]; // Genres they added that weren't in the system
  specialties: string[];
  writingExperience: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  
  // Onboarding Status
  onboardingCompleted: boolean;
  onboardingStep: number; // Track progress through onboarding
  
  // Publishing Stats
  publishedBooks: number;
  country: string;
  timezone: string;
  language: string;
  currency: string;
  
  // Notification Settings
  notificationSettings: {
    emailMarketing: boolean;
    salesUpdates: boolean;
    platformUpdates: boolean;
    weeklyDigest: boolean;
  };
  
  // Performance Metrics
  totalRevenue: number;
  totalBooks: number;
  totalSales: number;
  averageRating: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  onboardingCompletedAt?: Date;
}

export interface Analytics {
  id: string;
  bookId: string;
  ownerUserId: string;
  date: Date;
  sales: {
    total: number;
    byChannel: {
      amazon: number;
      apple: number;
      google: number;
      kobo: number;
      barnesNoble: number;
      direct: number;
    };
    revenue: number;
    royalties: number;
  };
  engagement: {
    views: number;
    downloads: number;
    previews: number;
    shares: number;
    bookmarks: number;
  };
  geography: {
    country: string;
    sales: number;
    revenue: number;
  }[];
  devices: {
    type: 'mobile' | 'tablet' | 'desktop';
    count: number;
  }[];
  createdAt: Date;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  content: string;
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationNotes?: string;
  helpfulVotes: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  bookId: string;
  amount: number;
  currency: string;
  type: 'royalty' | 'bonus' | 'refund' | 'adjustment';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  periodStart: Date;
  periodEnd: Date;
  salesData: {
    totalSales: number;
    totalRevenue: number;
    royaltyRate: number;
    platformFee: number;
    netAmount: number;
  };
  paymentMethod: {
    type: 'bank_transfer' | 'paypal' | 'stripe';
    details: Record<string, unknown>;
  };
  createdAt: Date;
  processedAt?: Date;
  paidAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'sale' | 'review' | 'payment' | 'system' | 'marketing';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  isArchived: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  readAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  sortOrder: number;
  bookCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  display_name: string;
}

export interface PaymentSchedule {
  id: string;
  display_name: string;
  description: string;
  value: string;
  sort_order: number;
}

export interface SupportedCurrency {
  id: string;
  currency_code: string;
  display_name: string;
  symbol: string;
  payout_threshold: number;
  is_active: boolean;
  sort_order: number;
}

