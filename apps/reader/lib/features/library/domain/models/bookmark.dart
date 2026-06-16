import 'package:cloud_firestore/cloud_firestore.dart';

class Bookmark {
  final String id;
  final String userId;
  final String bookId;
  final String bookTitle;
  final int page;
  final String? chapterTitle;
  final String? note;
  final DateTime createdAt;

  const Bookmark({
    required this.id,
    required this.userId,
    required this.bookId,
    required this.bookTitle,
    required this.page,
    this.chapterTitle,
    this.note,
    required this.createdAt,
  });

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'bookId': bookId,
      'bookTitle': bookTitle,
      'page': page,
      'chapterTitle': chapterTitle,
      'note': note,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  factory Bookmark.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Bookmark(
      id: doc.id,
      userId: data['userId'] ?? '',
      bookId: data['bookId'] ?? '',
      bookTitle: data['bookTitle'] ?? '',
      page: data['page'] ?? 0,
      chapterTitle: data['chapterTitle'],
      note: data['note'],
      createdAt: data['createdAt'] != null
          ? (data['createdAt'] as Timestamp).toDate()
          : DateTime.now(),
    );
  }
}
