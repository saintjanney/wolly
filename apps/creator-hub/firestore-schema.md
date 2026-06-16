# Wolly Creator Hub - Firestore Database Schema

## Overview
This document outlines the comprehensive Firestore database structure designed to support a world-class book publication management platform.

## Collections Structure

### 1. **users** - Enhanced User Management
```typescript
interface User {
  // Core Identity
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Profile Information
  firstName: string;
  lastName: string;
  bio?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  
  // Creator Profile
  penName?: string;
  authorBio?: string;
  specialties: string[]; // ["Fiction", "Non-fiction", "Poetry"]
  writingExperience: "Beginner" | "Intermediate" | "Advanced" | "Professional";
  publishedBooks: number;
  
  // Account Settings
  country: string;
  timezone: string;
  language: string;
  currency: string;
  
  // Preferences
  notificationSettings: {
    emailMarketing: boolean;
    salesUpdates: boolean;
    platformUpdates: boolean;
    weeklyDigest: boolean;
  };
  
  // Financial
  taxId?: string;
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
  
  // Platform Stats
  totalRevenue: number;
  totalBooks: number;
  totalSales: number;
  averageRating: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### 2. **books** - Comprehensive Book Management
```typescript
interface Book {
  // Core Metadata
  id: string;
  ownerUserId: string;
  title: string;
  subtitle?: string;
  authorName: string;
  penName?: string;
  description: string;
  shortDescription?: string; // For previews
  
  // Series Information
  isPartOfSeries: boolean;
  seriesName?: string;
  seriesOrder?: number;
  
  // Classification
  type: "ebook" | "paperback" | "hardcover" | "audiobook";
  language: string;
  categories: string[];
  subcategories: string[];
  keywords: string[];
  tags: string[];
  
  // Content Classification
  readingAge: string;
  hasExplicitContent: boolean;
  contentWarnings?: string[];
  targetAudience: string[];
  
  // Publishing Information
  isbn?: string;
  isbn13?: string;
  editionNumber: string;
  publicationDate?: Timestamp;
  pageCount?: number;
  wordCount?: number;
  
  // Physical Book Details (for print)
  trimSize?: string;
  paperType?: "white" | "cream";
  coverFinish?: "matte" | "glossy";
  bindingType?: "perfect" | "case";
  
  // Content Files
  manuscriptUrl?: string;
  coverImageUrl?: string;
  sampleUrl?: string;
  audiobookUrl?: string;
  
  // AI and Copyright
  aiGenerated: boolean;
  aiUsageDescription?: string;
  aiToolUsed?: string;
  ownsCopyright: boolean;
  copyrightYear?: number;
  
  // Pricing and Distribution
  isFree: boolean;
  price: number;
  currency: string;
  royaltyOption: "35%" | "70%";
  customerPaysProcessingFee: boolean;
  wollyRevenueShare: number;
  
  // Distribution Channels
  distributionChannels: {
    amazon: boolean;
    apple: boolean;
    google: boolean;
    kobo: boolean;
    barnesNoble: boolean;
    direct: boolean;
  };
  
  // Status and Workflow
  status: "draft" | "review" | "approved" | "published" | "suspended" | "archived";
  publishingStatus: {
    manuscriptSubmitted: boolean;
    coverApproved: boolean;
    metadataComplete: boolean;
    pricingSet: boolean;
    distributionEnabled: boolean;
  };
  
  // Quality Control
  qualityScore?: number;
  reviewNotes?: string[];
  lastReviewedAt?: Timestamp;
  reviewedBy?: string;
  
  // Performance Metrics
  views: number;
  downloads: number;
  sales: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  lastModifiedAt: Timestamp;
}
```

### 3. **book_drafts** - Draft Management
```typescript
interface BookDraft {
  id: string;
  bookId: string;
  ownerUserId: string;
  version: number;
  
  // Draft Content
  title?: string;
  subtitle?: string;
  description?: string;
  manuscriptUrl?: string;
  coverImageUrl?: string;
  
  // Changes Tracking
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: Timestamp;
  }[];
  
  // Status
  status: "draft" | "review" | "approved" | "rejected";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. **analytics** - Performance Tracking
```typescript
interface Analytics {
  id: string;
  bookId: string;
  ownerUserId: string;
  date: Timestamp;
  
  // Sales Metrics
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
  
  // Engagement Metrics
  engagement: {
    views: number;
    downloads: number;
    previews: number;
    shares: number;
    bookmarks: number;
  };
  
  // Geographic Data
  geography: {
    country: string;
    sales: number;
    revenue: number;
  }[];
  
  // Device/Browser Data
  devices: {
    type: "mobile" | "tablet" | "desktop";
    count: number;
  }[];
  
  // Timestamps
  createdAt: Timestamp;
}
```

