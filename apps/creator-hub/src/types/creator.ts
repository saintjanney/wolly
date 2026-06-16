export interface CreatorOnboarding {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phoneNumber?: string;
  countryOfResidence: string;
  
  // Genre Selection
  selectedGenres: string[];
  customGenres: string[];
  
  // Optional Profile Information
  penName?: string;
  bio?: string;
  website?: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  bookCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Country {
  // Core Identification
  id: string; // ISO 3166-1 alpha-2 code (e.g., "US", "GB")
  code: string; // ISO 3166-1 alpha-2 code (same as id, for compatibility)
  name: string; // Official country name
  nameNative?: string; // Name in native language
  flag: string; // Flag emoji
  
  // Regional Classification
  continent: string; // e.g., "North America", "Europe"
  region: string; // e.g., "Northern America", "Western Europe"
  subregion?: string; // e.g., "Caribbean", "Eastern Europe"
  
  // Economic & Currency
  currency: {
    code: string; // ISO 4217 currency code (e.g., "USD", "EUR")
    symbol: string; // Currency symbol (e.g., "$", "€")
    name: string; // Currency name (e.g., "US Dollar", "Euro")
  };
  vatRate?: number; // VAT/GST rate as decimal (e.g., 0.20 for 20%)
  salesTaxRate?: number; // Sales tax rate where applicable
  
  // Legal & Compliance
  minAge: number; // Minimum age requirement (default: 13, but may vary)
  gdprCompliant: boolean; // GDPR compliance status
  requiresTaxId: boolean; // Whether tax ID is required for creators
  taxIdFormat?: string; // Format pattern for tax ID (e.g., "XX-XXXXXXX")
  requiresVatNumber: boolean; // Whether VAT number is required
  
  // Publishing & Distribution
  isbnAgency?: string; // ISBN agency name (e.g., "Bowker", "Nielsen")
  requiresIsbn: boolean; // Whether ISBN is required for publishing
  distributionChannels: {
    amazon: boolean;
    apple: boolean;
    google: boolean;
    kobo: boolean;
    barnesNoble: boolean;
    direct: boolean;
  };
  publishingRestrictions?: string[]; // Content restrictions or special requirements
  
  // Localization
  timezones: string[]; // Array of timezone identifiers (e.g., ["America/New_York"])
  primaryLanguage: string; // Primary language code (e.g., "en", "es")
  languages: string[]; // All official languages
  dateFormat: string; // Date format preference (e.g., "MM/DD/YYYY", "DD/MM/YYYY")
  numberFormat: string; // Number format (e.g., "1,234.56" or "1.234,56")
  
  // Payment & Banking
  supportedPaymentMethods: ('stripe' | 'paypal' | 'bank_transfer' | 'other')[];
  bankTransferDetails?: {
    required: boolean;
    format?: string; // IBAN, SWIFT, etc.
    notes?: string;
  };
  
  // Platform Statistics (updated periodically)
  stats?: {
    creatorCount: number; // Number of creators from this country
    bookCount: number; // Number of books published by creators from this country
    totalSales: number; // Total sales from this country
    totalRevenue: number; // Total revenue from this country
    lastUpdated: Date;
  };
  
  // Metadata
  isActive: boolean; // Whether country is available for selection
  sortOrder: number; // Display order (lower numbers first)
  isPopular: boolean; // Whether to show in popular/quick selection
  notes?: string; // Admin notes
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
