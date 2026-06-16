import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
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

class ReadPDF extends StatefulWidget {
  final Book book;

  const ReadPDF({Key? key, required this.book}) : super(key: key);

  @override
  _ReadPDFState createState() => _ReadPDFState();
}

class _ReadPDFState extends State<ReadPDF> {
  String _pdfPath = '';
  bool _loaded = false;
  bool _hasError = false;

  int _totalPages = 0;
  int _currentPage = 0;
  bool _pdfReady = false;
  late PDFViewController _pdfViewController;

  Timer? _progressDebounce;
  final BookmarkRepository _bookmarkRepo = BookmarkRepository();
  List<Bookmark> _bookmarks = [];
  bool _showBookmarks = false;

  String get _bookId =>
      widget.book.downloadUrl.split('/').last.split('?').first;

  @override
  void initState() {
    super.initState();
    _requestPermission();
    _loadPDF();
    _loadBookmarks();

    if (widget.book.pagesRead != null && widget.book.pagesRead! > 0) {
      _currentPage = widget.book.pagesRead!;
    }
    if (widget.book.totalPages != null && widget.book.totalPages! > 0) {
      _totalPages = widget.book.totalPages!;
    }
  }

  @override
  void dispose() {
    _progressDebounce?.cancel();
    _saveProgress();
    super.dispose();
  }

  Future<void> _requestPermission() async {
    await Permission.storage.request();
  }

