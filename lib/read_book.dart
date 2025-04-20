import 'package:epub_view/epub_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemChrome, SystemUiOverlayStyle;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_bloc.dart';
import 'package:wolly/features/dashboard/presentation/bloc/dashboard_event.dart';
import 'package:wolly/features/library/domain/models/book.dart';
import 'package:internet_file/internet_file.dart';

// The cors policy is required on the server.
// You can raise your cors proxy.

class ReadEpub extends StatefulWidget {
  final Book book;
  const ReadEpub({Key? key, required this.book}) : super(key: key);

  @override
  State<ReadEpub> createState() => _ReadEpubState();
}

class _ReadEpubState extends State<ReadEpub> {
  EpubController? _epubReaderController;
  bool _isLoading = true;
  int _totalPages = 100; // Default estimate
  int _currentPage = 0;
  String _currentChapterTitle = '';
  
  @override
  void initState() {
    super.initState();
    _loadEpub();
    
    // Initialize with existing reading progress if available
    if (widget.book.pagesRead != null && widget.book.pagesRead! > 0) {
      _currentPage = widget.book.pagesRead ?? 0;
    }
    
    if (widget.book.totalPages != null && widget.book.totalPages! > 0) {
      _totalPages = widget.book.totalPages!;
    }
  }

  void _loadEpub() async {
    try {
      final data = await InternetFile.get(widget.book.downloadUrl);
      
      setState(() {
        _epubReaderController = EpubController(
          document: EpubDocument.openData(data),
        );
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading ebook: $e')),
      );
    }
  }
  
  void _updateReadingProgress() {
    if (_totalPages > 0) {
      // Extract a unique ID from the download URL
      final bookId = widget.book.downloadUrl.split('/').last.split('?').first;
      
      context.read<DashboardBloc>().add(
        UpdateReadingProgress(
          bookId: bookId,
          pagesRead: _currentPage,
          totalPages: _totalPages,
        ),
      );
    }
  }

  @override
  void dispose() {
    _updateReadingProgress(); // Save progress when exiting
    _epubReaderController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(
            widget.book.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          actions: <Widget>[
            IconButton(
              icon: const Icon(Icons.close),
              color: Colors.black,
              onPressed: () {
                Navigator.pop(context);
              },
            ),
            IconButton(
              icon: const Icon(Icons.bookmark),
              color: Colors.black,
              onPressed: () {
                // Simulate reading progress update - in real app would track actual position
                setState(() {
                  _currentPage += 5;
                  if (_currentPage > _totalPages) {
                    _currentPage = _totalPages;
                  }
                });
                _updateReadingProgress();
                _showReadingProgress(context);
              },
            ),
          ],
        ),
        drawer: _epubReaderController != null
            ? Drawer(
                child: SafeArea(
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        alignment: Alignment.centerLeft,
                        child: const Text(
                          'Table of Contents',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Expanded(
                        child: EpubViewTableOfContents(
                          controller: _epubReaderController!,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            : const SizedBox(),
        body: _isLoading 
            ? const Center(child: CircularProgressIndicator())
            : _epubReaderController != null
                ? Column(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            // Simulate page turn on tap
                            setState(() {
                              _currentPage += 1;
                              if (_currentPage > _totalPages) {
                                _currentPage = _totalPages;
                              }
                            });
                          },
                          child: EpubView(
                            builders: EpubViewBuilders<DefaultBuilderOptions>(
                              options: const DefaultBuilderOptions(),
                              chapterDividerBuilder: (_) => const Divider(),
                            ),
                            controller: _epubReaderController!,
                          ),
                        ),
                      ),
                      // Reading progress indicator
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
                        color: Colors.grey[200],
                        child: Row(
                          children: [
                            Text(
                              'Page $_currentPage of $_totalPages',
                              style: const TextStyle(fontSize: 12),
                            ),
                            const Spacer(),
                            Text(
                              _totalPages > 0 
                                  ? '${(_currentPage / _totalPages * 100).toInt()}% complete'
                                  : '',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : const Center(
                    child: Text('Unable to load ebook'),
                  ),
      );

  void _showReadingProgress(BuildContext context) {
    if (_totalPages == 0) return;
    
    final progress = _currentPage / _totalPages;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Reading progress: ${(progress * 100).toInt()}%'),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
