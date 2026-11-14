import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  List<Book> _results = [];
  bool _searching = false;
  bool _hasSearched = false;
  String _lastQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _focusNode.requestFocus());
    _controller.addListener(_onQueryChanged);
  }

  @override
  void dispose() {
    _controller.removeListener(_onQueryChanged);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onQueryChanged() {
    final q = _controller.text.trim();
    if (q == _lastQuery) return;
    _lastQuery = q;
    if (q.isEmpty) {
      setState(() { _results = []; _hasSearched = false; });
      return;
    }
    // Debounce
    Future.delayed(const Duration(milliseconds: 350), () {
      if (_controller.text.trim() == q) _search(q);
    });
  }

  Future<void> _search(String q) async {
    if (q.isEmpty) return;
    setState(() => _searching = true);

    try {
      // Firestore doesn't support full-text search, so we fetch published books
      // and filter client-side by title/author (works fine for <1000 books).
      final snap = await FirebaseFirestore.instance
          .collection('epubs')
          .where('isPublished', isEqualTo: true)
          .get();

      final lower = q.toLowerCase();
      final filtered = snap.docs
          .map((doc) {
            final data = doc.data();
            return Book(
              id: doc.id,
              authorId: data['ownerUserId'],
              title: data['title'] ?? '',
              genre: data['genre'] ?? '',
              downloadUrl: data['url'] ?? '',
              fileType: data['fileType'] ?? 'epub',
              isPublished: data['isPublished'] ?? false,
              coverUrl: data['coverUrl'],
              author: data['author'],
              description: data['description'],
              rating: data['rating']?.toDouble(),
              price: (data['price'] ?? 0.0).toDouble(),
              isFree: data['isFree'] ?? (data['price'] == null || data['price'] == 0),
            );
          })
          .where((b) =>
              b.title.toLowerCase().contains(lower) ||
              (b.author?.toLowerCase().contains(lower) ?? false) ||
              (b.description?.toLowerCase().contains(lower) ?? false))
          .toList();

      if (mounted) setState(() { _results = filtered; _searching = false; _hasSearched = true; });
    } catch (_) {
      if (mounted) setState(() { _searching = false; _hasSearched = true; });
    }
  }

  void _openDetail(Book book) {
    Navigator.of(context).pushNamed('/book_detail', arguments: book);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF1A1A1A), size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: TextField(
          controller: _controller,
          focusNode: _focusNode,
          decoration: InputDecoration(
            hintText: 'Search books, authors…',
            hintStyle: TextStyle(color: Colors.grey[400], fontSize: 16),
            border: InputBorder.none,
            suffixIcon: _controller.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close, size: 18, color: Colors.grey),
                    onPressed: () {
                      _controller.clear();
                      setState(() { _results = []; _hasSearched = false; });
                    },
                  )
                : null,
          ),
          style: const TextStyle(fontSize: 16, color: Color(0xFF1A1A1A)),
          textInputAction: TextInputAction.search,
          onSubmitted: (v) => _search(v.trim()),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_searching) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF667EEA)));
    }

    if (!_hasSearched) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('Search for books or authors',
                style: TextStyle(fontSize: 16, color: Colors.grey[400])),
          ],
        ),
      );
    }

    if (_results.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('No results for "${_controller.text.trim()}"',
                style: TextStyle(fontSize: 16, color: Colors.grey[400])),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _results.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _SearchResultTile(book: _results[i], onTap: _openDetail),
    );
  }
}

class _SearchResultTile extends StatelessWidget {
  final Book book;
  final void Function(Book) onTap;

  const _SearchResultTile({required this.book, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(book),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            // Cover thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 52,
                height: 72,
                child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                    ? Image.network(book.coverUrl!, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder())
                    : _placeholder(),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(book.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
                  const SizedBox(height: 3),
                  if (book.author != null)
                    Text('by ${book.author}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _badge(
                        book.isFree ? 'FREE' : 'GHS ${book.price.toStringAsFixed(0)}',
                        book.isFree ? const Color(0xFF4CAF50) : const Color(0xFF667EEA),
                      ),
                      const SizedBox(width: 8),
                      _badge(book.fileType.toUpperCase(),
                          book.fileType == 'pdf' ? const Color(0xFF2196F3) : const Color(0xFF9C27B0)),
                      if (book.rating != null) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.star, size: 12, color: Color(0xFFFFD700)),
                        Text(book.rating!.toStringAsFixed(1),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
        color: const Color(0xFFEEF0FF),
        child: const Icon(Icons.menu_book, color: Color(0xFF667EEA), size: 24),
      );

  Widget _badge(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Text(label,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color)),
      );
}
