import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:wolly/Providers/library_provider.dart';
import 'package:wolly/features/platform/presentation/widgets/platform_app_bar.dart';
import 'package:wolly/models/book.dart';
import 'package:wolly/models/genre.dart';
import 'package:wolly/read_book.dart';
import 'package:wolly/read_pdf.dart';

class GenreBooks extends StatefulWidget {
  final Genre genre;

  const GenreBooks({Key? key, required this.genre}) : super(key: key);

  @override
  State<GenreBooks> createState() => _GenreBooksState();
}

class _GenreBooksState extends State<GenreBooks> {
  final LibraryProvider _libraryProvider = LibraryProvider();
  List<Book> books = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadBooksByGenre();
  }

  Future<void> loadBooksByGenre() async {
    setState(() {
      isLoading = true;
    });

    List<Book> allBooks = await _libraryProvider.fetchAllBooks();
    List<Book> genreBooks = allBooks.where((book) => book.genre == widget.genre.id).toList();
    
    setState(() {
      books = genreBooks;
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PlatformAppBar(
        title: widget.genre.name,
        actions: [
          IconButton(
            onPressed: loadBooksByGenre,
            icon: Icon(
              Icons.refresh,
              size: 20.rs,
            ),
            tooltip: 'Refresh Books',
          ),
        ],
      ),
      backgroundColor: Colors.white,
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : books.isEmpty
              ? Center(
                  child: Text(
                    'No books found in this genre',
                    style: TextStyle(
                      fontSize: 16.rs,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: loadBooksByGenre,
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
                            Text(
                              widget.genre.name,
                              style: TextStyle(
                                fontSize: 8.rs,
                                fontWeight: FontWeight.normal,
                              ),
                            ),
                            SizedBox(width: 10.rs),
                            Text(
                              books[index].fileType.toUpperCase(),
                              style: TextStyle(
                                fontSize:
                                    8.rs,
                                color: Theme.of(context).colorScheme.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
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
                    },
                  ),
                ),
    );
  }
} 