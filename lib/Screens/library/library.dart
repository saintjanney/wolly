import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:wolly/Providers/genre_provider.dart';
import 'package:wolly/Providers/library_provider.dart';
import 'package:wolly/features/library/presentation/screens/genre_page.dart';
import 'package:wolly/features/platform/presentation/widgets/platform_app_bar.dart';
import 'package:wolly/models/book.dart';
import 'package:wolly/models/genre.dart';
import 'package:wolly/read_book.dart';
import 'package:wolly/read_pdf.dart';

class Library extends StatefulWidget {
  Library({super.key});

  @override
  State<Library> createState() => _LibraryState();
}

class _LibraryState extends State<Library> {
  final LibraryProvider libraryProvider = LibraryProvider();
  final GenreProvider genreProvider = GenreProvider();
  List<Book> books = [];
  List<Genre> genres = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      isLoading = true;
    });

    // Load genres first
    await genreProvider.fetchAllGenres().then((value) {
      setState(() {
        genres = value;
      });
    });

    // Then load books
    await libraryProvider.fetchAllBooks().then((value) {
      setState(() {
        books = value;
        isLoading = false;
      });
    });
  }

  String getGenreName(String genreId) {
    final genre = genres.firstWhere(
      (g) => g.id == genreId,
      orElse: () => Genre(id: genreId, name: 'Unknown'),
    );
    return genre.name;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        floatingActionButton: FloatingActionButton(
          onPressed: () {},
          tooltip: 'Add Book',
          child: Icon(Icons.add),
        ),
        appBar: PlatformAppBar(
          title: 'Library',
          actions: [
            IconButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const GenrePage(),
                  ),
                );
              },
              icon: Icon(
                Icons.category,
                size: 20.rs,
              ),
              tooltip: 'Browse Genres',
            ),
            IconButton(
              onPressed: () {
                Navigator.pushNamed(context, '/file_download_example');
              },
              icon: Icon(
                Icons.download,
                size: 20.rs,
              ),
              tooltip: 'File Download Example',
            ),
          ],
        ),
        backgroundColor: Colors.white,
        body: isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () async {
                  await _loadData();
                },
                child: ListView.builder(
                    itemCount: books.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                        leading: Text(
                          "${index + 1}",
                          style: TextStyle(
                            fontSize: 12.rt,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        title: Text(
                          books[index].title,
                          style: TextStyle(
                            fontSize: 10.rt,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        subtitle: Row(
                          children: [
                            DropdownButton<String>(
                              value: null,
                              items: genres
                                  .map((genre) => DropdownMenuItem<String>(
                                        value: genre.name,
                                        child: Text(genre.name),
                                      ))
                                  .toList(),
                              onChanged: (String? value) {},
                            ),
                            SizedBox(width: 10.rs),
                            TextButton.icon(
                                onPressed: () {},
                                label: Text("Publish Book"),
                                icon: Icon(Icons.publish))
                          ],
                        ),
                        trailing: InkWell(
                          onTap: () {
                            if (books[index].fileType == 'pdf') {
                              Navigator.of(context, rootNavigator: true).push(
                                MaterialPageRoute(
                                  builder: (context) => ReadPDF(
                                    book: books[index],
                                  ),
                                ),
                              );
                            } else {
                              Navigator.of(context, rootNavigator: true).push(
                                MaterialPageRoute(
                                  builder: (context) => ReadEpub(
                                    book: books[index],
                                  ),
                                ),
                              );
                            }
                          },
                          child: Icon(
                            Icons.open_in_new_sharp,
                            size: 16.rs,
                          ),
                        ),
                      );
                    }),
              ));
  }
}
