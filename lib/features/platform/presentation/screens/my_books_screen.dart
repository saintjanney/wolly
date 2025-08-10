import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../platform/data/platform_book_repository.dart';
import '../../domain/models/platform_book.dart';
import '../../../../add_book.dart';

class MyBooksScreen extends StatefulWidget {
  const MyBooksScreen({super.key});

  @override
  State<MyBooksScreen> createState() => _MyBooksScreenState();
}

class _MyBooksScreenState extends State<MyBooksScreen> {
  late final PlatformBookRepository _repo;
  String _filter = 'All';

  @override
  void initState() {
    super.initState();
    _repo = PlatformBookRepository(
      firestore: FirebaseFirestore.instance,
      auth: FirebaseAuth.instance,
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<PlatformBook>>(
      stream: _repo.streamMyBooks(),
      builder: (context, snapshot) {
        final connection = snapshot.connectionState;
        final hasError = snapshot.hasError;
        final books = snapshot.data ?? const [];

        final filtered = books.where((b) {
          switch (_filter) {
            case 'Published':
              return b.isPublished;
            case 'Drafts':
              return !b.isPublished;
            default:
              return true;
          }
        }).toList();

        return Scaffold(
          appBar: AppBar(title: const Text('My Books')),
          floatingActionButton: books.isNotEmpty
              ? FloatingActionButton(
                  onPressed: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AddBook()),
                    );
                  },
                  child: const Icon(Icons.add),
                )
              : null,
          body: () {
            if (connection == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (hasError) {
              return _FriendlyError(error: snapshot.error, onRetry: () {
                setState(() {});
              });
            }
            if (books.isEmpty) {
              return _EmptyState(onCreate: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const AddBook()),
                );
              });
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _FilterBar(
                    current: _filter,
                    onSelected: (v) => setState(() => _filter = v),
                  );
                }
                final b = filtered[index - 1];
              return _BookCard(
                book: b,
                onTogglePublish: (value) async {
                  await _repo.setPublishStatus(bookId: b.id, isPublished: value);
                },
                onOpen: () async {
                  await showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                    ),
                    builder: (ctx) => _BookActionsSheet(book: b, repo: _repo, parentContext: context),
                  );
                },
              );
              },
            );
          }(),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onCreate;
  const _EmptyState({required this.onCreate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.menu_book, size: 72, color: Colors.grey),
            const SizedBox(height: 12),
            const Text(
              'No books yet',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Create your first book to get started. You can keep it as a draft until you are ready to publish.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Create book'),
            ),
          ],
        ),
      ),
    );
  }
}

class _FriendlyError extends StatelessWidget {
  final Object? error;
  final VoidCallback onRetry;
  const _FriendlyError({required this.error, required this.onRetry});

  String _messageFor(Object? error) {
    final raw = error?.toString() ?? '';
    if (raw.contains('failed-precondition') && raw.contains('requires an index')) {
      return 'We\'re preparing your library. This may take a minute while we finish setting things up. Please try again shortly.';
    }
    return 'Something went wrong while loading your books. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.orange),
            const SizedBox(height: 12),
            Text(
              _messageFor(error),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BookCard extends StatelessWidget {
  final PlatformBook book;
  final ValueChanged<bool> onTogglePublish;
  final VoidCallback onOpen;
  const _BookCard({required this.book, required this.onTogglePublish, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 1,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
          children: [
            _CoverThumb(url: book.coverUrl),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    book.title.isEmpty ? '(Untitled)' : book.title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text([
                    book.isPublished ? 'Published' : 'Draft',
                    book.language,
                    if (book.type.isNotEmpty) book.type,
                  ].join(' • '), style: TextStyle(color: Colors.grey.shade700)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Tooltip(
                  message: book.isPublished ? 'Unpublish' : 'Publish',
                  child: Switch(
                    value: book.isPublished,
                    onChanged: (val) => onTogglePublish(val),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.more_horiz),
                  onPressed: onOpen,
                  tooltip: 'More',
                ),
              ],
            ),
          ],
          ),
        ),
      ),
    );
  }
}

class _CoverThumb extends StatelessWidget {
  final String? url;
  const _CoverThumb({this.url});

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(8);
    final placeholder = Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: borderRadius,
      ),
      child: const Icon(Icons.menu_book),
    );
    if (url == null || url!.isEmpty) return placeholder;
    return ClipRRect(
      borderRadius: borderRadius,
      child: Image.network(
        url!,
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => placeholder,
      ),
    );
  }
}

class _BookActionsSheet extends StatelessWidget {
  final PlatformBook book;
  final PlatformBookRepository repo;
  final BuildContext parentContext;
  const _BookActionsSheet({required this.book, required this.repo, required this.parentContext});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
              Row(
                children: [
                  _CoverThumb(url: book.coverUrl),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(book.title.isEmpty ? '(Untitled)' : book.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text('Status: ' + (book.isPublished ? 'Published' : 'Draft')),
                        Text('Language: ' + book.language),
                        if (book.subtitle != null && book.subtitle!.isNotEmpty) Text('Subtitle: ' + book.subtitle!),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Actions', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ListTile(
                leading: const Icon(Icons.edit),
                title: const Text('Edit details'),
                onTap: () {
                  Navigator.pop(context);
                  Future.microtask(() async {
                    await Navigator.of(parentContext).push(
                      MaterialPageRoute(builder: (_) => AddBook(existing: book)),
                    );
                  });
                },
              ),
              ListTile(
                leading: const Icon(Icons.public),
                title: Text(book.isPublished ? 'Unpublish' : 'Publish'),
                onTap: () async {
                  await repo.setPublishStatus(bookId: book.id, isPublished: !book.isPublished);
                  if (context.mounted) Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline),
                title: const Text('Delete'),
                textColor: Colors.red,
                iconColor: Colors.red,
                onTap: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('Delete book?'),
                      content: const Text('This will remove the book from your platform list.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await repo.deleteBook(bookId: book.id);
                    if (context.mounted) Navigator.pop(context);
                  }
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  final String current;
  final ValueChanged<String> onSelected;
  const _FilterBar({required this.current, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    final filters = const ['All', 'Published', 'Drafts'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final f in filters)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: ChoiceChip(
                selected: current == f,
                label: Text(f),
                onSelected: (_) => onSelected(f),
              ),
            ),
        ],
      ),
    );
  }
}

