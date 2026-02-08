/**
 * Migration script to update user payment methods to use payment_methods collection references.
 *
 * Run from project root: node scripts/migrate-payment-methods.js
 *
 * This script:
 * 1. Fetches all payment methods from the payment_methods collection
 * 2. Creates a mapping from old payment method types to document IDs
 * 3. Updates all users to use the new payment_option field with document ID references
 * 4. Removes the old paymentMethod.type structure
 *
 * Note: This uses the Firebase Admin SDK which bypasses security rules.
 * 
 * AUTHENTICATION OPTIONS:
 * 
 * Option 1: Use Application Default Credentials (recommended for development)
 *   Run: firebase login
 *   Then: export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/yourproject_credentials.json"
 * 
 * Option 2: Use a Service Account (recommended for production)
 *   1. Download service account key from Firebase Console > Project Settings > Service Accounts
 *   2. Save the JSON file to your project (e.g., serviceAccountKey.json)
 *   3. Add to .gitignore: echo "serviceAccountKey.json" >> .gitignore
 *   4. Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 *   5. Run this script
 * 
 * Option 3: Emulator (for testing)
 *   Set: export FIRESTORE_EMULATOR_HOST="localhost:8080"
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin with project ID from environment or default
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'wolly-1133d';

// Check for service account key file in project root
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
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}\n`);
    admin.initializeApp({
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
  console.error('\nPLEASE SET UP AUTHENTICATION:');
  console.error('1. Download a service account key from Firebase Console');
  console.error('2. Save it as "serviceAccountKey.json" in the project root');
  console.error('3. Add serviceAccountKey.json to .gitignore');
  console.error('4. Run this script again\n');
  console.error('Or set GOOGLE_APPLICATION_CREDENTIALS environment variable\n');
  process.exit(1);
}

const db = admin.firestore();

/**
 * Build a mapping from old payment method types to payment_methods document IDs
 * by matching display_name patterns
 */
function buildMethodMapping(snapshot) {
  const mapping = {};
  
  snapshot.forEach(docSnap => {
    const displayName = docSnap.data().display_name?.toLowerCase() || '';
    
    // Match based on display_name patterns
    if (displayName.includes('bank') || displayName.includes('transfer') || displayName.includes('account')) {
      mapping['bank_transfer'] = docSnap.id;
      console.log(`  Mapped 'bank_transfer' -> ${docSnap.id} (${docSnap.data().display_name})`);
    } else if (displayName.includes('paypal')) {
      mapping['paypal'] = docSnap.id;
      console.log(`  Mapped 'paypal' -> ${docSnap.id} (${docSnap.data().display_name})`);
    } else if (displayName.includes('stripe')) {
      mapping['stripe'] = docSnap.id;
      console.log(`  Mapped 'stripe' -> ${docSnap.id} (${docSnap.data().display_name})`);
    }
  });
  
  return mapping;
}

async function main() {
  console.log('Starting payment method migration...\n');
  
  // Step 1: Fetch payment methods and build mapping
  console.log('Step 1: Fetching payment methods collection...');
  const methodsSnapshot = await db.collection('payment_methods').get();
  console.log(`Found ${methodsSnapshot.size} payment method(s).\n`);
  
  if (methodsSnapshot.size === 0) {
    console.error('ERROR: No payment methods found in payment_methods collection!');
    console.error('Please ensure the collection is populated before running this migration.');
    process.exit(1);
  }
  
  console.log('Building payment method mapping:');
  const methodMapping = buildMethodMapping(methodsSnapshot);
  console.log('\nMapping result:', methodMapping);
  
  if (Object.keys(methodMapping).length === 0) {
    console.error('\nERROR: Could not create any mappings!');
    console.error('Please check that payment methods have recognizable display_name values.');
    process.exit(1);
  }
  
  // Step 2: Fetch all users
  console.log('\nStep 2: Fetching users collection...');
  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} user(s).\n`);
  
  // Step 3: Update each user
  console.log('Step 3: Migrating user payment data...');
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const data = userDoc.data();
    
    // Get old payment method type
    const oldType = data.paymentInfo?.paymentMethod?.type;
    const payoutSchedule = data.paymentInfo?.payoutSchedule || 'monthly';
    
    if (!oldType) {
      console.log(`  ⊘ Skipped user ${userId} (no payment method set)`);
      skipped++;
      continue;
    }
    
    // Look up new payment option ID
    const newPaymentOptionId = methodMapping[oldType];
    
    if (!newPaymentOptionId) {
      console.warn(`  ⚠ WARNING: No mapping found for type '${oldType}' (user ${userId})`);
      errors++;
      continue;
    }
    
    try {
      // Update user with new structure
      await db.collection('users').doc(userId).update({
        'paymentInfo.payment_option': newPaymentOptionId,
        'paymentInfo.payoutSchedule': payoutSchedule,
        'paymentInfo.paymentMethod': admin.firestore.FieldValue.delete(), // Remove old structure
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`  ✓ Migrated user ${userId}: ${oldType} → ${newPaymentOptionId}`);
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
  console.log(`Skipped (no payment method): ${skipped}`);
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
