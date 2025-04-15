import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:wolly/features/dashboard/domain/models/reading_progress.dart';
import 'package:wolly/features/dashboard/domain/models/book_recommendation.dart';

class DashboardRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get current user's reading progress - using mock data
  Future<List<ReadingProgress>> getUserReadingProgress() async {
    // Return mock data instead of making API calls
    return [
      ReadingProgress(
        bookId: 'book1',
        title: 'The Great Gatsby',
        coverUrl: 'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg',
        pagesRead: 120,
        totalPages: 180,
        lastRead: DateTime.now().subtract(const Duration(hours: 3)),
        percentageComplete: 0.67,
      ),
      ReadingProgress(
        bookId: 'book2',
        title: '1984',
        coverUrl: 'https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg',
        pagesRead: 56,
        totalPages: 328,
        lastRead: DateTime.now().subtract(const Duration(days: 1)),
        percentageComplete: 0.17,
      ),
      ReadingProgress(
        bookId: 'book3',
        title: 'To Kill a Mockingbird',
        coverUrl: 'https://m.media-amazon.com/images/I/71FxgtFKcQL._AC_UF1000,1000_QL80_.jpg',
        pagesRead: 212,
        totalPages: 281,
        lastRead: DateTime.now().subtract(const Duration(hours: 12)),
        percentageComplete: 0.75,
      ),
    ];
  }

  // Get book recommendations - using mock data
  Future<List<BookRecommendation>> getBookRecommendations() async {
    // Return mock data instead of making API calls
    return [
      BookRecommendation(
        id: 'rec1',
        title: 'Dune',
        author: 'Frank Herbert',
        coverUrl: 'https://m.media-amazon.com/images/I/A1u+2fY5yTL._AC_UF1000,1000_QL80_.jpg',
        genre: 'Science Fiction',
        description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange.',
        fileType: 'epub',
        downloadUrl: '',
        rating: 4.8,
      ),
      BookRecommendation(
        id: 'rec2',
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        coverUrl: 'https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg',
        genre: 'Fantasy',
        description: 'Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling any farther than his pantry or cellar. But his contentment is disturbed when the wizard Gandalf and a company of dwarves arrive on his doorstep.',
        fileType: 'epub',
        downloadUrl: '',
        rating: 4.7,
      ),
      BookRecommendation(
        id: 'rec3',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        coverUrl: 'https://m.media-amazon.com/images/I/71Q1tPupKjL._AC_UF1000,1000_QL80_.jpg',
        genre: 'Classic',
        description: 'The story follows the main character, Elizabeth Bennet, as she deals with issues of manners, upbringing, morality, education, and marriage in the society of the landed gentry of the British Regency.',
        fileType: 'pdf',
        downloadUrl: '',
        rating: 4.5,
      ),
      BookRecommendation(
        id: 'rec4',
        title: 'Project Hail Mary',
        author: 'Andy Weir',
        coverUrl: 'https://m.media-amazon.com/images/I/81wE+jTX4RL._AC_UF1000,1000_QL80_.jpg',
        genre: 'Science Fiction',
        description: 'A lone astronaut must save the earth from disaster in this incredible new science-based thriller from the #1 New York Times bestselling author of The Martian.',
        fileType: 'epub',
        downloadUrl: '',
        rating: 4.9,
      ),
      BookRecommendation(
        id: 'rec5',
        title: 'Atomic Habits',
        author: 'James Clear',
        coverUrl: 'https://m.media-amazon.com/images/I/81wgcld4wxL._AC_UF1000,1000_QL80_.jpg',
        genre: 'Self-Help',
        description: 'A revolutionary system to get 1 percent better every day. People think when you want to change your life, you need to think big. But world-renowned habits expert James Clear has discovered another way.',
        fileType: 'pdf',
        downloadUrl: '',
        rating: 4.8,
      ),
      BookRecommendation(
        id: 'rec6',
        title: 'The Midnight Library',
        author: 'Matt Haig',
        coverUrl: 'https://m.media-amazon.com/images/I/81tCtHFtOgL._AC_UF1000,1000_QL80_.jpg',
        genre: 'Fiction',
        description: 'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.',
        fileType: 'epub',
        downloadUrl: '',
        rating: 4.4,
      ),
    ];
  }

  // Helper method to determine file type from URL
  String _getFileTypeFromUrl(String url) {
    if (url.toLowerCase().contains('.pdf')) {
      return 'pdf';
    } else if (url.toLowerCase().contains('.epub')) {
      return 'epub';
    } else {
      return 'unknown';
    }
  }
} 