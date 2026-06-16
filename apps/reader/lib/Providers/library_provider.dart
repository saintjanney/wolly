import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';

class LibraryProvider with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;


  String _getFileTypeFromUrl(String url) {
    print(url);
    if (url.contains('.pdf')) {
      print('pdf');
      return 'pdf';
    } else if (url.contains('.epub')) {
      print('epub');
      return 'epub';
    } else {
      print('uknown');
      return 'unknown';
    }
  }

  Future<List<Book>> fetchAllBooks() async {
    List<Book> books = [];
    try {
      QuerySnapshot<Map<String, dynamic>> querySnapshot =
          await _firestore.collection('epubs').get();

      for (var doc in querySnapshot.docs) {
        final data = doc.data();
        if (data['isPublished'] == false) continue;
        books.add(
          Book(
            id: doc.id,
            authorId: data['ownerUserId'],
            title: data['title'] ?? '',
            genre: data['genre'] ?? '',
            downloadUrl: data['url'] ?? '',
            fileType: _getFileTypeFromUrl(data['url'] ?? ''),
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
      print(e);
      return books;
    }
  }
}
