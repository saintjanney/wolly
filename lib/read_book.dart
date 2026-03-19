import 'dart:async';

import 'package:epub_view/epub_view.dart';
import 'package:epub_view/src/data/models/chapter_view_value.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:internet_file/internet_file.dart';
import 'package:provider/provider.dart';

import 'package:wolly_mobile/core/models/reader_settings.dart';
import 'package:wolly_mobile/core/providers/reader_settings_provider.dart';
import 'package:wolly_mobile/core/widgets/reader_settings_sheet.dart';
import 'package:wolly_mobile/features/dashboard/presentation/bloc/dashboard_bloc.dart';
import 'package:wolly_mobile/features/dashboard/presentation/bloc/dashboard_event.dart';
import 'package:wolly_mobile/core/widgets/review_prompt_dialog.dart';
import 'package:wolly_mobile/features/library/data/bookmark_repository.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';
import 'package:wolly_mobile/features/library/domain/models/bookmark.dart';

class ReadEpub extends StatefulWidget {
  final Book book;

  const ReadEpub({Key? key, required this.book}) : super(key: key);

  @override
  State<ReadEpub> createState() => _ReadEpubState();
}

class _ReadEpubState extends State<ReadEpub> {
  EpubController? _epubController;
  bool _isLoading = true;
  bool _hasError = false;

  int _currentChapter = 0;
  int _totalChapters = 0;

  Timer? _progressDebounce;
  final BookmarkRepository _bookmarkRepo = BookmarkRepository();
  List<Bookmark> _bookmarks = [];

  String get _bookId =>
      widget.book.downloadUrl.split('/').last.split('?').first;

  @override
  void initState() {
    super.initState();
    _loadEpub();
    _loadBookmarks();

    if (widget.book.pagesRead != null) {
      _currentChapter = widget.book.pagesRead!;
    }
    if (widget.book.totalPages != null && widget.book.totalPages! > 0) {
      _totalChapters = widget.book.totalPages!;
    }
  }

  @override
  void dispose() {
    _progressDebounce?.cancel();
    _saveProgress();
    _epubController?.dispose();
    super.dispose();
  }

