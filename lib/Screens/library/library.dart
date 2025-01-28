import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wolly/models/book.dart';
import 'package:wolly/providers/library_provider.dart';
import 'package:wolly/read_book.dart';
import 'package:wolly/read_pdf.dart';

class Library extends StatelessWidget {
  final LibraryProvider libraryProvider = LibraryProvider();
  Library({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<LibraryProvider>(builder: (context, libraryProvider, _) {
      return Scaffold(
          appBar: AppBar(
            backgroundColor: Colors.white,
            title: const Text('Library'),
            actions: [
              IconButton(
                onPressed: () {
                  libraryProvider.fetchAllBooks();
                },
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          backgroundColor: Colors.white,
          body: FutureBuilder<List<Book>>(
              future: libraryProvider.fetchAllBooks(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(),
                  );
                }
                if (snapshot.hasError) {
                  return const Center(
                    child: Text('An error occurred'),
                  );
                }
                if (snapshot.data!.isEmpty) {
                  return const Center(
                    child: Text('No books found'),
                  );
                }
                return ListView.builder(
                    itemCount: snapshot.data!.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                        onTap: () {
                          if (snapshot.data![index].fileType == 'pdf') {
                            print("pdf");
                            Navigator.of(context, rootNavigator: true).push(
                              MaterialPageRoute(
                                builder: (context) => ReadPDF(
                                  book: snapshot.data![index],
                                ),
                              ),
                            );
                          } else {
                            print("epub");
                            Navigator.of(context, rootNavigator: true).push(
                              MaterialPageRoute(
                                builder: (context) => ReadEpub(
                                  book: snapshot.data![index],
                                ),
                              ),
                            );
                          }
                        },
                        leading: Text("${index + 1}"),
                        title: Text(snapshot.data![index].title),
                        subtitle: Text(snapshot.data![index].genre),
                        trailing: const Icon(Icons.open_in_new_sharp),
                      );
                    });
              }));
    });
  }
}
