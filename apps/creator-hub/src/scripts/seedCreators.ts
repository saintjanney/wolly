import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/book';
import { Genre } from '@/types/creator';

// Sample creator data
const sampleCreators: Partial<User>[] = [
  {
    uid: 'creator-001',
    email: 'sarah.johnson@example.com',
    displayName: 'Sarah Johnson',
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: new Date('1985-03-15'),
    phoneNumber: '+1-555-0123',
    countryOfResidence: 'US',
    selectedGenres: ['1', '3', '6'], // Fiction, Romance, Fantasy
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
    uid: 'creator-002',
    email: 'michael.chen@example.com',
    displayName: 'Michael Chen',
    firstName: 'Michael',
    lastName: 'Chen',
    dateOfBirth: new Date('1990-07-22'),
    phoneNumber: '+1-555-0456',
    countryOfResidence: 'CA',
    selectedGenres: ['2', '9', '10'], // Non-Fiction, Self-Help, Business
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
    uid: 'creator-003',
    email: 'elena.rodriguez@example.com',
    displayName: 'Elena Rodriguez',
    firstName: 'Elena',
    lastName: 'Rodriguez',
    dateOfBirth: new Date('1988-11-08'),
    phoneNumber: '+34-555-0789',
    countryOfResidence: 'ES',
    selectedGenres: ['4', '7', '19'], // Mystery & Thriller, Horror, Adventure
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
    uid: 'creator-004',
    email: 'david.kim@example.com',
    displayName: 'David Kim',
    firstName: 'David',
    lastName: 'Kim',
    dateOfBirth: new Date('1992-05-12'),
    phoneNumber: '+82-555-0321',
    countryOfResidence: 'KR',
    selectedGenres: ['5', '16', '20'], // Science Fiction, Poetry, Educational
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
    uid: 'creator-005',
    email: 'amanda.wilson@example.com',
    displayName: 'Amanda Wilson',
    firstName: 'Amanda',
    lastName: 'Wilson',
    dateOfBirth: new Date('1987-09-30'),
    phoneNumber: '+44-555-0654',
    countryOfResidence: 'GB',
    selectedGenres: ['8', '11', '14'], // Biography & Memoir, History, Travel
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
    uid: 'creator-006',
    email: 'james.murphy@example.com',
    displayName: 'James Murphy',
    firstName: 'James',
    lastName: 'Murphy',
    dateOfBirth: new Date('1983-12-03'),
    phoneNumber: '+61-555-0987',
    countryOfResidence: 'AU',
    selectedGenres: ['18', '17', '15'], // Comedy, Drama, Cooking
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

// Sample genres data
const sampleGenres: Genre[] = [
  { id: '1', name: 'Fiction', slug: 'fiction', description: 'Imaginative storytelling', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: 'Non-Fiction', slug: 'non-fiction', description: 'Factual and educational content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '3', name: 'Romance', slug: 'romance', description: 'Love stories and relationships', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '4', name: 'Mystery & Thriller', slug: 'mystery-thriller', description: 'Suspenseful and mysterious stories', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '5', name: 'Science Fiction', slug: 'science-fiction', description: 'Futuristic and scientific themes', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '6', name: 'Fantasy', slug: 'fantasy', description: 'Magical and supernatural elements', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '7', name: 'Horror', slug: 'horror', description: 'Scary and suspenseful content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '8', name: 'Biography & Memoir', slug: 'biography-memoir', description: 'Personal life stories', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '9', name: 'Self-Help', slug: 'self-help', description: 'Personal development and improvement', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '10', name: 'Business & Economics', slug: 'business-economics', description: 'Professional and economic content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '11', name: 'History', slug: 'history', description: 'Historical events and periods', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '12', name: 'Science & Technology', slug: 'science-technology', description: 'Scientific and technological content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '13', name: 'Health & Fitness', slug: 'health-fitness', description: 'Wellness and physical health', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '14', name: 'Travel', slug: 'travel', description: 'Travel guides and experiences', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '15', name: 'Cooking', slug: 'cooking', description: 'Recipes and culinary content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '16', name: 'Poetry', slug: 'poetry', description: 'Poetic and lyrical content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '17', name: 'Drama', slug: 'drama', description: 'Dramatic and theatrical content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '18', name: 'Comedy', slug: 'comedy', description: 'Humorous and entertaining content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '19', name: 'Adventure', slug: 'adventure', description: 'Exciting and adventurous stories', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '20', name: 'Educational', slug: 'educational', description: 'Learning and instructional content', isActive: true, bookCount: 0, createdAt: new Date(), updatedAt: new Date() }
];

export async function seedCreators() {
  try {
    console.log('🌱 Starting to seed creators...');

    // Seed genres first
    console.log('📚 Seeding genres...');
    for (const genre of sampleGenres) {
      try {
        await addDoc(collection(db, 'genres'), {
          ...genre,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Added genre: ${genre.name}`);
      } catch (_error) {
        console.log(`⚠️ Genre ${genre.name} might already exist`);
      }
    }

    // Seed creators
    console.log('👥 Seeding creators...');
    for (const creator of sampleCreators) {
      try {
        await addDoc(collection(db, 'users'), {
          ...creator,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          onboardingCompletedAt: serverTimestamp()
        });
        console.log(`✅ Added creator: ${creator.displayName}`);
      } catch (_error) {
        console.log(`⚠️ Creator ${creator.displayName} might already exist`);
      }
    }

    console.log('🎉 Creator seeding completed!');
    console.log(`📊 Seeded ${sampleCreators.length} creators and ${sampleGenres.length} genres`);
    
  } catch (error) {
    console.error('❌ Error seeding creators:', error);
    throw error;
  }
}

// Export for use in other scripts
export { sampleCreators, sampleGenres };
