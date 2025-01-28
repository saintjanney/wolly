import 'package:epub_view/epub_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemChrome, SystemUiOverlayStyle;
import 'package:wolly/models/book.dart';
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

  @override
  void initState() {
    super.initState();
    _loadEpub();
  }

  void _loadEpub() async {
    final data = await InternetFile.get(widget.book.downloadUrl);
    setState(() {
      _epubReaderController = EpubController(
        document: EpubDocument.openData(data),
      );
    });
  }

  @override
  void dispose() {
    _epubReaderController!.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: _epubReaderController != null
              ? EpubViewActualChapter(
                  controller: _epubReaderController!,
                  builder: (chapterValue) => Text(
                    chapterValue?.chapter?.Title?.replaceAll('\n', '').trim() ??
                        '',
                    textAlign: TextAlign.start,
                  ),
                )
              : SizedBox(),
          actions: <Widget>[
            IconButton(
              icon: const Icon(Icons.close),
              color: Colors.black,
              onPressed: () {
                Navigator.pop(context);
              },
            ),
            // IconButton(
            //   icon: const Icon(Icons.save_alt),
            //   color: Colors.white,
            //   onPressed: () => _showCurrentEpubCfi(context),
            // ),
          ],
        ),
        drawer: _epubReaderController != null
            ? Drawer(
                child:
                    EpubViewTableOfContents(controller: _epubReaderController!),
              )
            : SizedBox(),
        body: _epubReaderController != null
            ? EpubView(
                builders: EpubViewBuilders<DefaultBuilderOptions>(
                  options: const DefaultBuilderOptions(),
                  chapterDividerBuilder: (_) => const Divider(),
                ),
                controller: _epubReaderController!,
              )
            : const Center(child: CircularProgressIndicator()),
      );

  void _showCurrentEpubCfi(context) {
    final cfi = _epubReaderController!.generateEpubCfi();

    if (cfi != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(cfi),
          action: SnackBarAction(
            label: 'GO',
            onPressed: () {
              _epubReaderController!.gotoEpubCfi(cfi);
            },
          ),
        ),
      );
    }
  }
}
