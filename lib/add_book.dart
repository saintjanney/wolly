import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import 'features/library/domain/models/book_creation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'features/platform/domain/models/platform_book.dart';

// Temporary fallback user for development when FirebaseAuth is not initialized
const String kDevFallbackUserId = 'Vcx6MznZITTdl9hhM9AmpIeOpiE3';

class AddBook extends StatefulWidget {
  final PlatformBook? existing;
  const AddBook({super.key, this.existing});

  @override
  State<AddBook> createState() => _AddBookState();
}

class _AddBookState extends State<AddBook> {
  int _currentStep = 0;
  final PageController _pageController = PageController();
  
  // Book creation model
  late BookCreation bookCreation;
  
  // Controllers
  final TextEditingController titleController = TextEditingController();
  final TextEditingController subtitleController = TextEditingController();
  final TextEditingController newSeriesController = TextEditingController();
  final TextEditingController editionNumberController = TextEditingController();
  final TextEditingController authorNameController = TextEditingController();
  final TextEditingController contributorsController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();
  final List<TextEditingController> keywordControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];
  
  // UI state
  String? selectedSeries;
  String? aiUsageDescription;
  String? aiToolUsed;
  // Existing assets when editing
  String? existingCoverUrl;
  String? existingManuscriptUrl;

  // Available options
  final List<String> languages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Russian',
    'Chinese',
    'Japanese',
    'Korean',
    'Arabic',
    'Hindi',
  ];

  final List<String> readingAges = [
    'All Ages',
    'Children (0-12)',
    'Young Adult (13-17)',
    'Adult (18+)',
    'Mature (21+)',
  ];

  final List<String> categories = [
    'Fiction',
    'Non-Fiction',
    'Romance',
    'Mystery & Thriller',
    'Science Fiction',
    'Fantasy',
    'Horror',
    'Biography & Memoir',
    'Self-Help',
    'Business & Economics',
    'History',
    'Science & Technology',
    'Health & Fitness',
    'Travel',
    'Cooking',
    'Poetry',
    'Drama',
    'Comedy',
    'Adventure',
    'Educational',
  ];

  final List<String> series = [
    'The Chronicles of Narnia',
    'Harry Potter',
    'Lord of the Rings',
    'Game of Thrones',
    'The Hunger Games',
    'Twilight',
    'Percy Jackson',
    'Divergent',
    'Maze Runner',
    'Other (Create New)',
  ];

  @override
  void initState() {
    super.initState();
    bookCreation = BookCreation();
    // Default to ebook since it's the only supported type
    bookCreation = bookCreation.copyWith(bookType: 'ebook');
    // Prefill when editing an existing book
    final existing = widget.existing;
    if (existing != null) {
      titleController.text = existing.title;
      subtitleController.text = existing.subtitle ?? '';
      newSeriesController.text = existing.seriesName ?? '';
      editionNumberController.text = existing.editionNumber ?? '';
      authorNameController.text = existing.authorName;
      contributorsController.text = existing.contributors.join(', ');
      descriptionController.text = existing.description;

      bookCreation = bookCreation.copyWith(
        bookType: existing.type,
        language: existing.language,
        title: existing.title,
        subtitle: existing.subtitle,
        seriesName: existing.seriesName,
        editionNumber: existing.editionNumber,
        authorName: existing.authorName,
        contributors: existing.contributors.join(', '),
        description: existing.description,
        ownsCopyright: existing.ownsCopyright,
        hasExplicitContent: existing.hasExplicitContent,
        readingAge: existing.readingAge,
        categories: existing.categories,
        keywords: existing.keywords,
      );
      existingCoverUrl = existing.coverUrl;
      existingManuscriptUrl = existing.manuscriptUrl;
      _currentStep = 0; // details is the first step now
    }
  }

  @override
  void dispose() {
    titleController.dispose();
    subtitleController.dispose();
    newSeriesController.dispose();
    editionNumberController.dispose();
    authorNameController.dispose();
    contributorsController.dispose();
    descriptionController.dispose();
    for (var controller in keywordControllers) {
      controller.dispose();
    }
    _pageController.dispose();
    super.dispose();
  }

  void _updateBookCreation() {
    // Update the book creation model with current text field values
    bookCreation = bookCreation.copyWith(
      title: titleController.text.isNotEmpty ? titleController.text : null,
      subtitle: subtitleController.text.isNotEmpty ? subtitleController.text : null,
      seriesName: newSeriesController.text.isNotEmpty ? newSeriesController.text : null,
      editionNumber: editionNumberController.text.isNotEmpty ? editionNumberController.text : null,
      authorName: authorNameController.text.isNotEmpty ? authorNameController.text : null,
      contributors: contributorsController.text.isNotEmpty ? contributorsController.text : null,
      description: descriptionController.text.isNotEmpty ? descriptionController.text : null,
      keywords: keywordControllers.where((c) => c.text.isNotEmpty).map((c) => c.text).toList(),
    );
  }

  void _nextStep() {
    // Update the model before proceeding
    _updateBookCreation();
    
    if (_currentStep < 2) {
      setState(() {
        _currentStep++;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  bool _isSaving = false;

  Future<void> _publishBook() async {
    if (_isSaving) return; // prevent double taps
    // Update the model with final values
    _updateBookCreation();
    
    // Validate the complete book creation
    if (!bookCreation.isComplete) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(bookCreation.validationMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }
    setState(() => _isSaving = true);
    try {
      await _saveToBackend();
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _saveToBackend() async {
    try {
      final uid = FirebaseAuth.instance.currentUser?.uid ?? kDevFallbackUserId;

      // 1) Upload files to Firebase Storage
      final storage = FirebaseStorage.instance;
      String? coverUrl;
      String? manuscriptUrl;

      final now = DateTime.now().millisecondsSinceEpoch;
      if (bookCreation.coverFile != null) {
        final ref = storage.ref().child('books/$uid/$now/cover_${bookCreation.coverFile!.path.split('/').last}');
        await ref.putFile(bookCreation.coverFile!);
        coverUrl = await ref.getDownloadURL();
      }
      if (bookCreation.manuscriptFile != null) {
        final ref = storage.ref().child('books/$uid/$now/manuscript_${bookCreation.manuscriptFile!.path.split('/').last}');
        await ref.putFile(bookCreation.manuscriptFile!);
        manuscriptUrl = await ref.getDownloadURL();
      }

      // 2) Build PlatformBook and store in Firestore 'books'
      final id = widget.existing?.id ?? FirebaseFirestore.instance.collection('books').doc().id;
      final book = PlatformBook(
        id: id,
        ownerUserId: uid,
        type: bookCreation.bookType ?? 'ebook',
        language: bookCreation.language ?? 'English',
        title: bookCreation.title ?? '',
        subtitle: bookCreation.subtitle,
        seriesName: bookCreation.seriesName,
        editionNumber: bookCreation.editionNumber,
        authorName: bookCreation.authorName ?? '',
        contributors: (bookCreation.contributors?.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList()) ?? const [],
        description: bookCreation.description ?? '',
        ownsCopyright: bookCreation.ownsCopyright,
        hasExplicitContent: bookCreation.hasExplicitContent,
        readingAge: bookCreation.readingAge,
        categories: bookCreation.categories,
        keywords: bookCreation.keywords,
        coverUrl: coverUrl,
        manuscriptUrl: manuscriptUrl,
        isPublished: false,
        aiGenerated: bookCreation.isAIGenerated,
        aiUsageDescription: aiUsageDescription,
        aiToolUsed: aiToolUsed,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final docRef = FirebaseFirestore.instance.collection('books').doc(id);
      if (widget.existing == null) {
        await docRef.set(book.toJson());
      } else {
        await docRef.update(book.toJson());
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Book saved successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save book: $e')),
        );
      }
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _navigateToStep(int step) {
    // Update the model before navigating
    _updateBookCreation();
    
    // Validate that we can navigate to the requested step
    if (step < 0 || step > 2) return;
    
    // If trying to go to a later step, validate the current step first
    if (step > _currentStep && !_validateCurrentStep()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please complete the current step before proceeding'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    
    setState(() {
      _currentStep = step;
    });
    
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _pickFile(String type) async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: type == 'manuscript' 
            ? ['epub', 'doc', 'docx', 'pdf'] 
            : ['jpg', 'jpeg', 'png', 'pdf'],
      );

      if (result != null && mounted) {
        setState(() {
          if (type == 'manuscript') {
            bookCreation = bookCreation.copyWith(
              manuscriptFile: File(result.files.single.path!),
            );
            existingManuscriptUrl = null;
          } else {
            bookCreation = bookCreation.copyWith(
              coverFile: File(result.files.single.path!),
            );
            existingCoverUrl = null;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking file: $e')),
        );
      }
    }
  }

  bool _validateCurrentStep() {
    switch (_currentStep) {
      case 0: // Details
        return bookCreation.language != null &&
               titleController.text.isNotEmpty &&
               authorNameController.text.isNotEmpty &&
               descriptionController.text.isNotEmpty &&
               bookCreation.categories.length <= 3;
      case 1: // Upload
        final hasManuscript = bookCreation.manuscriptFile != null || existingManuscriptUrl != null;
        final hasCover = bookCreation.coverFile != null || existingCoverUrl != null;
        return hasManuscript && hasCover;
      case 2: // Preview
        return true; // Preview step
      default:
        return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Your Book'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          Column(
            children: [
          // Progress indicator
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: List.generate(3, (index) {
                return Expanded(
                  child: GestureDetector(
                    onTap: () => _isSaving ? null : _navigateToStep(index),
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: index < 2 ? 8 : 0),
                      decoration: BoxDecoration(
                        color: index <= _currentStep 
                            ? Theme.of(context).primaryColor 
                            : Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          
          // Step titles
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildStepTitle(0, 'Details'),
                _buildStepTitle(1, 'Upload'),
                _buildStepTitle(2, 'Preview'),
              ],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Content
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildDetailsStep(),
                _buildUploadStep(),
                _buildPreviewStep(),
              ],
            ),
          ),
          
          // Navigation buttons
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (_currentStep > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSaving ? null : _previousStep,
                      child: const Text('Previous'),
                    ),
                  ),
                if (_currentStep > 0) const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: (_validateCurrentStep() && !_isSaving)
                        ? (_currentStep == 2 ? _publishBook : _nextStep)
                        : null,
                    child: _currentStep == 2
                        ? (_isSaving
                            ? const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Text('Publishing...'),
                                ],
                              )
                            : const Text('Publish Book'))
                        : const Text('Next'),
                  ),
                ),
              ],
            ),
          ),
            ],
          ),
          if (_isSaving)
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  color: Colors.black.withValues(alpha: 0.05),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStepTitle(int step, String title) {
    final isActive = step == _currentStep;
    final isCompleted = step < _currentStep;
    
    return Expanded(
      child: GestureDetector(
        onTap: () => _navigateToStep(step),
        child: Text(
          title,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: isActive 
                ? Theme.of(context).primaryColor 
                : isCompleted 
                    ? Colors.green 
                    : Colors.grey,
          ),
        ),
      ),
    );
  }

  // Removed obsolete book type step

  // Removed obsolete book type card

  Widget _buildDetailsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Book Details',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 32),
          
          // Language
          _buildDropdownField(
            'Language',
            bookCreation.language,
            languages,
            (value) => setState(() => bookCreation = bookCreation.copyWith(language: value)),
            'Select the language of your book',
          ),
          
          const SizedBox(height: 16),
          
          // Title
          _buildTextField(
            'Book Title',
            titleController,
            'Enter your book title',
            maxLines: 1,
          ),
          
          const SizedBox(height: 16),
          
          // Subtitle
          _buildTextField(
            'Subtitle (Optional)',
            subtitleController,
            'Enter subtitle if applicable',
            maxLines: 1,
          ),
          
          const SizedBox(height: 16),
          
          // Series
          _buildSeriesSection(),
          
          const SizedBox(height: 16),
          
          // Author
          _buildTextField(
            'Author Name or Pen Name',
            authorNameController,
            'Enter your author name',
            maxLines: 1,
          ),
          
          const SizedBox(height: 16),
          
          // Contributors
          _buildTextField(
            'Contributors (Optional)',
            contributorsController,
            'Enter names of contributors',
            maxLines: 1,
          ),
          
          const SizedBox(height: 16),
          
          // Description
          _buildTextField(
            'Book Description',
            descriptionController,
            'Describe your book, what\'s included, and add a call to action',
            maxLines: 5,
          ),
          
          const SizedBox(height: 16),
          
          // Copyright
          _buildCheckboxField(
            'I own the copyright to this book',
            bookCreation.ownsCopyright,
            (value) => setState(() => bookCreation = bookCreation.copyWith(ownsCopyright: value)),
          ),
          
          const SizedBox(height: 16),
          
          // Explicit content
          _buildCheckboxField(
            'This book contains sexually explicit content',
            bookCreation.hasExplicitContent,
            (value) => setState(() => bookCreation = bookCreation.copyWith(hasExplicitContent: value)),
          ),
          
          const SizedBox(height: 16),
          
          // Reading age
          _buildDropdownField(
            'Reading Age (Optional)',
            bookCreation.readingAge,
            readingAges,
            (value) => setState(() => bookCreation = bookCreation.copyWith(readingAge: value)),
            'Select target reading age',
          ),
          
          const SizedBox(height: 16),
          
          // Categories
          _buildCategoriesSection(),
          
          const SizedBox(height: 16),
          
          // Keywords
          _buildKeywordsSection(),
        ],
      ),
    );
  }

  Widget _buildSeriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildCheckboxField(
          'This book is part of a series',
          bookCreation.isPartOfSeries,
          (value) => setState(() => bookCreation = bookCreation.copyWith(isPartOfSeries: value)),
        ),
        
        if (bookCreation.isPartOfSeries) ...[
          const SizedBox(height: 16),
          _buildDropdownField(
            'Select Series',
            selectedSeries,
            series,
            (value) {
              setState(() {
                selectedSeries = value;
                if (value == 'Other (Create New)') {
                  selectedSeries = null;
                }
              });
            },
            'Choose existing series or create new',
          ),
          
          if (selectedSeries == null || selectedSeries == 'Other (Create New)') ...[
            const SizedBox(height: 16),
            _buildTextField(
              'New Series Name',
              newSeriesController,
              'Enter new series name',
              maxLines: 1,
            ),
          ],
          
          const SizedBox(height: 16),
          _buildTextField(
            'Edition Number (Optional)',
            editionNumberController,
            'e.g., 1, 2, 3',
            maxLines: 1,
          ),
        ],
      ],
    );
  }

  Widget _buildCategoriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Categories (Select up to 3)',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: categories.map((category) {
            final isSelected = bookCreation.categories.contains(category);
            return FilterChip(
              label: Text(category),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  List<String> newCategories = List.from(bookCreation.categories);
                  if (selected && newCategories.length < 3) {
                    newCategories.add(category);
                  } else if (!selected) {
                    newCategories.remove(category);
                  }
                  bookCreation = bookCreation.copyWith(categories: newCategories);
                });
              },
            );
          }).toList(),
        ),
        if (bookCreation.categories.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            'Selected: ${bookCreation.categories.join(', ')}',
            style: const TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildKeywordsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Keywords (Max 5)',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Enter phrases people might search for to find your book. Avoid using words already in your title.',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 8),
        ...List.generate(5, (index) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _buildTextField(
              'Keyword ${index + 1}',
              keywordControllers[index],
              'Enter keyword or phrase',
              maxLines: 1,
            ),
          );
        }),
      ],
    );
  }

  Widget _buildUploadStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Upload Content & Cover',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 32),
          
          // Manuscript upload
          _buildFileUploadSection(
            'Upload Manuscript',
            'Upload your book file (ePub, Word doc, or PDF)',
            bookCreation.manuscriptFile,
            () => _pickFile('manuscript'),
            Icons.description,
            existingUrl: existingManuscriptUrl,
          ),
          
          const SizedBox(height: 24),
          
          // Cover upload
          _buildFileUploadSection(
            'Upload Book Cover',
            'Upload your book cover image (JPG, PNG, or PDF)',
            bookCreation.coverFile,
            () => _pickFile('cover'),
            Icons.image,
            existingUrl: existingCoverUrl,
            isImage: true,
          ),
          
          const SizedBox(height: 24),
          
          // AI Generated content
          _buildCheckboxField(
            'This content is AI generated',
            bookCreation.isAIGenerated,
            (value) => setState(() => bookCreation = bookCreation.copyWith(isAIGenerated: value)),
          ),
          
          if (bookCreation.isAIGenerated) ...[
            const SizedBox(height: 16),
            _buildTextField(
              'AI Usage Description',
              TextEditingController(text: aiUsageDescription),
              'Describe how AI was used (e.g., "some sections with extensive editing")',
              maxLines: 2,
              onChanged: (value) => aiUsageDescription = value,
            ),
            
            const SizedBox(height: 16),
            _buildTextField(
              'AI Tool Used',
              TextEditingController(text: aiToolUsed),
              'e.g., ChatGPT, Claude, etc.',
              maxLines: 1,
              onChanged: (value) => aiToolUsed = value,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFileUploadSection(
    String title,
    String description,
    File? file,
    VoidCallback onTap,
    IconData icon, {
    String? existingUrl,
    bool isImage = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 24, color: Theme.of(context).primaryColor),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          if (file != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green[200]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      file.path.split('/').last,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () {
                      setState(() {
                        if (title.contains('Manuscript')) {
                          bookCreation = bookCreation.copyWith(manuscriptFile: null);
                        } else {
                          bookCreation = bookCreation.copyWith(coverFile: null);
                        }
                      });
                    },
                  ),
                ],
              ),
            ),
          ] else if (existingUrl != null && existingUrl.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  if (isImage)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.network(
                        existingUrl,
                        width: 40,
                        height: 40,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(Icons.image_not_supported),
                      ),
                    )
                  else
                    const Icon(Icons.link, color: Colors.blue),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isImage ? 'Existing cover image' : 'Existing file',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                  ),
                  TextButton(
                    onPressed: onTap,
                    child: const Text('Replace'),
                  ),
                ],
              ),
            ),
          ] else ...[
            GestureDetector(
              onTap: onTap,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.grey[50],
                ),
                child: const Center(
                  child: Column(
                    children: [
                      Icon(Icons.upload_file, size: 48, color: Colors.grey),
                      SizedBox(height: 8),
                      Text(
                        'Click to upload file',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPreviewStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Preview Your Book',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Review all the information before publishing your book.',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 32),
          
          _buildPreviewCard('Book Type', bookCreation.bookType ?? 'Not selected'),
          _buildPreviewCard('Language', bookCreation.language ?? 'Not selected'),
          _buildPreviewCard('Title', titleController.text.isNotEmpty ? titleController.text : 'Not entered'),
          if (subtitleController.text.isNotEmpty)
            _buildPreviewCard('Subtitle', subtitleController.text),
          _buildPreviewCard('Author', authorNameController.text.isNotEmpty ? authorNameController.text : 'Not entered'),
          if (contributorsController.text.isNotEmpty)
            _buildPreviewCard('Contributors', contributorsController.text),
          _buildPreviewCard('Description', descriptionController.text.isNotEmpty ? descriptionController.text : 'Not entered'),
          _buildPreviewCard('Copyright', bookCreation.ownsCopyright ? 'Yes' : 'No'),
          _buildPreviewCard('Explicit Content', bookCreation.hasExplicitContent ? 'Yes' : 'No'),
          if (bookCreation.readingAge != null)
            _buildPreviewCard('Reading Age', bookCreation.readingAge!),
          _buildPreviewCard('Categories', bookCreation.categories.isNotEmpty ? bookCreation.categories.join(', ') : 'Not selected'),
          _buildPreviewCard('Keywords', keywordControllers.where((c) => c.text.isNotEmpty).map((c) => c.text).join(', ')),
          _buildPreviewCard('Manuscript', bookCreation.manuscriptFile != null ? 'Uploaded' : 'Not uploaded'),
          _buildPreviewCard('Cover', bookCreation.coverFile != null ? 'Uploaded' : 'Not uploaded'),
          if (bookCreation.isAIGenerated) ...[
            _buildPreviewCard('AI Generated', 'Yes'),
            if (aiUsageDescription != null)
              _buildPreviewCard('AI Usage', aiUsageDescription!),
            if (aiToolUsed != null)
              _buildPreviewCard('AI Tool', aiToolUsed!),
          ],
        ],
      ),
    );
  }

  Widget _buildPreviewCard(String title, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, String hint, {
    int maxLines = 1,
    Function(String)? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: maxLines,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownField(String label, String? value, List<String> options, Function(String?) onChanged, String hint) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: value,
          hint: Text(hint),
          items: options.map((option) {
            return DropdownMenuItem(
              value: option,
              child: Text(option),
            );
          }).toList(),
          onChanged: onChanged,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCheckboxField(String label, bool value, Function(bool) onChanged) {
    return Row(
      children: [
        Checkbox(
          value: value,
          onChanged: (newValue) => onChanged(newValue ?? false),
        ),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 16,
            ),
          ),
        ),
      ],
    );
  }
}
