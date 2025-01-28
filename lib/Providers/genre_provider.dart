import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';

class GenreProvider with ChangeNotifier {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  List<String> _genres = [];

  List<String> get genres => _genres;

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

  Future<void> fetchGenres() async {
    try {
      final QuerySnapshot<Map<String, dynamic>> response =
          await _firestore.collection('genres').get();
      if (response.docs.isNotEmpty) {
        _genres = response.docs.map((e) {
          String genre = e.id;
          return genre[0].toUpperCase() + genre.substring(1);
        }).toList();
      }
      notifyListeners();
    } catch (error) {
      print('Error fetching genres: $error');
    }
  }

  void addGenre(String genre) {
    _genres.add(genre);
    notifyListeners();
  }

  void removeGenre(String genre) {
    _genres.remove(genre);
    notifyListeners();
  }
}
