const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, doc, setDoc, updateDoc, getDocs, query, where } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC2Y5LE3kfuv14Viz7pzcSbEZhdySOUbcM",
  authDomain: "wolly-1133d.firebaseapp.com",
  projectId: "wolly-1133d",
  storageBucket: "wolly-1133d.appspot.com",
  messagingSenderId: "550264739666",
  appId: "1:550264739666:web:889ef63529c127a1d8cc8b",
  measurementId: "G-8VGN263DL3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Creator data with temporary passwords
const creatorsWithPasswords = [
  {
    email: 'sarah.johnson@example.com',
    password: 'Sarah123!',
    displayName: 'Sarah Johnson',
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: new Date('1985-03-15'),
    phoneNumber: '+1-555-0123',
    countryOfResidence: 'US',
    selectedGenres: ['1', '3', '6'],
    customGenres: [],
    penName: 'S.J. Moonlight',
    bio: 'Award-winning romance novelist with over 20 published books. I specialize in contemporary and fantasy romance.',
    website: 'https://sjmoonlight.com',
    specialties: ['Romance Writing', 'Character Development', 'World Building'],
    writingExperience: 'Professional',
    onboardingCompleted: true,
    onboardingStep: 3,
    publishedBooks: 23,
    country: 'US',
    timezone: 'America/New_York',
    language: 'English',
    currency: 'USD',
    notificationSettings: {
      emailMarketing: true,
      salesUpdates: true,
      platformUpdates: true,
      weeklyDigest: false
    },
    totalRevenue: 125000,
    totalBooks: 23,
    totalSales: 45000,
    averageRating: 4.7,
    lastLoginAt: new Date(),
    onboardingCompletedAt: new Date('2024-01-15')
  },
  {
    email: 'michael.chen@example.com',
    password: 'Michael123!',
    displayName: 'Michael Chen',
    firstName: 'Michael',
    lastName: 'Chen',
    dateOfBirth: new Date('1990-07-22'),
    phoneNumber: '+1-555-0456',
    countryOfResidence: 'CA',
    selectedGenres: ['2', '9', '10'],
    customGenres: [],
    penName: 'Mike Chen',
    bio: 'Business consultant and self-help author. I help entrepreneurs build successful companies through practical strategies.',
    website: 'https://mikechenconsulting.com',
    specialties: ['Business Strategy', 'Leadership', 'Productivity'],
    writingExperience: 'Advanced',
    onboardingCompleted: true,
    onboardingStep: 3,
    publishedBooks: 8,
    country: 'CA',
    timezone: 'America/Toronto',
    language: 'English',
    currency: 'CAD',
    notificationSettings: {
      emailMarketing: true,
      salesUpdates: true,
      platformUpdates: false,
      weeklyDigest: true
    },
    totalRevenue: 45000,
    totalBooks: 8,
    totalSales: 12000,
    averageRating: 4.5,
    lastLoginAt: new Date(),
    onboardingCompletedAt: new Date('2024-02-01')
  },
  {
    email: 'elena.rodriguez@example.com',
    password: 'Elena123!',
    displayName: 'Elena Rodriguez',
    firstName: 'Elena',
    lastName: 'Rodriguez',
    dateOfBirth: new Date('1988-11-08'),
    phoneNumber: '+34-555-0789',
    countryOfResidence: 'ES',
    selectedGenres: ['4', '7', '19'],
    customGenres: ['Psychological Thriller'],
    penName: 'Elena Dark',
    bio: 'Spanish thriller writer known for psychological suspense novels. My books have been translated into 15 languages.',
    website: 'https://elenadark.com',
    specialties: ['Psychological Suspense', 'Plot Twists', 'Character Psychology'],
    writingExperience: 'Professional',
    onboardingCompleted: true,
    onboardingStep: 3,
    publishedBooks: 15,
    country: 'ES',
    timezone: 'Europe/Madrid',
    language: 'Spanish',
    currency: 'EUR',
    notificationSettings: {
      emailMarketing: false,
      salesUpdates: true,
      platformUpdates: true,
      weeklyDigest: false
    },
    totalRevenue: 89000,
    totalBooks: 15,
    totalSales: 28000,
    averageRating: 4.6,
    lastLoginAt: new Date(),
    onboardingCompletedAt: new Date('2024-01-20')
  },
  {
    email: 'david.kim@example.com',
    password: 'David123!',
    displayName: 'David Kim',
    firstName: 'David',
    lastName: 'Kim',
    dateOfBirth: new Date('1992-05-12'),
    phoneNumber: '+82-555-0321',
    countryOfResidence: 'KR',
    selectedGenres: ['5', '16', '20'],
    customGenres: [],
    penName: 'D.K. Future',
    bio: 'Science fiction writer and educator. I combine hard science with compelling storytelling to create immersive futures.',
    website: 'https://dkfuture.com',
    specialties: ['Hard Science Fiction', 'World Building', 'Scientific Accuracy'],
    writingExperience: 'Intermediate',
    onboardingCompleted: true,
    onboardingStep: 3,
    publishedBooks: 5,
    country: 'KR',
    timezone: 'Asia/Seoul',
    language: 'Korean',
    currency: 'KRW',
    notificationSettings: {
      emailMarketing: true,
      salesUpdates: true,
      platformUpdates: true,
      weeklyDigest: true
    },
    totalRevenue: 15000,
    totalBooks: 5,
    totalSales: 3500,
    averageRating: 4.3,
    lastLoginAt: new Date(),
    onboardingCompletedAt: new Date('2024-02-10')
  },
  {
    email: 'amanda.wilson@example.com',
    password: 'Amanda123!',
    displayName: 'Amanda Wilson',
    firstName: 'Amanda',
    lastName: 'Wilson',
    dateOfBirth: new Date('1987-09-30'),
    phoneNumber: '+44-555-0654',
    countryOfResidence: 'GB',
    selectedGenres: ['8', '11', '14'],
    customGenres: [],
    penName: 'A.W. Historian',
    bio: 'Historian and travel writer. I specialize in bringing historical periods to life through personal stories and travel experiences.',
    website: 'https://awhistorian.com',
    specialties: ['Historical Research', 'Travel Writing', 'Biography'],
    writingExperience: 'Advanced',
    onboardingCompleted: true,
    onboardingStep: 3,
    publishedBooks: 12,
    country: 'GB',
    timezone: 'Europe/London',
    language: 'English',
    currency: 'GBP',
    notificationSettings: {
      emailMarketing: true,
      salesUpdates: false,
      platformUpdates: true,
      weeklyDigest: false
    },
    totalRevenue: 35000,
    totalBooks: 12,
    totalSales: 8500,
    averageRating: 4.4,
    lastLoginAt: new Date(),
    onboardingCompletedAt: new Date('2024-01-25')
  },
  {
    email: 'james.murphy@example.com',
    password: 'James123!',
    displayName: 'James Murphy',
    firstName: 'James',
    lastName: 'Murphy',
    dateOfBirth: new Date('1983-12-03'),
    phoneNumber: '+61-555-0987',
    countryOfResidence: 'AU',
    selectedGenres: ['18', '17', '15'],
    customGenres: ['Food Comedy'],
    penName: 'Jimmy Chef',
    bio: 'Comedy writer and chef. I write humorous books about cooking, food culture, and the hilarious side of kitchen life.',
    website: 'https://jimmychef.com',
    specialties: ['Comedy Writing', 'Food Writing', 'Humor'],
    writingExperience: 'Intermediate',
    onboardingCompleted: true,
    onboardingStep: 3,
    publishedBooks: 7,
    country: 'AU',
    timezone: 'Australia/Sydney',
    language: 'English',
    currency: 'AUD',
    notificationSettings: {
      emailMarketing: true,
      salesUpdates: true,
      platformUpdates: true,
      weeklyDigest: true
    },
    totalRevenue: 22000,
    totalBooks: 7,
    totalSales: 6200,
    averageRating: 4.2,
    lastLoginAt: new Date(),
    onboardingCompletedAt: new Date('2024-02-05')
  }
];

