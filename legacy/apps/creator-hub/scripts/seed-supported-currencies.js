/**
 * Seed script to populate the supported_currencies collection in Firestore.
 *
 * Run from project root: node scripts/seed-supported-currencies.js
 *
 * This creates currency documents with currency codes, symbols, payout thresholds,
 * and display information.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'wolly-1133d';
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const hasServiceAccountKey = fs.existsSync(serviceAccountPath);

try {
  if (hasServiceAccountKey) {
    console.log('Using service account key from serviceAccountKey.json\n');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });
  } else {
    console.log('Using Application Default Credentials\n');
    admin.initializeApp({
      projectId: projectId,
    });
  }
  console.log(`Initialized Firebase Admin for project: ${projectId}\n`);
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

const SUPPORTED_CURRENCIES = [
  {
    currency_code: 'GHS',
    display_name: 'Ghanaian Cedi',
    symbol: '₵',
    payout_threshold: 100,
    is_active: true,
    sort_order: 1
  },
  // Additional currencies can be added here later
];

async function main() {
  console.log('Seeding supported_currencies collection...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const currency of SUPPORTED_CURRENCIES) {
    try {
      // Check if a document with this currency_code already exists
      const existingSnapshot = await db.collection('supported_currencies')
        .where('currency_code', '==', currency.currency_code)
        .get();
      
      if (!existingSnapshot.empty) {
        console.log(`  ⊘ Skipped '${currency.display_name}' (${currency.currency_code}) - already exists with ID: ${existingSnapshot.docs[0].id}`);
        skipped++;
        continue;
      }
      
      // Create new document
      const docRef = await db.collection('supported_currencies').add({
        ...currency,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`  ✓ Created '${currency.display_name}' (${currency.currency_code}) with ID: ${docRef.id}`);
      created++;
    } catch (error) {
      console.error(`  ✗ Error creating '${currency.display_name}':`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Seeding Summary:');
  console.log('='.repeat(60));
  console.log(`Total currencies: ${SUPPORTED_CURRENCIES.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log('='.repeat(60));
  console.log('\n✓ Seeding completed successfully!');
}

main()
  .then(() => {
    console.log('\nExiting...');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFATAL ERROR:', err);
    process.exit(1);
  });
