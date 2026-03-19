import 'package:flutter/material.dart';
import 'package:wolly_mobile/Providers/library_provider.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';
import 'package:wolly_mobile/features/genre/domain/models/genre.dart';

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
    setState(() => isLoading = true);
    final allBooks = await _libraryProvider.fetchAllBooks();
    if (mounted) {
      setState(() {
        books = allBooks.where((b) => b.genre == widget.genre.id).toList();
        isLoading = false;
      });
    }
  }

  void _openDetail(Book book) {
    Navigator.of(context, rootNavigator: true).pushNamed('/book_detail', arguments: book);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        title: Text(widget.genre.name,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1A1A1A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            onPressed: loadBooksByGenre,
            icon: const Icon(Icons.refresh, size: 20),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF667EEA)))
          : books.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.menu_book_outlined, size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      Text('No books in ${widget.genre.name} yet',
                          style: TextStyle(fontSize: 16, color: Colors.grey[500])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: loadBooksByGenre,
                  color: const Color(0xFF667EEA),
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.65,
                    ),
                    itemCount: books.length,
                    itemBuilder: (_, i) => _BookCard(book: books[i], onTap: _openDetail),
                  ),
                ),
    );
  }
}

class _BookCard extends StatelessWidget {
  final Book book;
  final void Function(Book) onTap;

  const _BookCard({required this.book, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(book),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 3)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                    ? Image.network(book.coverUrl!, width: double.infinity, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder())
                    : _placeholder(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(book.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
                  const SizedBox(height: 2),
                  Text(book.author ?? 'Unknown',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: book.isFree
                              ? const Color(0xFF4CAF50).withOpacity(0.12)
                              : const Color(0xFF667EEA).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          book.isFree ? 'FREE' : 'GHS ${book.price.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: book.isFree ? const Color(0xFF4CAF50) : const Color(0xFF667EEA),
                          ),
                        ),
                      ),
                      if (book.rating != null) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.star, size: 11, color: Color(0xFFFFD700)),
                        Text(book.rating!.toStringAsFixed(1),
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
        color: const Color(0xFFEEF0FF),
        child: const Center(child: Icon(Icons.menu_book, size: 40, color: Color(0xFF667EEA))),
      );
}
