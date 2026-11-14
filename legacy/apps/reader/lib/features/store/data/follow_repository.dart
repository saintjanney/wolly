import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class FollowRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  String? get _uid => _auth.currentUser?.uid;

  String _docId(String authorId) => '${_uid}_$authorId';

  Future<bool> isFollowing(String authorId) async {
    if (_uid == null) return false;
    final snap = await _firestore
        .collection('follows')
        .doc(_docId(authorId))
        .get();
    return snap.exists;
  }

  Future<void> follow(String authorId, String authorName) async {
    if (_uid == null) return;
    await _firestore.collection('follows').doc(_docId(authorId)).set({
      'followerId': _uid,
      'authorId': authorId,
      'authorName': authorName,
      'followedAt': Timestamp.now(),
    });
  }

  Future<void> unfollow(String authorId) async {
    if (_uid == null) return;
    await _firestore.collection('follows').doc(_docId(authorId)).delete();
  }

  Future<List<String>> getFollowedAuthorIds() async {
    if (_uid == null) return [];
    final snap = await _firestore
        .collection('follows')
        .where('followerId', isEqualTo: _uid)
        .get();
    return snap.docs.map((d) => d.data()['authorId'] as String).toList();
  }
}
