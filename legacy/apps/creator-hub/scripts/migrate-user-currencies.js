/**
 * Migration script to update user currencies to use supported_currencies collection references.
 *
 * Run from project root: node scripts/migrate-user-currencies.js
 *
 * This script:
 * 1. Fetches all currencies from the supported_currencies collection
 * 2. Creates a mapping from currency codes to document IDs
 * 3. Updates all users to include currency_id while preserving currency code
 * 4. Maintains backwards compatibility by keeping both fields
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

/**
 * Build a mapping from currency codes to document IDs
 */
function buildCurrencyMapping(snapshot) {
  const mapping = {};
  
  snapshot.forEach(docSnap => {
    const currencyCode = docSnap.data().currency_code;
    if (currencyCode) {
      mapping[currencyCode] = docSnap.id;
      console.log(`  Mapped '${currencyCode}' -> ${docSnap.id} (${docSnap.data().display_name})`);
    }
  });
  
  return mapping;
}

async function main() {
  console.log('Starting user currency migration...\n');
  
  // Step 1: Fetch supported currencies and build mapping
  console.log('Step 1: Fetching supported_currencies collection...');
  const currenciesSnapshot = await db.collection('supported_currencies').get();
  console.log(`Found ${currenciesSnapshot.size} supported currency(ies).\n`);
  
  if (currenciesSnapshot.size === 0) {
    console.error('ERROR: No supported currencies found!');
    console.error('Please run seed-supported-currencies.js first.');
    process.exit(1);
  }
  
  console.log('Building currency mapping:');
  const currencyMapping = buildCurrencyMapping(currenciesSnapshot);
  console.log('\nMapping result:', currencyMapping);
  
  if (Object.keys(currencyMapping).length === 0) {
    console.error('\nERROR: Could not create any mappings!');
    process.exit(1);
  }
  
  // Step 2: Fetch all users
  console.log('\nStep 2: Fetching users collection...');
  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} user(s).\n`);
  
  // Step 3: Update each user
  console.log('Step 3: Migrating user currency data...');
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let defaulted = 0;
  
  // Get GHS document ID as default for unsupported currencies
  const ghsId = currencyMapping['GHS'];
  if (!ghsId) {
    console.error('\nERROR: GHS currency not found in supported_currencies!');
    console.error('Cannot proceed with migration.');
    process.exit(1);
  }
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const data = userDoc.data();
    
    // Get current currency code
    const currentCurrencyCode = data.currency;
    
    // Look up currency document ID, default to GHS if not found
    let currencyId = currentCurrencyCode ? currencyMapping[currentCurrencyCode] : null;
    let finalCurrencyCode = currentCurrencyCode;
    let wasDefaulted = false;
    
    // If currency not supported or missing, default to GHS
    if (!currencyId) {
      currencyId = ghsId;
      finalCurrencyCode = 'GHS';
      wasDefaulted = true;
    }
    
    // Skip if already has correct currency_id
    if (data.currency_id === currencyId && data.currency === finalCurrencyCode) {
      console.log(`  ⊘ Skipped user ${userId} (already has currency_id: ${currencyId})`);
      skipped++;
      continue;
    }
    
    try {
      const updates = {
        currency_id: currencyId,
        currency: finalCurrencyCode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('users').doc(userId).update(updates);
      
      if (wasDefaulted) {
        console.log(`  ✓ Defaulted user ${userId}: ${currentCurrencyCode || 'none'} → GHS (${currencyId})`);
        defaulted++;
      } else {
        console.log(`  ✓ Migrated user ${userId}: ${finalCurrencyCode} → ${currencyId}`);
      }
      updated++;
    } catch (error) {
      console.error(`  ✗ Error updating user ${userId}:`, error.message);
      errors++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary:');
  console.log('='.repeat(60));
  console.log(`Total users: ${usersSnapshot.size}`);
  console.log(`Successfully migrated: ${updated}`);
  console.log(`  - Had currency, updated: ${updated - defaulted}`);
  console.log(`  - No currency, defaulted to GHS: ${defaulted}`);
  console.log(`Skipped (already correct): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(60));
  
  if (errors > 0) {
    console.log('\n⚠ Migration completed with errors. Please review the output above.');
    process.exit(1);
  } else {
    console.log('\n✓ Migration completed successfully!');
  }
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
