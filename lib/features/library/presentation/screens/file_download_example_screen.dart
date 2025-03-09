import 'dart:io';
import 'package:flutter/material.dart';
import 'package:wolly/features/library/data/file_downloader.dart';

class FileDownloadExampleScreen extends StatefulWidget {
  const FileDownloadExampleScreen({super.key});

  @override
  State<FileDownloadExampleScreen> createState() => _FileDownloadExampleScreenState();
}

class _FileDownloadExampleScreenState extends State<FileDownloadExampleScreen> {
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String? _downloadedFilePath;
  String _statusMessage = '';

  Future<void> _downloadPdfFile() async {
    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _statusMessage = 'Starting download...';
    });

    try {
      // Example PDF URL
      const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      
      final filePath = await FileDownloader.downloadAndSaveFile(
        url: pdfUrl,
        filename: 'example.pdf',
        onProgress: (progress) {
          setState(() {
            _downloadProgress = progress;
            _statusMessage = 'Downloading: ${(_downloadProgress * 100).toStringAsFixed(2)}%';
          });
        },
      );
      
      setState(() {
        _downloadedFilePath = filePath;
        _statusMessage = 'Download complete! File saved at: $filePath';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Error downloading file: $e';
      });
    } finally {
      setState(() {
        _isDownloading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('File Download Example'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ElevatedButton(
              onPressed: _isDownloading ? null : _downloadPdfFile,
              child: Text(_isDownloading ? 'Downloading...' : 'Download PDF'),
            ),
            const SizedBox(height: 20),
            if (_isDownloading) ...[
              const Text('Download Progress:'),
              const SizedBox(height: 8),
              LinearProgressIndicator(value: _downloadProgress),
              const SizedBox(height: 8),
              Text('${(_downloadProgress * 100).toStringAsFixed(2)}%'),
            ],
            const SizedBox(height: 20),
            Text(_statusMessage),
            const SizedBox(height: 20),
            if (_downloadedFilePath != null) ...[
              const Text('Downloaded File:'),
              const SizedBox(height: 8),
              Text(_downloadedFilePath!),
              const SizedBox(height: 16),
              if (File(_downloadedFilePath!).existsSync())
                const Text('File exists on device', style: TextStyle(color: Colors.green)),
            ],
          ],
        ),
      ),
    );
  }
} 