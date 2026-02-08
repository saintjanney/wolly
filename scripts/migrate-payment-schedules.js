/**
 * Migration script to update user payment schedules to use payment_schedules collection references.
 *
 * Run from project root: node scripts/migrate-payment-schedules.js
 *
 * This script:
 * 1. Fetches all payment schedules from the payment_schedules collection
 * 2. Creates a mapping from old schedule values to document IDs
 * 3. Updates all users to use the new payout_schedule field with document ID references
 * 4. Removes the old payoutSchedule structure
 *
 * Note: This uses the Firebase Admin SDK which bypasses security rules.
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
  console.error('3. Run this script again\n');
  process.exit(1);
}

const db = admin.firestore();

/**
 * Build a mapping from old payment schedule values to payment_schedules document IDs
 * by matching the 'value' field
 */
function buildScheduleMapping(snapshot) {
  const mapping = {};
  
  snapshot.forEach(docSnap => {
    const value = docSnap.data().value?.toLowerCase() || '';
    if (value) {
      mapping[value] = docSnap.id;
      console.log(`  Mapped '${value}' -> ${docSnap.id} (${docSnap.data().display_name})`);
    }
  });
  
  return mapping;
}

async function main() {
  console.log('Starting payment schedule migration...\n');
  
  // Step 1: Fetch payment schedules and build mapping
  console.log('Step 1: Fetching payment schedules collection...');
  const schedulesSnapshot = await db.collection('payment_schedules').get();
  console.log(`Found ${schedulesSnapshot.size} payment schedule(s).\n`);
  
  if (schedulesSnapshot.size === 0) {
    console.error('ERROR: No payment schedules found in payment_schedules collection!');
    console.error('Please ensure the collection is populated before running this migration.');
    process.exit(1);
  }
  
  console.log('Building payment schedule mapping:');
  const scheduleMapping = buildScheduleMapping(schedulesSnapshot);
  console.log('\nMapping result:', scheduleMapping);
  
  if (Object.keys(scheduleMapping).length === 0) {
    console.error('\nERROR: Could not create any mappings!');
    console.error('Please check that payment schedules have valid "value" fields.');
    process.exit(1);
  }
  
  // Step 2: Fetch all users
  console.log('\nStep 2: Fetching users collection...');
  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} user(s).\n`);
  
  // Step 3: Update each user
  console.log('Step 3: Migrating user payment schedule data...');
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const data = userDoc.data();
    
    // Get old payment schedule value
    const oldSchedule = data.paymentInfo?.payoutSchedule;
    
    if (!oldSchedule) {
      console.log(`  ⊘ Skipped user ${userId} (no payment schedule set)`);
      skipped++;
      continue;
    }
    
    // Look up new payment schedule ID
    const newScheduleId = scheduleMapping[oldSchedule.toLowerCase()];
    
    if (!newScheduleId) {
      console.warn(`  ⚠ WARNING: No mapping found for schedule '${oldSchedule}' (user ${userId})`);
      errors++;
      continue;
    }
    
    try {
      // Update user with new structure
      await db.collection('users').doc(userId).update({
        'paymentInfo.payout_schedule': newScheduleId,
        'paymentInfo.payoutSchedule': admin.firestore.FieldValue.delete(), // Remove old structure
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`  ✓ Migrated user ${userId}: ${oldSchedule} → ${newScheduleId}`);
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
  console.log(`Skipped (no payment schedule): ${skipped}`);
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
