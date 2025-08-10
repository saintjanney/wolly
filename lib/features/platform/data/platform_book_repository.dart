import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../domain/models/platform_book.dart';

// Temporary fallback user for development when FirebaseAuth is not initialized
const String kDevFallbackUserId = 'Vcx6MznZITTdl9hhM9AmpIeOpiE3';

class PlatformBookRepository {
  final FirebaseFirestore firestore;
  final FirebaseAuth auth;

  PlatformBookRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : firestore = firestore ?? FirebaseFirestore.instance,
        auth = auth ?? FirebaseAuth.instance;

  Stream<List<PlatformBook>> streamMyBooks() {
    final uid = auth.currentUser?.uid ?? kDevFallbackUserId;
    return firestore
        .collection('books')
        .where('ownerUserId', isEqualTo: uid)
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => PlatformBook.fromJson(d.data(), id: d.id))
            .toList());
  }

  Future<void> createDraft(PlatformBook book) async {
    await firestore
        .collection('books')
        .doc(book.id)
        .set(book.toJson());
  }

  Future<void> setPublishStatus({required String bookId, required bool isPublished}) async {
    await firestore.collection('books').doc(bookId).update({
      'isPublished': isPublished,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deleteBook({required String bookId}) async {
    await firestore.collection('books').doc(bookId).delete();
  }
}

