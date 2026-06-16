import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';

/// Data access for the book catalog (the `epubs` collection). Plain repository
/// — screens drive UI state through BLoC/Cubit or local widget state, not this.
class LibraryRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String _fileTypeFor(Map<String, dynamic> data) {
    final explicit = data['fileType'] as String?;
    if (explicit == 'pdf' || explicit == 'epub') return explicit!;
    final url = (data['url'] ?? '') as String;
    if (url.contains('.pdf')) return 'pdf';
    if (url.contains('.epub')) return 'epub';
    return 'epub';
  }

  Future<List<Book>> fetchAllBooks() async {
    final List<Book> books = [];
    try {
      final querySnapshot = await _firestore.collection('epubs').get();
      for (final doc in querySnapshot.docs) {
        final data = doc.data();
        if (data['isPublished'] == false) continue;
        books.add(
          Book(
            id: doc.id,
            authorId: data['ownerUserId'],
            title: data['title'] ?? '',
            genre: data['genre'] ?? '',
            downloadUrl: data['url'] ?? '',
            fileType: _fileTypeFor(data),
            isPublished: data['isPublished'] ?? false,
            coverUrl: data['coverUrl'],
            author: data['author'],
            description: data['description'],
            rating: data['rating']?.toDouble(),
            price: (data['price'] ?? 0.0).toDouble(),
            isFree: data['isFree'] ?? (data['price'] == null || data['price'] == 0),
          ),
        );
      }
      return books;
    } catch (e) {
      return books;
    }
  }
}
