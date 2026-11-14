import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class PurchaseRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  String? get _userId => _auth.currentUser?.uid;

  /// Whether the current user owns this book.
  ///
  /// Requires `status == 'completed'`. The mere existence of the document is NOT
  /// ownership: `initializePaystackCheckout` creates it as `pending` before the
  /// reader has paid anything, so treating existence as ownership would hand out
  /// every book for free. A missing `status` is also treated as unpaid; no such
  /// documents exist, and being strict is the safe direction.
  Future<bool> checkPurchase(String bookId) async {
    final uid = _userId;
    if (uid == null) return false;

    try {
      final doc = await _firestore
          .collection('purchases')
          .doc('${uid}_$bookId')
          .get();
      if (!doc.exists) return false;
      return doc.data()?['status'] == 'completed';
    } catch (_) {
      return false;
    }
  }

  /// The reference of an in-flight checkout for this book, if there is one.
  ///
  /// Lets the app resume verification after being killed mid-payment: the
  /// reference lives on the server-created pending document, so it does not
  /// depend on the app keeping local state.
  Future<String?> pendingReference(String bookId) async {
    final uid = _userId;
    if (uid == null) return null;
    try {
      final doc = await _firestore
          .collection('purchases')
          .doc('${uid}_$bookId')
          .get();
      final data = doc.data();
      if (data == null || data['status'] == 'completed') return null;
      return data['reference'] as String?;
    } catch (_) {
      return null;
    }
  }

  // recordPurchase() was removed deliberately.
  //
  // It wrote the purchase document from the client, and the caller invoked it as
  // soon as the Paystack browser opened, so opening checkout granted ownership
  // without paying. Security rules now deny client writes to `purchases`
  // entirely; creation and completion belong to the functions in
  // services/payments. See PaystackService.

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
          .where((doc) => doc.data()['status'] == 'completed')
          .map((doc) => (doc.data()['bookId'] as String?) ?? '')
          .where((id) => id.isNotEmpty)
          .toList();
    } catch (_) {
      return [];
    }
  }
}
