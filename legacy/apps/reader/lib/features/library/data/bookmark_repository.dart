import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:wolly_mobile/features/library/domain/models/bookmark.dart';

class BookmarkRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  String? get _userId => _auth.currentUser?.uid;

  Future<List<Bookmark>> getBookmarks(String bookId) async {
    final uid = _userId;
    if (uid == null) return [];

    try {
      final snapshot = await _firestore
          .collection('bookmarks')
          .where('userId', isEqualTo: uid)
          .where('bookId', isEqualTo: bookId)
          .orderBy('createdAt', descending: true)
          .get();

      return snapshot.docs.map((doc) => Bookmark.fromFirestore(doc)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<Bookmark?> addBookmark({
    required String bookId,
    required String bookTitle,
    required int page,
    String? chapterTitle,
    String? note,
  }) async {
    final uid = _userId;
    if (uid == null) return null;

    try {
      final bookmark = Bookmark(
        id: '',
        userId: uid,
        bookId: bookId,
        bookTitle: bookTitle,
        page: page,
        chapterTitle: chapterTitle,
        note: note,
        createdAt: DateTime.now(),
      );

      final ref = await _firestore
          .collection('bookmarks')
          .add(bookmark.toFirestore());

      return Bookmark(
        id: ref.id,
        userId: uid,
        bookId: bookId,
        bookTitle: bookTitle,
        page: page,
        chapterTitle: chapterTitle,
        note: note,
        createdAt: bookmark.createdAt,
      );
    } catch (e) {
      return null;
    }
  }

  Future<void> deleteBookmark(String bookmarkId) async {
    try {
      await _firestore.collection('bookmarks').doc(bookmarkId).delete();
    } catch (_) {}
  }
}
