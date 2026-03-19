import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class PurchaseRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  String? get _userId => _auth.currentUser?.uid;

  /// Returns true if the current user already owns this book.
  Future<bool> checkPurchase(String bookId) async {
    final uid = _userId;
    if (uid == null) return false;

    try {
      final doc = await _firestore
          .collection('purchases')
          .doc('${uid}_$bookId')
          .get();
      return doc.exists;
    } catch (_) {
      return false;
    }
  }

  /// Records a completed purchase in Firestore.
  Future<void> recordPurchase({
    required String bookId,
    required String bookTitle,
    required String reference,
    required int amountInPesewas,
  }) async {
    final uid = _userId;
    if (uid == null) return;

    await _firestore
        .collection('purchases')
        .doc('${uid}_$bookId')
        .set({
      'userId': uid,
      'bookId': bookId,
      'bookTitle': bookTitle,
      'reference': reference,
      'amountInPesewas': amountInPesewas,
      'currency': 'GHS',
      'purchasedAt': Timestamp.now(),
    });
  }

  /// Returns full purchase history for the current user, newest first.
  Future<List<Map<String, dynamic>>> getPurchaseHistory() async {
    final uid = _userId;
    if (uid == null) return [];

    try {
      final snapshot = await _firestore
          .collection('purchases')
          .where('userId', isEqualTo: uid)
          .orderBy('purchasedAt', descending: true)
          .get();
      return snapshot.docs.map((d) => {'id': d.id, ...d.data()}).toList();
    } catch (_) {
      return [];
    }
  }

  /// Returns the list of book IDs the current user has purchased.
  Future<List<String>> getUserPurchasedBookIds() async {
    final uid = _userId;
    if (uid == null) return [];

    try {
      final snapshot = await _firestore
          .collection('purchases')
          .where('userId', isEqualTo: uid)
          .get();
      return snapshot.docs
          .map((doc) => (doc.data()['bookId'] as String?) ?? '')
          .where((id) => id.isNotEmpty)
          .toList();
    } catch (_) {
      return [];
    }
  }
}
