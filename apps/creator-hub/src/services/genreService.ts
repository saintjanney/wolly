import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, type Genre as SchemaGenre } from '@wolly/schema';
import { Genre } from '@/types/creator';

/**
 * Reads/writes the real `genres` Firestore collection — the same collection the
 * Flutter reader lists and that `epubs.genre` references by document id.
 *
 * A built-in seed list is used as a fallback the first time the collection is
 * empty so onboarding / genre selection always has options; once genres exist
 * in Firestore those are the source of truth.
 */
const SEED_GENRES: { name: string; slug: string; description: string }[] = [
  { name: 'Fiction', slug: 'fiction', description: 'Imaginative storytelling' },
  { name: 'Non-Fiction', slug: 'non-fiction', description: 'Factual and educational content' },
  { name: 'Romance', slug: 'romance', description: 'Love stories and relationships' },
  { name: 'Mystery & Thriller', slug: 'mystery-thriller', description: 'Suspenseful and mysterious stories' },
  { name: 'Science Fiction', slug: 'science-fiction', description: 'Futuristic and scientific themes' },
  { name: 'Fantasy', slug: 'fantasy', description: 'Magical and supernatural elements' },
  { name: 'Horror', slug: 'horror', description: 'Scary and suspenseful content' },
  { name: 'Biography & Memoir', slug: 'biography-memoir', description: 'Personal life stories' },
  { name: 'Self-Help', slug: 'self-help', description: 'Personal development and improvement' },
  { name: 'Business & Economics', slug: 'business-economics', description: 'Professional and economic content' },
  { name: 'History', slug: 'history', description: 'Historical events and periods' },
  { name: 'Science & Technology', slug: 'science-technology', description: 'Scientific and technological content' },
  { name: 'Health & Fitness', slug: 'health-fitness', description: 'Wellness and physical health' },
  { name: 'Travel', slug: 'travel', description: 'Travel guides and experiences' },
  { name: 'Cooking', slug: 'cooking', description: 'Recipes and culinary content' },
  { name: 'Poetry', slug: 'poetry', description: 'Poetic and lyrical content' },
  { name: 'Drama', slug: 'drama', description: 'Dramatic and theatrical content' },
  { name: 'Comedy', slug: 'comedy', description: 'Humorous and entertaining content' },
  { name: 'Adventure', slug: 'adventure', description: 'Exciting and adventurous stories' },
  { name: 'Educational', slug: 'educational', description: 'Learning and instructional content' },
];

const slugify = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const toCreatorGenre = (id: string, raw: Partial<SchemaGenre>): Genre => ({
  id,
  name: raw.name ?? 'Unnamed',
  slug: raw.slug ?? slugify(raw.name ?? ''),
  description: raw.description ?? '',
  isActive: raw.isActive ?? true,
  bookCount: raw.bookCount ?? 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export class GenreService {
  /** Returns all genres from Firestore, seeding the collection if it's empty. */
  static async getGenres(): Promise<Genre[]> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.GENRES));

    if (snapshot.empty) {
      await GenreService.seedGenres();
      const seeded = await getDocs(collection(db, COLLECTIONS.GENRES));
      return seeded.docs.map((d) => toCreatorGenre(d.id, d.data() as Partial<SchemaGenre>));
    }

    return snapshot.docs.map((d) => toCreatorGenre(d.id, d.data() as Partial<SchemaGenre>));
  }

  /** Persists a new custom genre (used by onboarding) and returns it. */
  static async addCustomGenre(genreName: string): Promise<Genre> {
    const name = genreName.trim();
    // Reuse an existing genre with the same name if present.
    const existing = (await GenreService.getGenres()).find(
      (g) => g.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;

    const docRef = await addDoc(collection(db, COLLECTIONS.GENRES), {
      name,
      slug: slugify(name),
      description: `Custom genre: ${name}`,
      isActive: true,
      bookCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      name,
      slug: slugify(name),
      description: `Custom genre: ${name}`,
      isActive: true,
      bookCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Resolves a free-text category/genre name to a `genres` document id, creating
   * the genre if it doesn't exist yet. This is what lets a book published in the
   * hub appear under the right genre in the reader (`epubs.genre` = this id).
   */
  static async ensureGenreId(name: string | undefined): Promise<string | null> {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    const genre = await GenreService.addCustomGenre(trimmed);
    return genre.id;
  }

  /** Writes the built-in seed genres into an empty `genres` collection. */
  private static async seedGenres(): Promise<void> {
    await Promise.all(
      SEED_GENRES.map((g) =>
        addDoc(collection(db, COLLECTIONS.GENRES), {
          ...g,
          isActive: true,
          bookCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      ),
    );
  }
}
