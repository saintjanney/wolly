'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useBookCreationStore } from '@/stores/bookCreationStore';
import { DocumentIcon, PhotoIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function UploadStep() {
  const { bookCreation, setBookCreation } = useBookCreationStore();
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  // Generate cover preview URL when coverFile changes
  useEffect(() => {
    if (bookCreation.coverFile) {
      const url = URL.createObjectURL(bookCreation.coverFile);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreviewUrl(null);
    }
  }, [bookCreation.coverFile]);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Allowed manuscript file extensions
  const allowedManuscriptExtensions = ['.pdf', '.epub', '.docx', '.doc'];
  
  // Allowed cover file extensions (matching UI text: JPG, PNG, or PDF)
  const allowedCoverExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

  // Validate file extension manually as a safety check
  const validateFileExtension = (file: File, allowedExtensions: string[]): boolean => {
    const fileName = file.name.toLowerCase();
    
    // Explicitly reject common unsupported formats
    const rejectedExtensions = ['.heic', '.heif', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
    if (rejectedExtensions.some(ext => fileName.endsWith(ext))) {
      return false;
    }
    
    // Check if file extension matches allowed extensions
    return allowedExtensions.some(ext => fileName.endsWith(ext));
  };

  const onManuscriptDropAccepted = useCallback((acceptedFiles: File[]) => {
    setManuscriptError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Double-check file extension
      if (validateFileExtension(file, allowedManuscriptExtensions)) {
        setBookCreation({ manuscriptFile: file });
        toast.success(`Manuscript uploaded: ${file.name}`);
      } else {
        setManuscriptError(`Invalid file type. Allowed: ${allowedManuscriptExtensions.join(', ')}`);
        toast.error('Invalid file type for manuscript');
      }
    }
  }, [setBookCreation]);

  const onManuscriptDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const rejection = fileRejections[0];
    let errorMessage = 'Invalid file type.';
    
    if (rejection.errors[0]?.code === 'file-invalid-type') {
      errorMessage = `File type not allowed. Please upload: ${allowedManuscriptExtensions.join(', ')}`;
    } else if (rejection.errors[0]?.code === 'too-many-files') {
      errorMessage = 'Please upload only one file at a time.';
    }
    
    setManuscriptError(errorMessage);
    toast.error(errorMessage);
  }, []);

  const onCoverDropAccepted = useCallback((acceptedFiles: File[]) => {
    setCoverError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Double-check file extension
      if (validateFileExtension(file, allowedCoverExtensions)) {
        setBookCreation({ coverFile: file });
        toast.success(`Cover uploaded: ${file.name}`);
      } else {
        setCoverError(`Invalid file type. Allowed: ${allowedCoverExtensions.join(', ')}`);
        toast.error('Invalid file type for cover');
      }
    }
  }, [setBookCreation]);

  const onCoverDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const rejection = fileRejections[0];
    let errorMessage = 'Invalid file type.';
    
    if (rejection.errors[0]?.code === 'file-invalid-type') {
      errorMessage = `File type not allowed. Please upload: ${allowedCoverExtensions.join(', ')}`;
    } else if (rejection.errors[0]?.code === 'too-many-files') {
      errorMessage = 'Please upload only one file at a time.';
    }
    
    setCoverError(errorMessage);
    toast.error(errorMessage);
  }, []);

  const manuscriptDropzone = useDropzone({
    onDropAccepted: onManuscriptDropAccepted,
    onDropRejected: onManuscriptDropRejected,
    accept: {
      'application/pdf': ['.pdf'],
      'application/epub+zip': ['.epub'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    multiple: false,
    maxFiles: 1
  });

  const coverDropzone = useDropzone({
    onDropAccepted: onCoverDropAccepted,
    onDropRejected: onCoverDropRejected,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    },
    multiple: false,
    maxFiles: 1
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Content & Cover</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Manuscript Upload */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Manuscript <span className="text-red-500">*</span></h3>
          <div
            {...manuscriptDropzone.getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              manuscriptDropzone.isDragActive
                ? 'border-blue-500 bg-blue-50'
                : manuscriptError
                ? 'border-red-300 bg-red-50'
                : bookCreation.manuscriptFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...manuscriptDropzone.getInputProps()} />
            <DocumentIcon className={`mx-auto h-12 w-12 mb-4 ${
              manuscriptError ? 'text-red-400' : bookCreation.manuscriptFile ? 'text-green-500' : 'text-gray-400'
            }`} />
            <p className="text-sm text-gray-600 mb-2">
              Upload your book file (ePub, Word doc, or PDF)
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Drag and drop or click to select
            </p>
            <p className="text-xs text-gray-400">
              Allowed formats: PDF, EPUB, DOC, DOCX
            </p>
            {bookCreation.manuscriptFile && !manuscriptError && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-5 h-5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">{bookCreation.manuscriptFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(bookCreation.manuscriptFile.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookCreation({ manuscriptFile: undefined });
                      setManuscriptError(null);
                    }}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
                    aria-label="Remove file"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {manuscriptError && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600">
                <ExclamationCircleIcon className="w-5 h-5" />
                <span>{manuscriptError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cover Upload with Preview */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Book Cover <span className="text-red-500">*</span></h3>
          {coverPreviewUrl ? (
            <div className="space-y-4">
              {/* Cover Preview */}
              <div className="relative aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden border-2 border-green-300">
                <img 
                  src={coverPreviewUrl} 
                  alt="Cover preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookCreation({ coverFile: undefined });
                    setCoverError(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  aria-label="Remove cover"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              {/* File Info */}
              {bookCreation.coverFile && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{bookCreation.coverFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(bookCreation.coverFile.size)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              {...coverDropzone.getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors aspect-[2/3] flex flex-col items-center justify-center ${
                coverDropzone.isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : coverError
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...coverDropzone.getInputProps()} />
              <PhotoIcon className={`mx-auto h-12 w-12 mb-4 ${
                coverError ? 'text-red-400' : 'text-gray-400'
              }`} />
              <p className="text-sm text-gray-600 mb-2">
                Upload your book cover image
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Drag and drop or click to select
              </p>
              <p className="text-xs text-gray-400">
                JPG, JPEG, PNG, PDF
              </p>
              {coverError && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600">
                  <ExclamationCircleIcon className="w-5 h-5" />
                  <span>{coverError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Generated Content */}
      <div className="space-y-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={bookCreation.isAIGenerated || false}
            onChange={(e) => setBookCreation({ isAIGenerated: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            This content is AI generated
          </span>
        </label>

        {bookCreation.isAIGenerated && (
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Usage Description
              </label>
              <textarea
                value={bookCreation.aiUsageDescription || ''}
                onChange={(e) => setBookCreation({ aiUsageDescription: e.target.value })}
                className="input-field h-24"
                placeholder="Describe how AI was used in creating this content"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Tool Used
              </label>
              <input
                type="text"
                value={bookCreation.aiToolUsed || ''}
                onChange={(e) => setBookCreation({ aiToolUsed: e.target.value })}
                className="input-field"
                placeholder="e.g., ChatGPT, Claude, Midjourney"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
