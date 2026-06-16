# Seed Countries Collection

This script populates the `countries` collection in Firestore with comprehensive country data.

## Overview

The countries collection contains detailed information about each country including:
- Basic identification (code, name, flag)
- Regional classification (continent, region)
- Economic data (currency, tax rates)
- Legal requirements (GDPR, tax ID, VAT)
- Publishing information (ISBN requirements, distribution channels)
- Localization (timezones, languages, date/number formats)
- Payment methods
- Platform statistics

## Running the Script

### Option 1: Using Node.js with Client SDK (Development)

```bash
cd /Users/allenjanney/Dev/Lumin/wolly-creator-hub
node scripts/seed-countries.js
```

**Note:** This requires Firebase Authentication. You may need to authenticate first or use the Firebase emulator.

### Option 2: Using Firebase Admin SDK (Recommended for Production)

If you have a service account key:

1. Place your service account key at the project root as `service-account-key.json`
2. Update the script to use `firebase-admin` instead of the client SDK
3. Run: `node scripts/seed-countries.js`

### Option 3: Using Firebase Console

You can manually add countries through the Firebase Console:
1. Go to Firestore Database
2. Create a collection named `countries`
3. Add documents with the country code as the document ID
4. Copy the data structure from `scripts/seed-countries.js`

### Option 4: Using Firebase CLI

```bash
firebase firestore:import countries.json
```

## Data Structure

Each country document has the following structure (see `src/types/creator.ts` for the full TypeScript interface):

```typescript
{
  id: string;                    // ISO 3166-1 alpha-2 code
  code: string;                  // Same as id
  name: string;                  // Official country name
  nameNative?: string;           // Name in native language
  flag: string;                  // Flag emoji
  
  continent: string;             // e.g., "North America"
  region: string;                // e.g., "Northern America"
  
  currency: {
    code: string;                // ISO 4217 code (e.g., "USD")
    symbol: string;              // "$"
    name: string;                // "US Dollar"
  };
  vatRate?: number;              // VAT/GST rate (e.g., 0.20)
  
  minAge: number;                // Minimum age (default: 13)
  gdprCompliant: boolean;
  requiresTaxId: boolean;
  requiresVatNumber: boolean;
  
  distributionChannels: {
    amazon: boolean;
    apple: boolean;
    google: boolean;
    kobo: boolean;
    barnesNoble: boolean;
    direct: boolean;
  };
  
  timezones: string[];
  primaryLanguage: string;
  languages: string[];
  
  isActive: boolean;
  sortOrder: number;
  isPopular: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Firestore Indexes Required

No composite indexes are required for basic queries. However, if you plan to query by continent or region frequently, consider adding indexes:

```
countries: continent + isActive + sortOrder
countries: isPopular + isActive + sortOrder
```

## Security Rules

Add the following to your Firestore security rules:

```javascript
match /countries/{countryId} {
  // Countries are read-only for authenticated users
  allow read: if request.auth != null;
  allow write: if false; // Only admins can modify via console/scripts
}
```

## Updating Countries

To update country data:
1. Modify `scripts/seed-countries.js`
2. Run the seed script again (it will overwrite existing documents)
3. Or update individual documents via Firebase Console

## Adding New Countries

1. Add the country object to the `countries` array in `scripts/seed-countries.js`
2. Follow the existing structure
3. Run the seed script
4. Update the TypeScript types if needed