  Future<void> _loadPDF() async {
    try {
      final data = await http.get(Uri.parse(widget.book.downloadUrl));
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/${widget.book.title}.pdf');
      await file.writeAsBytes(data.bodyBytes);
      if (mounted) {
        setState(() {
          _pdfPath = file.path;
          _loaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _hasError = true);
    }
  }

  Future<void> _loadBookmarks() async {
    final bookmarks = await _bookmarkRepo.getBookmarks(_bookId);
    if (mounted) setState(() => _bookmarks = bookmarks);
  }

  void _onPageChanged(int? page, int? total) {
    if (page == null) return;
    setState(() {
      _currentPage = page;
      if (total != null) _totalPages = total;
    });
    _scheduleProgressSave();
  }

  void _scheduleProgressSave() {
    _progressDebounce?.cancel();
    _progressDebounce = Timer(const Duration(seconds: 2), _saveProgress);
  }

  void _saveProgress() {
    if (_totalPages > 0) {
      context.read<DashboardBloc>().add(
            UpdateReadingProgress(
              bookId: _bookId,
              pagesRead: _currentPage,
              totalPages: _totalPages,
            ),
          );
    }
  }

  Future<void> _addBookmark() async {
    final bookmark = await _bookmarkRepo.addBookmark(
      bookId: _bookId,
      bookTitle: widget.book.title,
      page: _currentPage,
    );
    if (bookmark != null && mounted) {
      setState(() => _bookmarks.insert(0, bookmark));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Bookmarked page ${_currentPage + 1}'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _deleteBookmark(Bookmark bookmark) async {
    await _bookmarkRepo.deleteBookmark(bookmark.id);
    setState(() => _bookmarks.removeWhere((b) => b.id == bookmark.id));
  }

  void _jumpToPage(int page) {
    if (_pdfReady) {
      _pdfViewController.setPage(page);
      setState(() {
        _showBookmarks = false;
        _currentPage = page;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<ReaderSettingsProvider>().settings;

    if (!_loaded && !_hasError) {
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

    if (_hasError) {
      return Scaffold(
        backgroundColor: settings.backgroundColor,
        appBar: _buildAppBar(settings),
        body: Center(
          child: Text(
            'Unable to load PDF',
            style: TextStyle(color: settings.textColor, fontSize: 16),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: settings.backgroundColor,
      appBar: _buildAppBar(settings),
      body: Stack(
        children: [
          PDFView(
            filePath: _pdfPath,
            autoSpacing: true,
            enableSwipe: true,
            pageSnap: true,
            swipeHorizontal: true,
            nightMode: settings.theme == ReaderTheme.dark,
            defaultPage: _currentPage,
            onRender: (pages) {
              if (mounted) {
                setState(() {
                  _totalPages = pages ?? 0;
                  _pdfReady = true;
                });
              }
            },
            onViewCreated: (PDFViewController vc) {
              setState(() => _pdfViewController = vc);
              if (_currentPage > 0) {
                vc.setPage(_currentPage);
              }
            },
            onPageChanged: _onPageChanged,
            onError: (_) => setState(() => _hasError = true),
            onPageError: (_, __) {},
          ),

          // Bookmarks panel
          if (_showBookmarks)
            _BookmarksPanel(
              bookmarks: _bookmarks,
              textColor: settings.textColor,
              backgroundColor: settings.appBarColor,
              onClose: () => setState(() => _showBookmarks = false),
              onJump: _jumpToPage,
              onDelete: _deleteBookmark,
            ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(settings),
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
          final pct = _totalPages > 0 ? _currentPage / _totalPages : 0.0;
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
          icon: Icon(
            Icons.bookmark_border,
            color: settings.appBarTextColor,
          ),
          onPressed: _addBookmark,
          tooltip: 'Add bookmark',
        ),
        IconButton(
          icon: Icon(
            Icons.bookmarks_outlined,
            color: _showBookmarks
                ? const Color(0xFF6366F1)
                : settings.appBarTextColor,
          ),
          onPressed: () => setState(() => _showBookmarks = !_showBookmarks),
          tooltip: 'View bookmarks',
        ),
        IconButton(
          icon: Icon(Icons.text_fields, color: settings.appBarTextColor),
          onPressed: () => showReaderSettingsSheet(context),
          tooltip: 'Reading settings',
        ),
      ],
    );
  }

  Widget _buildBottomBar(ReaderSettings settings) {
    return Container(
      color: settings.appBarColor,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(
              icon: Icon(Icons.chevron_left, color: settings.appBarTextColor),
              iconSize: 32,
              onPressed: _currentPage > 0
                  ? () {
                      final target = _currentPage - 1;
                      _pdfViewController.setPage(target);
                      setState(() => _currentPage = target);
                      _scheduleProgressSave();
                    }
                  : null,
            ),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${_currentPage + 1} / $_totalPages',
                    style: TextStyle(
                      color: settings.appBarTextColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (_totalPages > 0) ...[
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: LinearProgressIndicator(
                        value: _totalPages > 0 ? (_currentPage + 1) / _totalPages : 0,
                        backgroundColor: settings.textColor.withOpacity(0.15),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                        minHeight: 3,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              icon: Icon(Icons.chevron_right, color: settings.appBarTextColor),
              iconSize: 32,
              onPressed: _currentPage < _totalPages - 1
                  ? () {
                      final target = _currentPage + 1;
                      _pdfViewController.setPage(target);
                      setState(() => _currentPage = target);
                      _scheduleProgressSave();
                    }
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _BookmarksPanel extends StatelessWidget {
  final List<Bookmark> bookmarks;
  final Color textColor;
  final Color backgroundColor;
  final VoidCallback onClose;
  final void Function(int page) onJump;
  final void Function(Bookmark bookmark) onDelete;

  const _BookmarksPanel({
    required this.bookmarks,
    required this.textColor,
    required this.backgroundColor,
    required this.onClose,
    required this.onJump,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      right: 0,
      bottom: 0,
      width: 280,
      child: Material(
        elevation: 8,
        child: Container(
          color: backgroundColor,
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
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: textColor,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: Icon(Icons.close, color: textColor, size: 20),
                      onPressed: onClose,
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: bookmarks.isEmpty
                    ? Center(
                        child: Text(
                          'No bookmarks yet.\nTap ⊕ to add one.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: textColor.withOpacity(0.5)),
                        ),
                      )
                    : ListView.builder(
                        itemCount: bookmarks.length,
                        itemBuilder: (ctx, i) {
                          final bm = bookmarks[i];
                          return ListTile(
                            leading: Icon(Icons.bookmark, color: const Color(0xFF6366F1), size: 20),
                            title: Text(
                              'Page ${bm.page + 1}',
                              style: TextStyle(color: textColor, fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              bm.chapterTitle ?? bm.bookTitle,
                              style: TextStyle(color: textColor.withOpacity(0.6), fontSize: 12),
                            ),
                            trailing: IconButton(
                              icon: Icon(Icons.delete_outline, color: Colors.red.withOpacity(0.7), size: 18),
                              onPressed: () => onDelete(bm),
                            ),
                            onTap: () => onJump(bm.page),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
