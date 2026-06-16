import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:wolly_mobile/Providers/library_provider.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';
import 'package:wolly_mobile/features/library/presentation/screens/genre_page.dart';
import 'package:wolly_mobile/features/store/data/purchase_repository.dart';

class Library extends StatefulWidget {
  Library({super.key});

  @override
  State<Library> createState() => _LibraryState();
}

class _LibraryState extends State<Library> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final LibraryProvider _libraryProvider = LibraryProvider();
  final PurchaseRepository _purchaseRepo = PurchaseRepository();

  List<Book> _allBooks = [];
  List<Book> _purchasedBooks = [];
  List<Book> _inProgressBooks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    await Future.wait([_loadAllBooks(), _loadPurchased(), _loadInProgress()]);
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _loadAllBooks() async {
    _allBooks = await _libraryProvider.fetchAllBooks();
  }

  Future<void> _loadPurchased() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) { _purchasedBooks = []; return; }

    final purchasedIds = await _purchaseRepo.getUserPurchasedBookIds();
    if (purchasedIds.isEmpty) { _purchasedBooks = []; return; }

    final allBooks = await _libraryProvider.fetchAllBooks();
    _purchasedBooks = allBooks.where((b) => purchasedIds.contains(b.id)).toList();

    // Also include free books
    final freeBooks = allBooks.where((b) => b.isFree && !_purchasedBooks.any((p) => p.id == b.id)).toList();
    _purchasedBooks = [..._purchasedBooks, ...freeBooks];
  }

  Future<void> _loadInProgress() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) { _inProgressBooks = []; return; }

    try {
      final snap = await FirebaseFirestore.instance
          .collection('reading_progress')
          .where('userId', isEqualTo: uid)
          .orderBy('lastRead', descending: true)
          .limit(20)
          .get();

      if (snap.docs.isEmpty) { _inProgressBooks = []; return; }

      List<Book> result = [];
      for (final doc in snap.docs) {
        final data = doc.data();
        final pct = (data['percentageComplete'] ?? 0.0).toDouble();
        if (pct >= 1.0) continue; // completed
        final bookSnap = await FirebaseFirestore.instance
            .collection('epubs')
            .doc(data['bookId'])
            .get();
        if (!bookSnap.exists) continue;
        final bd = bookSnap.data()!;
        result.add(Book(
          id: bookSnap.id,
          title: bd['title'] ?? '',
          genre: bd['genre'] ?? '',
          downloadUrl: bd['url'] ?? '',
          fileType: bd['fileType'] ?? 'epub',
          isPublished: bd['isPublished'] ?? false,
          coverUrl: bd['coverUrl'],
          author: bd['author'],
          description: bd['description'],
          rating: bd['rating']?.toDouble(),
          price: (bd['price'] ?? 0.0).toDouble(),
          isFree: bd['isFree'] ?? true,
          pagesRead: data['pagesRead'],
          totalPages: data['totalPages'],
          percentageComplete: pct,
          lastRead: data['lastRead'] != null
              ? (data['lastRead'] as Timestamp).toDate()
              : null,
        ));
      }
      _inProgressBooks = result;
    } catch (_) {
      _inProgressBooks = [];
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
        title: const Text(
          'Library',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1A1A1A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.category_outlined),
            tooltip: 'Browse Genres',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const GenrePage()),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF667EEA),
          unselectedLabelColor: Colors.grey[500],
          indicatorColor: const Color(0xFF667EEA),
          indicatorWeight: 2,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: const [
            Tab(text: 'My Books'),
            Tab(text: 'Reading'),
            Tab(text: 'Discover'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF667EEA)))
          : RefreshIndicator(
              onRefresh: _loadAll,
              color: const Color(0xFF667EEA),
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildMyBooksTab(),
                  _buildReadingTab(),
                  _buildDiscoverTab(),
                ],
              ),
            ),
    );
  }

  // ── My Books ──────────────────────────────────────────────────────────────

  Widget _buildMyBooksTab() {
    if (_purchasedBooks.isEmpty) {
      return _emptyState(
        icon: Icons.library_books_outlined,
        title: 'No books yet',
        subtitle: 'Books you purchase or free books will appear here.',
        actionLabel: 'Browse Store',
        onAction: () => _tabController.animateTo(2),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.65,
      ),
      itemCount: _purchasedBooks.length,
      itemBuilder: (_, i) => _BookGridCard(book: _purchasedBooks[i], onTap: _openDetail),
    );
  }

  // ── Currently Reading ─────────────────────────────────────────────────────

  Widget _buildReadingTab() {
    if (_inProgressBooks.isEmpty) {
      return _emptyState(
        icon: Icons.menu_book_outlined,
        title: 'Nothing in progress',
        subtitle: 'Start reading a book and your progress will appear here.',
        actionLabel: 'Discover Books',
        onAction: () => _tabController.animateTo(2),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _inProgressBooks.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _InProgressCard(book: _inProgressBooks[i], onTap: _openDetail),
    );
  }

  // ── Discover ──────────────────────────────────────────────────────────────

  Widget _buildDiscoverTab() {
    if (_allBooks.isEmpty) {
      return _emptyState(
        icon: Icons.explore_outlined,
        title: 'No books available',
        subtitle: 'Check back soon for new titles.',
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.65,
      ),
      itemCount: _allBooks.length,
      itemBuilder: (_, i) => _BookGridCard(book: _allBooks[i], onTap: _openDetail),
    );
  }

  Widget _emptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF667EEA).withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: const Color(0xFF667EEA)),
            ),
            const SizedBox(height: 20),
            Text(title,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
            const SizedBox(height: 8),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey[500])),
            if (actionLabel != null) ...[
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF667EEA),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: Text(actionLabel),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Book grid card ────────────────────────────────────────────────────────────

