import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:wolly/features/library/domain/models/book.dart';

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
        if (doc.data()['isPublished'] == false) {
          continue;
        } else {
          books.add(
            Book(
              title: doc.data()['title'],
              genre: doc.data()['genre'],
              downloadUrl: doc.data()['url'],
              fileType: _getFileTypeFromUrl(doc.data()['url']),
              isPublished: doc.data()['isPublished'] ?? false,
            ),
          );
        }
      }
      return books;

    } catch (e) {
      print(e);
      return books;
    }
  }
}
