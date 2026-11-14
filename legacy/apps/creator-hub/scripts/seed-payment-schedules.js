/**
 * Seed script to populate the payment_schedules collection in Firestore.
 *
 * Run from project root: node scripts/seed-payment-schedules.js
 *
 * This creates 4 payment schedule documents with display names, descriptions,
 * values, and sort order.
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

const PAYMENT_SCHEDULES = [
  {
    display_name: 'Monthly',
    description: 'Payments made on the first working day of the next month',
    value: 'monthly',
    sort_order: 1
  },
  {
    display_name: 'Weekly',
    description: 'Payments made every Monday',
    value: 'weekly',
    sort_order: 2
  },
  {
    display_name: 'Bi-weekly',
    description: 'Payments made every other Monday',
    value: 'biweekly',
    sort_order: 3
  },
  {
    display_name: 'Quarterly',
    description: 'Payments made on the first working day of each quarter',
    value: 'quarterly',
    sort_order: 4
  }
];

async function main() {
  console.log('Seeding payment_schedules collection...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const schedule of PAYMENT_SCHEDULES) {
    try {
      // Check if a document with this value already exists
      const existingSnapshot = await db.collection('payment_schedules')
        .where('value', '==', schedule.value)
        .get();
      
      if (!existingSnapshot.empty) {
        console.log(`  ⊘ Skipped '${schedule.display_name}' (already exists with ID: ${existingSnapshot.docs[0].id})`);
        skipped++;
        continue;
      }
      
      // Create new document
      const docRef = await db.collection('payment_schedules').add({
        ...schedule,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`  ✓ Created '${schedule.display_name}' with ID: ${docRef.id}`);
      created++;
    } catch (error) {
      console.error(`  ✗ Error creating '${schedule.display_name}':`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Seeding Summary:');
  console.log('='.repeat(60));
  console.log(`Total schedules: ${PAYMENT_SCHEDULES.length}`);
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
