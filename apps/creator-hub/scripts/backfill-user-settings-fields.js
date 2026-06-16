/**
 * Optional one-time script to add Settings-backed fields to existing user documents.
 *
 * Run from project root: node scripts/backfill-user-settings-fields.js
 *
 * Not required for the app to work: Settings already uses fallbacks for missing fields,
 * and users get these fields when they first save. Use this only if you want every
 * existing user document to have the same shape (authorBio, socialLinks, preferences, paymentInfo).
 *
 * Note: This uses the Firebase client SDK. Your Firestore rules must allow writes to
 * the users collection from this context (e.g. development rules). For production,
 * consider using the Firebase Admin SDK with a service account instead.
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC2Y5LE3kfuv14Viz7pzcSbEZhdySOUbcM',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'wolly-1133d.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'wolly-1133d',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'wolly-1133d.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '550264739666',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:550264739666:web:889ef63529c127a1d8cc8b',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-8VGN263DL3',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULTS = {
  authorBio: '',
  socialLinks: {},
  preferences: {
    theme: 'light',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  paymentInfo: {
    paymentMethod: { type: 'bank_transfer', details: {} },
    payoutSchedule: 'monthly',
  },
};

async function main() {
  console.log('Fetching users collection...');
  const snapshot = await getDocs(collection(db, 'users'));
  console.log(`Found ${snapshot.size} user(s).`);

  let updated = 0;
  for (const docSnap of snapshot.docs) {
    const id = docSnap.id;
    const data = docSnap.data();
    const updates = { updatedAt: serverTimestamp() };

    if (data.authorBio === undefined) updates.authorBio = DEFAULTS.authorBio;
    if (data.socialLinks === undefined) updates.socialLinks = DEFAULTS.socialLinks;
    if (data.preferences === undefined) updates.preferences = DEFAULTS.preferences;
    if (data.paymentInfo === undefined) updates.paymentInfo = DEFAULTS.paymentInfo;

    if (Object.keys(updates).length <= 1) continue; // only updatedAt

    await updateDoc(doc(db, 'users', id), updates);
    updated++;
    console.log(`  Updated user ${id}`);
  }

  console.log(`Done. Updated ${updated} user(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