class _BookGridCard extends StatelessWidget {
  final Book book;
  final void Function(Book) onTap;

  const _BookGridCard({required this.book, required this.onTap});

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
            // Cover
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                    ? Image.network(book.coverUrl!, width: double.infinity, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder())
                    : _placeholder(),
              ),
            ),
            // Info
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

  Widget _placeholder() {
    return Container(
      color: const Color(0xFFEEF0FF),
      child: const Center(child: Icon(Icons.menu_book, size: 40, color: Color(0xFF667EEA))),
    );
  }
}

// ── In-progress card ──────────────────────────────────────────────────────────

class _InProgressCard extends StatelessWidget {
  final Book book;
  final void Function(Book) onTap;

  const _InProgressCard({required this.book, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final pct = (book.percentageComplete ?? 0.0).clamp(0.0, 1.0);
    final pctText = '${(pct * 100).round()}%';

    return GestureDetector(
      onTap: () => onTap(book),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 3)),
          ],
        ),
        child: Row(
          children: [
            // Cover
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 64,
                height: 90,
                child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                    ? Image.network(book.coverUrl!, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _coverPlaceholder())
                    : _coverPlaceholder(),
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
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A))),
                  const SizedBox(height: 3),
                  Text(book.author ?? 'Unknown',
                      style: TextStyle(fontSize: 13, color: Colors.grey[500])),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct,
                            minHeight: 5,
                            backgroundColor: Colors.grey[200],
                            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF667EEA)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(pctText,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF667EEA))),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (book.lastRead != null)
                    Text(
                      'Last read ${_relativeTime(book.lastRead!)}',
                      style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.play_arrow, color: Colors.white, size: 20),
            ),
          ],
        ),
      ),
    );
  }

  Widget _coverPlaceholder() {
    return Container(
      color: const Color(0xFFEEF0FF),
      child: const Icon(Icons.menu_book, color: Color(0xFF667EEA), size: 28),
    );
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'yesterday';
    return '${diff.inDays}d ago';
  }
}
