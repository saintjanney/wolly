/**
 * Migration script to add default paymentInfo to all users who don't have it.
 *
 * Run from project root: node scripts/backfill-payment-info.js
 *
 * This script adds a default paymentInfo object to users who are missing it,
 * ensuring consistent document structure across all user documents.
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

const DEFAULT_PAYMENT_INFO = {
  payment_option: '',
  payout_schedule: '',
  payment_details: {}
};

async function main() {
  console.log('Starting paymentInfo backfill migration...\n');
  
  // Fetch all users
  console.log('Fetching users collection...');
  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} user(s).\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const data = userDoc.data();
    
    // Check if paymentInfo already exists
    if (data.paymentInfo !== undefined && data.paymentInfo !== null) {
      console.log(`  ⊘ Skipped user ${userId} (already has paymentInfo)`);
      skipped++;
      continue;
    }
    
    try {
      await db.collection('users').doc(userId).update({
        paymentInfo: DEFAULT_PAYMENT_INFO,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`  ✓ Added paymentInfo to user ${userId}`);
      updated++;
    } catch (error) {
      console.error(`  ✗ Error updating user ${userId}:`, error.message);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary:');
  console.log('='.repeat(60));
  console.log(`Total users: ${usersSnapshot.size}`);
  console.log(`Added paymentInfo: ${updated}`);
  console.log(`Already had paymentInfo: ${skipped}`);
  console.log('='.repeat(60));
  console.log('\n✓ Migration completed successfully!');
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