async function createAuthAccounts() {
  try {
    console.log('🔐 Starting to create Firebase Auth accounts...');

    for (const creator of creatorsWithPasswords) {
      try {
        // Create Firebase Auth account
        console.log(`Creating auth account for ${creator.email}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, creator.email, creator.password);
        const authUid = userCredential.user.uid;
        
        console.log(`✅ Created auth account for ${creator.email} with UID: ${authUid}`);

        // Create user document in Firestore with the auth UID
        const userData = {
          uid: authUid,
          email: creator.email,
          displayName: creator.displayName,
          firstName: creator.firstName,
          lastName: creator.lastName,
          dateOfBirth: creator.dateOfBirth,
          phoneNumber: creator.phoneNumber,
          countryOfResidence: creator.countryOfResidence,
          selectedGenres: creator.selectedGenres,
          customGenres: creator.customGenres,
          penName: creator.penName,
          bio: creator.bio,
          website: creator.website,
          specialties: creator.specialties,
          writingExperience: creator.writingExperience,
          onboardingCompleted: creator.onboardingCompleted,
          onboardingStep: creator.onboardingStep,
          publishedBooks: creator.publishedBooks,
          country: creator.country,
          timezone: creator.timezone,
          language: creator.language,
          currency: creator.currency,
          notificationSettings: creator.notificationSettings,
          totalRevenue: creator.totalRevenue,
          totalBooks: creator.totalBooks,
          totalSales: creator.totalSales,
          averageRating: creator.averageRating,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          onboardingCompletedAt: creator.onboardingCompletedAt
        };

        // Create user document in Firestore using the Firebase Auth UID as the document ID
        // This ensures the document ID matches the Firebase Auth UID
        const userDocRef = doc(db, 'users', authUid);
        await setDoc(userDocRef, userData);
        console.log(`✅ Created Firestore document for ${creator.displayName} with document ID: ${authUid}`);

      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`⚠️ Auth account for ${creator.email} already exists`);
        } else {
          console.error(`❌ Error creating account for ${creator.email}:`, error.message);
        }
      }
    }

    console.log('🎉 Firebase Auth account creation completed!');
    console.log('\n📋 Login Credentials:');
    console.log('===================');
    creatorsWithPasswords.forEach(creator => {
      console.log(`Email: ${creator.email}`);
      console.log(`Password: ${creator.password}`);
      console.log(`Name: ${creator.displayName} (${creator.penName})`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error creating auth accounts:', error);
    process.exit(1);
  }
}

// Run the script
createAuthAccounts();
