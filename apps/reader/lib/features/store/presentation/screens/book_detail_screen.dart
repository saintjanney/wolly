import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';
import 'package:wolly_mobile/features/store/data/follow_repository.dart';
import 'package:wolly_mobile/features/store/data/paystack_service.dart';
import 'package:wolly_mobile/features/store/data/purchase_repository.dart';
import 'package:wolly_mobile/read_book.dart';
import 'package:wolly_mobile/read_pdf.dart';

class BookDetailScreen extends StatefulWidget {
  final Book book;

  const BookDetailScreen({Key? key, required this.book}) : super(key: key);

  @override
  State<BookDetailScreen> createState() => _BookDetailScreenState();
}

class _BookDetailScreenState extends State<BookDetailScreen> {
  final PurchaseRepository _purchaseRepo = PurchaseRepository();
  final FollowRepository _followRepo = FollowRepository();

  bool _checkingPurchase = true;
  bool _isPurchased = false;
  bool _purchasing = false;
  bool _descriptionExpanded = false;
  bool _isFollowing = false;
  bool _followLoading = false;

  @override
  void initState() {
    super.initState();
    _checkOwnership();
    _checkFollow();
  }

  Future<void> _checkFollow() async {
    final authorId = widget.book.authorId;
    if (authorId == null) return;
    final following = await _followRepo.isFollowing(authorId);
    if (mounted) setState(() => _isFollowing = following);
  }

  Future<void> _toggleFollow() async {
    final authorId = widget.book.authorId;
    final authorName = widget.book.author ?? 'Unknown';
    if (authorId == null) return;
    setState(() => _followLoading = true);
    if (_isFollowing) {
      await _followRepo.unfollow(authorId);
    } else {
      await _followRepo.follow(authorId, authorName);
    }
    if (mounted) setState(() { _isFollowing = !_isFollowing; _followLoading = false; });
  }

  Future<void> _checkOwnership() async {
    if (widget.book.isFree) {
      setState(() { _isPurchased = true; _checkingPurchase = false; });
      return;
    }
    final bookId = _effectiveBookId;
    final owned = await _purchaseRepo.checkPurchase(bookId);
    if (mounted) setState(() { _isPurchased = owned; _checkingPurchase = false; });
  }

  String get _effectiveBookId =>
      widget.book.id ??
      widget.book.downloadUrl.split('/').last.split('?').first;

  void _openReader() {
    final book = widget.book;
    if (book.fileType == 'pdf') {
      Navigator.of(context, rootNavigator: true).pushReplacement(
        MaterialPageRoute(builder: (_) => ReadPDF(book: book)),
      );
    } else {
      Navigator.of(context, rootNavigator: true).pushReplacement(
        MaterialPageRoute(builder: (_) => ReadEpub(book: book)),
      );
    }
  }

