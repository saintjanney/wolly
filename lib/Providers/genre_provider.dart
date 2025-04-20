import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:wolly/features/genre/domain/models/genre.dart';

class GenreProvider with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  List<Genre> _genres = [];
  bool _isLoading = false;
  String _error = '';

  List<Genre> get genres => _genres;
  bool get isLoading => _isLoading;
  String get error => _error;

  // static Future<void> fetchAndStoreEpubs() async {
  //   try {
  //     final ListResult result =
  //         await FirebaseStorage.instance.ref('epubs').listAll();
  //     for (var item in result.items) {
  //       final String url = await item.getDownloadURL();
  //       final String title = item.name;

  //       await _firestore.collection('epubs').doc().set({
  //         'title': title,
  //         'url': url,
  //         'genre': '',
  //       });
  //     }
  //   } catch (error) {
  //     print('Error fetching and storing epubs: $error');
  //   }
  // }

  Future<List<Genre>> fetchAllGenres() async {
    _isLoading = true;
    _error = '';
    notifyListeners();

    try {
      QuerySnapshot<Map<String, dynamic>> querySnapshot =
          await _firestore.collection('genres').get();

      _genres = querySnapshot.docs.map((doc) {
        return Genre.fromJson(doc.data(), doc.id);
      }).toList();

      _isLoading = false;
      notifyListeners();
      return _genres;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      print('Error fetching genres: $e');
      return [];
    }
  }

  // Get genre count for each book
  Future<int> getBookCountByGenre(String genreId) async {
    try {
      QuerySnapshot<Map<String, dynamic>> querySnapshot = await _firestore
          .collection('epubs')
          .where('genre', isEqualTo: genreId)
          .where('isPublished', isEqualTo: true)
          .get();

      return querySnapshot.docs.length;
    } catch (e) {
      print('Error getting book count for genre $genreId: $e');
      return 0;
    }
  }

  // Update book counts for all genres
  Future<void> updateGenreBookCounts() async {
    for (var genre in _genres) {
      int count = await getBookCountByGenre(genre.id);
      if (count > 0) {
        await _firestore.collection('genres').doc(genre.id).update({
          'bookCount': count,
        });
      }
    }
    await fetchAllGenres(); // Refresh genres with updated counts
  }

  void addGenre(String genre) {
    _genres.add(Genre(id: genre, name: genre));
    notifyListeners();
  }

  void removeGenre(String genre) {
    _genres.removeWhere((g) => g.id == genre);
    notifyListeners();
  }
}
