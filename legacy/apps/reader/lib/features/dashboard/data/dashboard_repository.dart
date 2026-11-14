import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:wolly_mobile/core/utils/user_fields.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';

/// Home-screen data.
///
/// Returns empty lists when there is nothing to show. It used to substitute
/// hardcoded sample books (The Great Gatsby, 1984, ...) whenever a query
/// returned nothing or threw, which put books on the production home screen that
/// do not exist: their download URLs return HTTP 403, so tapping one failed. The
/// screens already render nothing for an empty list, so the fallback was worse
/// than the behaviour it replaced, and it hid real query failures exactly the way
/// the Library screen's swallowed error did.
class DashboardRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get current user's reading progress
  Future<List<Book>> getUserReadingProgress() async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        return [];
      }

      // Query user reading progress from Firestore
      final snapshot = await _firestore
          .collection('reading_progress')
          .where('userId', isEqualTo: currentUser.uid)
          .orderBy('lastRead', descending: true)
          .limit(10)
          .get();

      if (snapshot.docs.isEmpty) {
        return [];
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
            id: bookSnapshot.id,
            authorId: bookData['ownerUserId'],
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
            price: (bookData['price'] ?? 0.0).toDouble(),
            isFree: bookData['isFree'] ?? (bookData['price'] == null || bookData['price'] == 0),
          ));
        }
      }
      
      return books;
    } catch (e) {
      assert(() {
        // ignore: avoid_print
        print('getUserReadingProgress failed: $e');
        return true;
      }());
      return [];
    }
  }

  // Get book recommendations based on user preferences and reading history
  Future<List<Book>> getBookRecommendations() async {
    try {
      final currentUser = _auth.currentUser;
      if (currentUser == null) {
        return [];
      }

      // Get user's genre preferences
      final userDoc = await _firestore
          .collection('users')
          .doc(currentUser.uid)
          .get();
          
      final genrePrefs = genrePrefsFrom(userDoc.data());
      
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
        return [];
      }

      // Convert documents to Book objects
      List<Book> books = [];
      for (var doc in booksSnapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        books.add(Book(
          id: doc.id,
          authorId: data['ownerUserId'],
          title: data['title'] ?? '',
          genre: data['genre'] ?? '',
          downloadUrl: data['url'] ?? '',
          fileType: data['fileType'] ?? _getFileTypeFromUrl(data['url'] ?? ''),
          isPublished: data['isPublished'] ?? true,
          coverUrl: data['coverUrl'],
          author: data['author'] ?? 'Unknown',
          description: data['description'],
          rating: data['rating']?.toDouble() ?? 4.0,
          price: (data['price'] ?? 0.0).toDouble(),
          isFree: data['isFree'] ?? (data['price'] == null || data['price'] == 0),
        ));
      }
      
      return books;
    } catch (e) {
      assert(() {
        // ignore: avoid_print
        print('getBookRecommendations failed: $e');
        return true;
      }());
      return [];
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
      assert(() {
        // ignore: avoid_print
        print('updateReadingProgress failed: $e');
        return true;
      }());
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
}