  Future<void> _handleBuy() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to purchase')),
      );
      return;
    }

    setState(() => _purchasing = true);

    final bookId = _effectiveBookId;
    final amountInPesewas = (widget.book.price * 100).round();
    final reference = PaystackService.generateReference(bookId);

    final success = await PaystackService.checkout(
      context,
      email: user.email ?? '',
      amountInPesewas: amountInPesewas,
      reference: reference,
      bookTitle: widget.book.title,
    );

    if (!mounted) return;

    if (success) {
      await _purchaseRepo.recordPurchase(
        bookId: bookId,
        bookTitle: widget.book.title,
        reference: reference,
        amountInPesewas: amountInPesewas,
      );
      setState(() { _isPurchased = true; _purchasing = false; });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Purchase successful! Enjoy your book 🎉'),
          backgroundColor: Color(0xFF4CAF50),
        ),
      );
      _openReader();
    } else {
      setState(() => _purchasing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final book = widget.book;

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(book),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 20),
                  _buildTitleRow(book),
                  const SizedBox(height: 12),
                  _buildMetaRow(book),
                  const SizedBox(height: 20),
                  _buildDescription(book),
                  const SizedBox(height: 28),
                  _buildDivider(),
                  const SizedBox(height: 20),
                  _buildDetailsGrid(book),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildSliverAppBar(Book book) {
    return SliverAppBar(
      expandedHeight: 320,
      pinned: true,
      backgroundColor: const Color(0xFF1A1A2E),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios, color: Colors.white, size: 20),
        onPressed: () => Navigator.pop(context),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Hero(
          tag: 'book_cover_${_effectiveBookId}',
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Cover image or gradient placeholder
              book.coverUrl != null && book.coverUrl!.isNotEmpty
                  ? Image.network(
                      book.coverUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _coverPlaceholder(),
                    )
                  : _coverPlaceholder(),

              // Gradient overlay (bottom fade)
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Color(0xCC1A1A2E)],
                    stops: [0.5, 1.0],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _coverPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(Icons.menu_book, size: 80, color: Colors.white54),
      ),
    );
  }

  Widget _buildTitleRow(Book book) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          book.title,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A1A1A),
            height: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Text(
                'by ${book.author ?? 'Unknown Author'}',
                style: const TextStyle(fontSize: 16, color: Color(0xFF666666)),
              ),
            ),
            if (book.authorId != null)
              _followLoading
                  ? const SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF667EEA)))
                  : OutlinedButton.icon(
                      onPressed: _toggleFollow,
                      icon: Icon(
                        _isFollowing ? Icons.person_remove_outlined : Icons.person_add_outlined,
                        size: 16,
                      ),
                      label: Text(_isFollowing ? 'Following' : 'Follow'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _isFollowing ? Colors.grey[600] : const Color(0xFF667EEA),
                        side: BorderSide(
                          color: _isFollowing ? Colors.grey[400]! : const Color(0xFF667EEA),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetaRow(Book book) {
    return Row(
      children: [
        // Rating
        if (book.rating != null) ...[
          const Icon(Icons.star, color: Color(0xFFFFD700), size: 18),
          const SizedBox(width: 4),
          Text(
            book.rating!.toStringAsFixed(1),
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          const SizedBox(width: 16),
        ],
        // File type badge
        _Badge(
          label: book.fileType.toUpperCase(),
          color: book.fileType == 'pdf'
              ? const Color(0xFF2196F3)
              : const Color(0xFF9C27B0),
        ),
        const SizedBox(width: 8),
        // Price badge
        book.isFree
            ? const _Badge(label: 'FREE', color: Color(0xFF4CAF50))
            : _Badge(
                label: 'GHS ${book.price.toStringAsFixed(2)}',
                color: const Color(0xFF667EEA),
              ),
      ],
    );
  }

  Widget _buildDescription(Book book) {
    final desc = book.description ?? 'No description available.';
    final isLong = desc.length > 200;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'About this book',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A1A1A),
          ),
        ),
        const SizedBox(height: 10),
        AnimatedCrossFade(
          firstChild: Text(
            desc,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF444444),
              height: 1.6,
            ),
          ),
          secondChild: Text(
            desc,
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF444444),
              height: 1.6,
            ),
          ),
          crossFadeState: _descriptionExpanded
              ? CrossFadeState.showSecond
              : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 250),
        ),
        if (isLong) ...[
          const SizedBox(height: 6),
          GestureDetector(
            onTap: () => setState(() => _descriptionExpanded = !_descriptionExpanded),
            child: Text(
              _descriptionExpanded ? 'Show less' : 'Read more',
              style: const TextStyle(
                color: Color(0xFF667EEA),
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDivider() => Divider(color: Colors.grey.withOpacity(0.2));

  Widget _buildDetailsGrid(Book book) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Details',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1A1A)),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _DetailTile(label: 'Format', value: book.fileType.toUpperCase())),
            Expanded(child: _DetailTile(label: 'Language', value: 'English')),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _DetailTile(
                label: 'Price',
                value: book.isFree ? 'Free' : 'GHS ${book.price.toStringAsFixed(2)}',
              ),
            ),
            Expanded(
              child: _DetailTile(
                label: 'Rating',
                value: book.rating != null ? '${book.rating!.toStringAsFixed(1)} / 5.0' : 'N/A',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: _checkingPurchase
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF667EEA)))
          : SizedBox(
              width: double.infinity,
              height: 54,
              child: _isPurchased
                  ? ElevatedButton.icon(
                      onPressed: _openReader,
                      icon: const Icon(Icons.menu_book, size: 20),
                      label: const Text(
                        'Read Now',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                    )
                  : ElevatedButton(
                      onPressed: _purchasing ? null : _handleBuy,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                      child: Ink(
                        decoration: BoxDecoration(
                          gradient: _purchasing
                              ? null
                              : const LinearGradient(
                                  colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                                  begin: Alignment.centerLeft,
                                  end: Alignment.centerRight,
                                ),
                          color: _purchasing ? Colors.grey[300] : null,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Container(
                          alignment: Alignment.center,
                          child: _purchasing
                              ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                              : Text(
                                  'Buy for GHS ${widget.book.price.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ),
                    ),
            ),
    );
  }
}

// ─── Helper widgets ────────────────────────────────────────────────────────

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _DetailTile extends StatelessWidget {
  final String label;
  final String value;

  const _DetailTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(right: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500], fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1A1A1A))),
        ],
      ),
    );
  }
}
