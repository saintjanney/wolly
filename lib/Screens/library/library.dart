import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:wolly/Providers/library_provider.dart';
import 'package:wolly/models/book.dart';
import 'package:wolly/read_book.dart';
import 'package:wolly/read_pdf.dart';

class Library extends StatefulWidget {
  Library({super.key});

  @override
  State<Library> createState() => _LibraryState();
}

class _LibraryState extends State<Library> {
  final LibraryProvider libraryProvider = LibraryProvider();
  List<Book> books = [];

  @override
  void initState() {
    super.initState();
    libraryProvider.fetchAllBooks().then((value) {
      setState(() {
        books = value;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.white,
          title: Text(
            'Library',
            style: TextStyle(
              fontSize: 16.rt,
              fontWeight: FontWeight.normal,
            ),
          ),
          actions: [
            IconButton(
              onPressed: () {
                Navigator.pushReplacementNamed(context, '/login');
              },
              icon: Icon(
                Icons.logout_outlined,
                size: 20.rs,
              ),
            ),
          ],
        ),
        backgroundColor: Colors.white,
        body: RefreshIndicator(
          onRefresh: () async {
            await libraryProvider.fetchAllBooks().then((value) {
              setState(() {
                books = value;
              });
            });
          },
          child: ListView.builder(
              itemCount: books.length,
              itemBuilder: (context, index) {
                return ListTile(
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
                  subtitle: Text(
                    books[index].genre,
                    style: TextStyle(
                      fontSize: 8.rs,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  trailing: Icon(
                    Icons.open_in_new_sharp,
                    size: 16.rs,
                  ),
                );
              }),
        ));
  }
}
