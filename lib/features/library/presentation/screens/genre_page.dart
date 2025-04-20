import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:wolly/Providers/genre_provider.dart';
import 'package:wolly/features/genre/domain/models/genre.dart';
import 'package:wolly/features/library/presentation/screens/genre_books.dart';
import 'package:wolly/features/platform/presentation/widgets/platform_app_bar.dart';

class GenrePage extends StatefulWidget {
  const GenrePage({Key? key}) : super(key: key);

  @override
  State<GenrePage> createState() => _GenrePageState();
}

class _GenrePageState extends State<GenrePage> {
  final GenreProvider _genreProvider = GenreProvider();
  bool isLoading = true;
  List<Genre> genres = [];

  @override
  void initState() {
    super.initState();
    loadGenres();
  }

  Future<void> loadGenres() async {
    setState(() {
      isLoading = true;
    });

    List<Genre> fetchedGenres = await _genreProvider.fetchAllGenres();
    
    setState(() {
      genres = fetchedGenres;
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PlatformAppBar(
        title: 'Genres',
        actions: [
          IconButton(
            onPressed: loadGenres,
            icon: Icon(
              Icons.refresh,
              size: 20.rs,
            ),
            tooltip: 'Refresh Genres',
          ),
        ],
      ),
      backgroundColor: Colors.white,
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : genres.isEmpty
              ? Center(
                  child: Text(
                    'No genres found',
                    style: TextStyle(
                      fontSize: 16.rs,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: loadGenres,
                  child: Padding(
                    padding: EdgeInsets.all(16.rs),
                    child: MasonryGridView.count(
                      crossAxisCount: 2,
                      mainAxisSpacing: 16.rs,
                      crossAxisSpacing: 16.rs,
                      itemCount: genres.length,
                      itemBuilder: (context, index) {
                        return _buildGenreCard(genres[index]);
                      },
                    ),
                  ),
                ),
    );
  }

  Widget _buildGenreCard(Genre genre) {
    return InkWell(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/genre_books',
          arguments: genre,
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.blueGrey.shade50,
          borderRadius: BorderRadius.circular(12.rs),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10.rs,
              offset: Offset(0, 5.rs),
            ),
          ],
        ),
        padding: EdgeInsets.all(16.rs),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              genre.name,
              style: TextStyle(
                fontSize: 16.rs,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8.rs),
            if (genre.description.isNotEmpty) ...[
              Text(
                genre.description,
                style: TextStyle(
                  fontSize: 12.rs,
                  color: Colors.grey.shade700,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              SizedBox(height: 8.rs),
            ],
            Text(
              '${genre.bookCount} books',
              style: TextStyle(
                fontSize: 12.rs,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
} 