### 5. **reviews** - Book Reviews and Ratings
```typescript
interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  
  // Review Content
  rating: number; // 1-5
  title?: string;
  content: string;
  isVerifiedPurchase: boolean;
  
  // Moderation
  status: "pending" | "approved" | "rejected" | "flagged";
  moderatedBy?: string;
  moderatedAt?: Timestamp;
  moderationNotes?: string;
  
  // Engagement
  helpfulVotes: number;
  reportCount: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6. **payments** - Revenue and Payment Tracking
```typescript
interface Payment {
  id: string;
  userId: string;
  bookId: string;
  
  // Payment Details
  amount: number;
  currency: string;
  type: "royalty" | "bonus" | "refund" | "adjustment";
  status: "pending" | "processing" | "completed" | "failed";
  
  // Period
  periodStart: Timestamp;
  periodEnd: Timestamp;
  
  // Sales Data
  salesData: {
    totalSales: number;
    totalRevenue: number;
    royaltyRate: number;
    platformFee: number;
    netAmount: number;
  };
  
  // Payment Method
  paymentMethod: {
    type: "bank_transfer" | "paypal" | "stripe";
    details: any;
  };
  
  // Timestamps
  createdAt: Timestamp;
  processedAt?: Timestamp;
  paidAt?: Timestamp;
}
```

### 7. **notifications** - User Notifications
```typescript
interface Notification {
  id: string;
  userId: string;
  
  // Notification Content
  type: "sale" | "review" | "payment" | "system" | "marketing";
  title: string;
  message: string;
  actionUrl?: string;
  
  // Status
  isRead: boolean;
  isArchived: boolean;
  
  // Priority
  priority: "low" | "medium" | "high" | "urgent";
  
  // Timestamps
  createdAt: Timestamp;
  readAt?: Timestamp;
}
```

### 8. **categories** - Enhanced Category Management
```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string; // For subcategories
  level: number; // 0 for main categories, 1+ for subcategories
  
  // Metadata
  isActive: boolean;
  sortOrder: number;
  bookCount: number;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 9. **publishing_queue** - Publishing Workflow Management
```typescript
interface PublishingQueue {
  id: string;
  bookId: string;
  userId: string;
  
  // Workflow Steps
  steps: {
    name: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    notes?: string;
    assignedTo?: string;
  }[];
  
  // Current Status
  currentStep: number;
  overallStatus: "queued" | "processing" | "completed" | "failed";
  
  // Priority
  priority: "low" | "normal" | "high" | "urgent";
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}
```

### 10. **content_files** - File Management
```typescript
interface ContentFile {
  id: string;
  bookId: string;
  userId: string;
  
  // File Information
  fileName: string;
  fileType: "manuscript" | "cover" | "sample" | "audiobook" | "other";
  fileSize: number;
  mimeType: string;
  
  // Storage
  storageUrl: string;
  storagePath: string;
  storageProvider: "firebase" | "aws" | "gcp";
  
  // Versioning
  version: number;
  isLatest: boolean;
  previousVersionId?: string;
  
  // Processing Status
  processingStatus: "uploading" | "processing" | "ready" | "failed";
  processingNotes?: string;
  
  // Quality Checks
  qualityChecks: {
    fileSizeValid: boolean;
    formatValid: boolean;
    contentScanned: boolean;
    virusScanned: boolean;
  };
  
  // Timestamps
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
}
```

## Indexes Required

### Composite Indexes for Performance
```javascript
// Books collection
- ownerUserId + status + createdAt (desc)
- ownerUserId + isPublished + createdAt (desc)
- categories + isPublished + createdAt (desc)
- status + createdAt (desc)

// Analytics collection
- bookId + date (desc)
- ownerUserId + date (desc)

// Reviews collection
- bookId + status + createdAt (desc)
- userId + createdAt (desc)

// Payments collection
- userId + status + createdAt (desc)
- userId + periodStart + periodEnd
```

## Security Rules

### Example Security Rules Structure
```javascript
// Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Books are readable by owner, published books readable by all
match /books/{bookId} {
  allow read: if resource.data.isPublished == true || 
                (request.auth != null && request.auth.uid == resource.data.ownerUserId);
  allow write: if request.auth != null && request.auth.uid == resource.data.ownerUserId;
}

// Analytics only accessible by book owner
match /analytics/{analyticsId} {
  allow read, write: if request.auth != null && 
                       request.auth.uid == resource.data.ownerUserId;
}
```

## Data Migration Strategy

1. **Phase 1**: Create new collections alongside existing ones
2. **Phase 2**: Migrate existing data to new structure
3. **Phase 3**: Update application to use new collections
4. **Phase 4**: Deprecate old collections
5. **Phase 5**: Clean up old data

## Performance Considerations

1. **Pagination**: Implement cursor-based pagination for large datasets
2. **Caching**: Use Firestore offline persistence and local caching
3. **Batch Operations**: Use batch writes for multiple document updates
4. **Denormalization**: Store frequently accessed data in multiple collections
5. **Aggregation**: Pre-calculate metrics to avoid expensive queries

This schema provides a solid foundation for a world-class book publication platform with comprehensive features for creators, publishers, and readers.
