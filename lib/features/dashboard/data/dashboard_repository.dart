import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:wolly/features/library/domain/models/book.dart';

class DashboardRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get current user's reading progress
  Future<List<Book>> getUserReadingProgress() async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        return _getMockReadingProgress();
      }

      // Query user reading progress from Firestore
      final snapshot = await _firestore
          .collection('reading_progress')
          .where('userId', isEqualTo: currentUser.uid)
          .orderBy('lastRead', descending: true)
          .limit(10)
          .get();

      if (snapshot.docs.isEmpty) {
        return _getMockReadingProgress();
      }

      // Convert documents to Book objects
      List<Book> books = [];
      for (var doc in snapshot.docs) {
        final data = doc.data();
        final bookSnapshot = await _firestore
            .collection('epubs')
            .doc(data['bookId'])
            .get();
        
        if (bookSnapshot.exists) {
          final bookData = bookSnapshot.data()!;
          books.add(Book(
            title: bookData['title'] ?? '',
            genre: bookData['genre'] ?? '',
            downloadUrl: bookData['url'] ?? '',
            fileType: bookData['fileType'] ?? 'epub',
            isPublished: bookData['isPublished'] ?? false,
            coverUrl: bookData['coverUrl'],
            author: bookData['author'] ?? 'Unknown',
            pagesRead: data['pagesRead'] ?? 0,
            totalPages: data['totalPages'] ?? 100,
            lastRead: data['lastRead'] != null 
                ? (data['lastRead'] as Timestamp).toDate() 
                : DateTime.now(),
            percentageComplete: data['percentageComplete']?.toDouble() ?? 0.0,
            description: bookData['description'],
            rating: bookData['rating']?.toDouble() ?? 0.0,
          ));
        }
      }
      
      return books.isNotEmpty ? books : _getMockReadingProgress();
    } catch (e) {
      print('Error fetching reading progress: $e');
      return _getMockReadingProgress();
    }
  }

  // Get book recommendations based on user preferences and reading history
  Future<List<Book>> getBookRecommendations() async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        return _getMockRecommendations();
      }

      // Get user's genre preferences
      final userDoc = await _firestore
          .collection('users')
          .doc(currentUser.uid)
          .get();
          
      List<String> genrePrefs = [];
      if (userDoc.exists) {
        final data = userDoc.data();
        if (data != null && data['genre_prefs'] is List) {
          genrePrefs = List<String>.from(data['genre_prefs']);
        }
      }
      
      // Query books in preferred genres that are published
      QuerySnapshot booksSnapshot;
      if (genrePrefs.isNotEmpty) {
        booksSnapshot = await _firestore
            .collection('epubs')
            .where('genre', whereIn: genrePrefs)
            .where('isPublished', isEqualTo: true)
            .limit(10)
            .get();
      } else {
        booksSnapshot = await _firestore
            .collection('epubs')
            .where('isPublished', isEqualTo: true)
            .limit(10)
            .get();
      }

      if (booksSnapshot.docs.isEmpty) {
        return _getMockRecommendations();
      }

      // Convert documents to Book objects
      List<Book> books = [];
      for (var doc in booksSnapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        books.add(Book(
          title: data['title'] ?? '',
          genre: data['genre'] ?? '',
          downloadUrl: data['url'] ?? '',
          fileType: data['fileType'] ?? _getFileTypeFromUrl(data['url'] ?? ''),
          isPublished: data['isPublished'] ?? true,
          coverUrl: data['coverUrl'],
          author: data['author'] ?? 'Unknown',
          description: data['description'],
          rating: data['rating']?.toDouble() ?? 4.0,
        ));
      }
      
      return books.isNotEmpty ? books : _getMockRecommendations();
    } catch (e) {
      print('Error fetching recommendations: $e');
      return _getMockRecommendations();
    }
  }
  
  // Update reading progress for a book
  Future<bool> updateReadingProgress(String bookId, int pagesRead, int totalPages) async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        return false;
      }
      
      final percentageComplete = totalPages > 0 ? pagesRead / totalPages : 0.0;
      
      // Update or create reading progress document
      await _firestore
          .collection('reading_progress')
          .doc('${currentUser.uid}_$bookId')
          .set({
            'userId': currentUser.uid,
            'bookId': bookId,
            'pagesRead': pagesRead,
            'totalPages': totalPages,
            'lastRead': Timestamp.now(),
            'percentageComplete': percentageComplete,
          }, SetOptions(merge: true));
          
      return true;
    } catch (e) {
      print('Error updating reading progress: $e');
      return false;
    }
  }

  // Helper method to determine file type from URL
  String _getFileTypeFromUrl(String url) {
    if (url.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    } else if (url.toLowerCase().endsWith('.epub')) {
      return 'epub';
    } else {
      return 'unknown';
    }
  }
  
  // Mock data for reading progress when no data is available
  List<Book> _getMockReadingProgress() {
    return [
      Book(
        title: 'The Great Gatsby',
        genre: 'JjumLduQCVjFIAPG27xK', // Fiction genre ID
        downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/wolly-1133d.appspot.com/o/epubs%2FThe%20Great%20Gatsby.epub?alt=media',
        fileType: 'epub',
        isPublished: true,
        coverUrl: 'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg',
        author: 'F. Scott Fitzgerald',
        pagesRead: 120,
        totalPages: 180,
        lastRead: DateTime.now().subtract(const Duration(hours: 3)),
        percentageComplete: 0.67,
        description: 'The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald.',
        rating: 4.5,
      ),
      Book(
        title: '1984',
        genre: 'JjumLduQCVjFIAPG27xK', // Fiction genre ID
        downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/wolly-1133d.appspot.com/o/epubs%2F1984.epub?alt=media',
        fileType: 'epub',
        isPublished: true,
        coverUrl: 'https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg',
        author: 'George Orwell',
        pagesRead: 56,
        totalPages: 328,
        lastRead: DateTime.now().subtract(const Duration(days: 1)),
        percentageComplete: 0.17,
        description: 'A dystopian novel by English novelist George Orwell.',
        rating: 4.7,
      ),
    ];
  }
  
  // Mock data for recommendations when no data is available
  List<Book> _getMockRecommendations() {
    return [
      Book(
        title: 'Dune',
        genre: 'xzSP0Qofj8S5Gwov40zw', // Science Fiction genre ID
        downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/wolly-1133d.appspot.com/o/epubs%2FDune.epub?alt=media',
        fileType: 'epub',
        isPublished: true,
        coverUrl: 'https://m.media-amazon.com/images/I/A1u+2fY5yTL._AC_UF1000,1000_QL80_.jpg',
        author: 'Frank Herbert',
        description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange.',
        rating: 4.8,
      ),
      Book(
        title: 'The Hobbit',
        genre: 'JjumLduQCVjFIAPG27xK', // Fiction genre ID
        downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/wolly-1133d.appspot.com/o/epubs%2FThe%20Hobbit.epub?alt=media',
        fileType: 'epub',
        isPublished: true,
        coverUrl: 'https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg',
        author: 'J.R.R. Tolkien',
        description: 'Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling any farther than his pantry or cellar. But his contentment is disturbed when the wizard Gandalf and a company of dwarves arrive on his doorstep.',
        rating: 4.7,
      ),
      Book(
        title: 'Pride and Prejudice',
        genre: 'JjumLduQCVjFIAPG27xK', // Fiction genre ID
        downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/wolly-1133d.appspot.com/o/epubs%2FPride%20and%20Prejudice.epub?alt=media',
        fileType: 'epub',
        isPublished: true,
        coverUrl: 'https://m.media-amazon.com/images/I/71Q1tPupKjL._AC_UF1000,1000_QL80_.jpg',
        author: 'Jane Austen',
        description: 'The story follows the main character, Elizabeth Bennet, as she deals with issues of manners, upbringing, morality, education, and marriage in the society of the landed gentry of the British Regency.',
        rating: 4.5,
      ),
    ];
  }
} 