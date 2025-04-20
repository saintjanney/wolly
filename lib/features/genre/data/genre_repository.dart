import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:wolly/features/genre/domain/models/genre.dart';

class GenreRepository {
  final FirebaseFirestore _firestore;

  GenreRepository({FirebaseFirestore? firestore}) 
      : _firestore = firestore ?? FirebaseFirestore.instance;

  Future<List<Genre>> fetchGenres() async {
    try {
      final QuerySnapshot<Map<String, dynamic>> querySnapshot =
          await _firestore.collection('genres').get();

      return querySnapshot.docs.map((doc) {
        return Genre.fromJson(doc.data(), doc.id);
      }).toList();
    } catch (e) {
      print('Error fetching genres: $e');
      throw Exception('Failed to fetch genres: $e');
    }
  }

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

  Future<void> updateGenreBookCounts(List<Genre> genres) async {
    for (var genre in genres) {
      int count = await getBookCountByGenre(genre.id);
      if (count > 0) {
        await _firestore.collection('genres').doc(genre.id).update({
          'bookCount': count,
        });
      }
    }
  }
} 