  Future<void> _loadEpub() async {
    try {
      final data = await InternetFile.get(widget.book.downloadUrl);
      if (!mounted) return;

      setState(() {
        _epubController = EpubController(
          document: EpubDocument.openData(data),
          epubCfi: null,
        );
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() { _isLoading = false; _hasError = true; });
    }
  }

  Future<void> _loadBookmarks() async {
    final bookmarks = await _bookmarkRepo.getBookmarks(_bookId);
    if (mounted) setState(() => _bookmarks = bookmarks);
  }

  void _onChapterChanged(EpubChapterViewValue? value) {
    if (value == null) return;
    final chapter = value.chapterNumber;
    final total = _totalChapters;

    if (chapter != _currentChapter || total != _totalChapters) {
      setState(() {
        _currentChapter = chapter;
        _totalChapters = total;
      });
      _scheduleProgressSave();
    }
  }

  void _scheduleProgressSave() {
    _progressDebounce?.cancel();
    _progressDebounce = Timer(const Duration(seconds: 3), _saveProgress);
  }

  void _saveProgress() {
    if (_totalChapters > 0) {
      context.read<DashboardBloc>().add(
            UpdateReadingProgress(
              bookId: _bookId,
              pagesRead: _currentChapter,
              totalPages: _totalChapters,
            ),
          );
    }
  }

  Future<void> _addBookmark() async {
    String? chapterTitle;
    try {
      final value = _epubController?.currentValueListenable.value;
      chapterTitle = value?.chapter?.Title;
    } catch (_) {}

    final bookmark = await _bookmarkRepo.addBookmark(
      bookId: _bookId,
      bookTitle: widget.book.title,
      page: _currentChapter,
      chapterTitle: chapterTitle,
    );

    if (bookmark != null && mounted) {
      setState(() => _bookmarks.insert(0, bookmark));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(chapterTitle != null
              ? 'Bookmarked: $chapterTitle'
              : 'Bookmarked chapter ${_currentChapter + 1}'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _deleteBookmark(Bookmark bookmark) async {
    await _bookmarkRepo.deleteBookmark(bookmark.id);
    setState(() => _bookmarks.removeWhere((b) => b.id == bookmark.id));
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<ReaderSettingsProvider>().settings;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: settings.backgroundColor,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: const Color(0xFF6366F1)),
              const SizedBox(height: 16),
              Text('Loading book...', style: TextStyle(color: settings.textColor)),
            ],
          ),
        ),
      );
    }

    if (_hasError || _epubController == null) {
      return Scaffold(
        backgroundColor: settings.backgroundColor,
        appBar: _buildAppBar(settings),
        body: Center(
          child: Text(
            'Unable to load ebook',
            style: TextStyle(color: settings.textColor, fontSize: 16),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: settings.backgroundColor,
      appBar: _buildAppBar(settings),
      drawer: _buildTOCDrawer(settings),
      endDrawer: _buildBookmarksDrawer(settings),
      body: Column(
        children: [
          Expanded(
            child: EpubView(
              builders: EpubViewBuilders<DefaultBuilderOptions>(
                options: DefaultBuilderOptions(
                  textStyle: TextStyle(
                    fontSize: settings.fontSizePt,
                    height: settings.lineHeightMultiplier,
                    fontFamily: settings.fontFamilyName,
                    color: settings.textColor,
                  ),
                ),
                chapterDividerBuilder: (_) => Divider(
                  color: settings.textColor.withOpacity(0.15),
                ),
              ),
              controller: _epubController!,
              onChapterChanged: _onChapterChanged,
            ),
          ),
          _buildProgressBar(settings),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(ReaderSettings settings) {
    return AppBar(
      backgroundColor: settings.appBarColor,
      elevation: 0,
      leading: IconButton(
        icon: Icon(Icons.arrow_back_ios, color: settings.appBarTextColor, size: 20),
        onPressed: () async {
          Navigator.pop(context);
          final bookId = widget.book.id ??
              widget.book.downloadUrl.split('/').last.split('?').first;
          final pct = _totalChapters > 0 ? _currentChapter / _totalChapters : 0.0;
          await maybeShowReviewPrompt(
            context,
            bookId: bookId,
            bookTitle: widget.book.title,
            percentageComplete: pct,
          );
        },
      ),
      title: Text(
        widget.book.title,
        style: TextStyle(
          color: settings.appBarTextColor,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        overflow: TextOverflow.ellipsis,
      ),
      actions: [
        IconButton(
          icon: Icon(Icons.bookmark_border, color: settings.appBarTextColor),
          onPressed: _addBookmark,
          tooltip: 'Add bookmark',
        ),
        Builder(builder: (ctx) => IconButton(
          icon: Icon(Icons.bookmarks_outlined, color: settings.appBarTextColor),
          onPressed: () => Scaffold.of(ctx).openEndDrawer(),
          tooltip: 'View bookmarks',
        )),
        Builder(builder: (ctx) => IconButton(
          icon: Icon(Icons.menu_book_outlined, color: settings.appBarTextColor),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
          tooltip: 'Table of contents',
        )),
        IconButton(
          icon: Icon(Icons.text_fields, color: settings.appBarTextColor),
          onPressed: () => showReaderSettingsSheet(context),
          tooltip: 'Reading settings',
        ),
      ],
    );
  }

  Widget _buildProgressBar(ReaderSettings settings) {
    final pct = _totalChapters > 0 ? _currentChapter / _totalChapters : 0.0;
    return Container(
      color: settings.appBarColor,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: pct,
                backgroundColor: settings.textColor.withOpacity(0.15),
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                minHeight: 3,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  'Chapter ${_currentChapter + 1} of $_totalChapters',
                  style: TextStyle(
                    fontSize: 12,
                    color: settings.textColor.withOpacity(0.7),
                  ),
                ),
                const Spacer(),
                Text(
                  '${(pct * 100).toInt()}% complete',
                  style: TextStyle(
                    fontSize: 12,
                    color: settings.textColor.withOpacity(0.7),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTOCDrawer(ReaderSettings settings) {
    return Drawer(
      backgroundColor: settings.appBarColor,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Table of Contents',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: settings.textColor,
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: Theme(
                data: Theme.of(context).copyWith(
                  textTheme: Theme.of(context).textTheme.apply(
                        bodyColor: settings.textColor,
                        displayColor: settings.textColor,
                      ),
                ),
                child: EpubViewTableOfContents(
                  controller: _epubController!,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookmarksDrawer(ReaderSettings settings) {
    return Drawer(
      backgroundColor: settings.appBarColor,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
              child: Row(
                children: [
                  Text(
                    'Bookmarks',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: settings.textColor,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _bookmarks.isEmpty
                  ? Center(
                      child: Text(
                        'No bookmarks yet.\nTap ⊕ to add one.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: settings.textColor.withOpacity(0.5)),
                      ),
                    )
                  : ListView.builder(
                      itemCount: _bookmarks.length,
                      itemBuilder: (ctx, i) {
                        final bm = _bookmarks[i];
                        return ListTile(
                          leading: const Icon(Icons.bookmark, color: Color(0xFF6366F1), size: 20),
                          title: Text(
                            bm.chapterTitle ?? 'Chapter ${bm.page + 1}',
                            style: TextStyle(color: settings.textColor, fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            bm.bookTitle,
                            style: TextStyle(color: settings.textColor.withOpacity(0.6), fontSize: 12),
                          ),
                          trailing: IconButton(
                            icon: Icon(Icons.delete_outline, color: Colors.red.withOpacity(0.7), size: 18),
                            onPressed: () => _deleteBookmark(bm),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
