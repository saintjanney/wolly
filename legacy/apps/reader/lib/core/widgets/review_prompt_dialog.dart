import 'package:flutter/material.dart';
import 'package:wolly_mobile/features/store/data/review_repository.dart';

/// Call this after a reader exits a book if progress >= threshold.
/// Silently skips if the user has already reviewed.
Future<void> maybeShowReviewPrompt(
  BuildContext context, {
  required String bookId,
  required String bookTitle,
  required double percentageComplete,
  double threshold = 0.8,
}) async {
  if (percentageComplete < threshold) return;

  final repo = ReviewRepository();
  final alreadyReviewed = await repo.hasReviewed(bookId);
  if (alreadyReviewed) return;
  if (!context.mounted) return;

  await showDialog(
    context: context,
    barrierDismissible: true,
    builder: (_) => _ReviewDialog(bookId: bookId, bookTitle: bookTitle, repo: repo),
  );
}

class _ReviewDialog extends StatefulWidget {
  final String bookId;
  final String bookTitle;
  final ReviewRepository repo;

  const _ReviewDialog({
    required this.bookId,
    required this.bookTitle,
    required this.repo,
  });

  @override
  State<_ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<_ReviewDialog> {
  double _rating = 0;
  final TextEditingController _reviewController = TextEditingController();
  bool _submitting = false;
  bool _submitted = false;

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a rating')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await widget.repo.submitReview(
        bookId: widget.bookId,
        bookTitle: widget.bookTitle,
        rating: _rating,
        content: _reviewController.text.trim(),
      );
      if (mounted) setState(() { _submitted = true; _submitting = false; });
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _submitted
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle, color: Color(0xFF4CAF50), size: 56),
                  const SizedBox(height: 12),
                  const Text('Review submitted!',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text('Thanks for sharing your thoughts.',
                      style: TextStyle(fontSize: 14, color: Colors.grey[500])),
                ],
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      const Icon(Icons.star, color: Color(0xFFFFD700), size: 22),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text('Enjoying this book?',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20, color: Colors.grey),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(widget.bookTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: Colors.grey[500])),
                  const SizedBox(height: 20),

                  // Star picker
                  Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(5, (i) {
                        final star = i + 1;
                        return GestureDetector(
                          onTap: () => setState(() => _rating = star.toDouble()),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(
                              star <= _rating ? Icons.star : Icons.star_border,
                              color: const Color(0xFFFFD700),
                              size: 36,
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Optional text
                  TextField(
                    controller: _reviewController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Share your thoughts (optional)…',
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                      filled: true,
                      fillColor: const Color(0xFFF7F7F7),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Buttons
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Maybe Later',
                              style: TextStyle(color: Colors.grey)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF667EEA),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      color: Colors.white, strokeWidth: 2))
                              : const Text('Submit'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
      ),
    );
  }
}
