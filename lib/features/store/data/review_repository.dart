import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ReviewRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Returns true if the current user has already reviewed this book.
  Future<bool> hasReviewed(String bookId) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return false;
    final snap = await _firestore
        .collection('reviews')
        .where('bookId', isEqualTo: bookId)
        .where('userId', isEqualTo: uid)
        .limit(1)
        .get();
    return snap.docs.isNotEmpty;
  }

  /// Submits a review. Status starts as 'pending' for moderation.
  Future<void> submitReview({
    required String bookId,
    required String bookTitle,
    required double rating,
    required String content,
    String? reviewTitle,
  }) async {
    final user = _auth.currentUser;
    if (user == null) return;

    final docRef = _firestore.collection('reviews').doc();
    await docRef.set({
      'bookId': bookId,
      'userId': user.uid,
      'userName': user.displayName ?? user.email?.split('@').first ?? 'Reader',
      'rating': rating,
      'title': reviewTitle,
      'content': content,
      'isVerifiedPurchase': true,
      'status': 'pending',
      'helpfulVotes': 0,
      'reportCount': 0,
      'createdAt': Timestamp.now(),
      'updatedAt': Timestamp.now(),
    });

    // Update book's average rating (best-effort)
    try {
      final reviewsSnap = await _firestore
          .collection('reviews')
          .where('bookId', isEqualTo: bookId)
          .where('status', isEqualTo: 'approved')
          .get();
      final ratings = reviewsSnap.docs
          .map((d) => (d.data()['rating'] as num).toDouble())
          .toList();
      if (ratings.isNotEmpty) {
        final avg = ratings.reduce((a, b) => a + b) / ratings.length;
        await _firestore.collection('epubs').doc(bookId).update({
          'rating': double.parse(avg.toStringAsFixed(1)),
          'reviewCount': ratings.length,
        });
      }
    } catch (_) {}
  }
}
