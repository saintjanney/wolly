import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly/features/genre/domain/genre_state.dart';
import 'package:wolly/features/genre/presentation/bloc/genre_bloc.dart';
import 'package:wolly/features/library/domain/models/book.dart';
import 'package:wolly/features/genre/domain/models/genre.dart';
import 'package:wolly/read_book.dart';
import 'package:wolly/read_pdf.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class LibraryItem extends StatefulWidget {
  final int index;
  final Book book;

  LibraryItem({
    super.key,
    required this.index,
    required this.book,
  });

  @override
  State<LibraryItem> createState() => _LibraryItemState();
}

class _LibraryItemState extends State<LibraryItem> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  //
  //tIKzir9UHoqroMm7cnAz

  Future<void> _updateBookGenre(String genreId) async {
    try {
      // Find the document with matching URL
      final QuerySnapshot querySnapshot = await _firestore
          .collection('epubs')
          .where('url', isEqualTo: widget.book.downloadUrl)
          .get();

      if (querySnapshot.docs.isNotEmpty) {
        // Update the genre field
        await querySnapshot.docs.first.reference.update({
          'genre': genreId,
        });

        // Update local state
        setState(() {
          widget.book.genre = genreId;
        });
      }
    } catch (e) {
      print('Error updating book genre: $e');
    }
  }

  Future<void> _togglePublishStatus() async {
    try {
      // Find the document with matching URL
      final QuerySnapshot querySnapshot = await _firestore
          .collection('epubs')
          .where('url', isEqualTo: widget.book.downloadUrl)
          .get();

      if (querySnapshot.docs.isNotEmpty) {
        // Toggle the isPublished field
        await querySnapshot.docs.first.reference.update({
          'isPublished': !widget.book.isPublished,
        });

        // Update local state
        setState(() {
          widget.book.isPublished = !widget.book.isPublished;
        });
      }
    } catch (e) {
      print('Error updating book publish status: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Text(
        "${widget.index + 1}",
        style: TextStyle(
          fontSize: 12.rt,
          fontWeight: FontWeight.normal,
        ),
      ),
      title: Text(
        widget.book.title,
        style: TextStyle(
          fontSize: 10.rt,
          fontWeight: FontWeight.normal,
        ),
      ),
      subtitle: Row(
        children: [
          SizedBox(
            width: MediaQuery.of(context).size.width * 0.325,
            child:
                BlocBuilder<GenreBloc, GenreState>(builder: (context, state) {
              if (state.status == GenreStatus.loading) {
                return const Center(child: CircularProgressIndicator());
              }

              if (state.status == GenreStatus.error) {
                return const Text('Failed to load genres');
              }
              for (var genre in state.genres) {
                print(genre.name);
              }

              return DropdownButton<String>(
                isExpanded: true,
                hint: Text(
                  "Select Genre",
                  style:
                      TextStyle(fontSize: 10.rt, fontWeight: FontWeight.normal),
                ),
                underline: Container(),
                value: widget.book.genre.isEmpty ? null : widget.book.genre,
                items: state.genres.map((genre) {
                  return DropdownMenuItem<String>(
                    value: genre.id,
                    child: Text(
                      genre.name,
                      style: TextStyle(
                        fontSize: 10.rt,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  );
                }).toList(),
                onChanged: (String? value) {
                  if (value != null) {
                    _updateBookGenre(value);
                  }
                },
              );
            }),
          ),
          SizedBox(width: 10.rs),
          Checkbox.adaptive(
              value: widget.book.isPublished,
              onChanged: (value) {
                _togglePublishStatus();
              }),
          Text("Publish Book"),
        ],
      ),
      trailing: InkWell(
        onTap: () {
          if (widget.book.fileType == 'pdf') {
            Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute(
                builder: (context) => ReadPDF(
                  book: widget.book,
                ),
              ),
            );
          } else {
            Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute(
                builder: (context) => ReadEpub(
                  book: widget.book,
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
  }
}
