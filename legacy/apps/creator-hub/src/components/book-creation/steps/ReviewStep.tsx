'use client';

import { useBookCreationStore } from '@/stores/bookCreationStore';
import { useAuth } from '@/contexts/AuthContext';
import { BookService } from '@/services/bookService';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CountryService } from '@/services/countryService';
import { getCurrencySymbol } from '@/utils/currency';
import { PlatformBook } from '@/types/book';
import toast from 'react-hot-toast';
import { 
  BookOpenIcon, 
  CurrencyDollarIcon, 
  DocumentIcon, 
  CheckCircleIcon,
  InformationCircleIcon,
  StarIcon,
  SparklesIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ReviewStepProps {
  onClose?: () => void;
}

export function ReviewStep({ onClose }: ReviewStepProps = {}) {
  const { bookCreation, editingBookId, clearDraft, setCurrentStep } = useBookCreationStore();
  const { user } = useAuth();
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);

  const isEditMode = !!editingBookId;

  const handlePublish = async () => {
    if (!user) {
      toast.error('You must be logged in to publish a book');
      return;
    }

    setIsPublishing(true);
    try {
      if (isEditMode && editingBookId) {
        // Update existing book - ensure distributionChannels has all required properties
        const updates = {
          ...bookCreation,
          distributionChannels: bookCreation.distributionChannels || {
            amazon: false,
            apple: false,
            google: false,
            kobo: false,
            barnesNoble: false,
            direct: false,
          },
        };
        await BookService.updateBook(editingBookId, updates as Partial<PlatformBook>);
        toast.success('Book updated successfully!');
      } else {
        // Create new book
        await BookService.createBook(bookCreation, user.uid);
        toast.success('Book created successfully!');
        // Clear draft on successful creation
        clearDraft();
      }
      
      // Close dialog if onClose is provided (dialog context)
      if (onClose) {
        onClose();
      }
      router.push('/books');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} book`;
      toast.error(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEditStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  // Prefer currency from AuthContext (Firestore user.currency), then fallback to country-based
  const authCurrency = user?.currency;

  const loadUserCurrency = useCallback(async () => {
    if (!user) return;
    if (authCurrency) {
      setCurrencySymbol(getCurrencySymbol(authCurrency));
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const countryCode = userData.country || userData.countryOfResidence;
        if (countryCode) {
          const country = await CountryService.getCountryByCode(countryCode);
          if (country?.currency?.code) {
            setCurrencySymbol(country.currency.symbol || getCurrencySymbol(country.currency.code));
          }
        }
      }
    } catch (error) {
      console.error('Error loading user currency:', error);
    }
  }, [user, authCurrency]);

  useEffect(() => {
    loadUserCurrency();
  }, [loadUserCurrency]);

  const formatCurrencyAmount = useMemo(() => (amount: number): string => `${currencySymbol}${amount.toFixed(2)}`, [currencySymbol]);

  // Generate cover preview URL if coverFile exists
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (bookCreation.coverFile) {
      const url = URL.createObjectURL(bookCreation.coverFile);
      setCoverPreviewUrl(url);
      // Cleanup URL when component unmounts
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreviewUrl(null);
    }
  }, [bookCreation.coverFile]);

  return (
    <div className="space-y-8">
      {/* Live Preview Card - Full Width at Top */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6" />
          Live Preview
        </h3>
        <p className="text-sm text-blue-100 mb-6">
          This is how your book will appear to readers
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cover Image Preview */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <div className="aspect-[2/3] bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg overflow-hidden flex items-center justify-center">
                {coverPreviewUrl ? (
                  <img 
                    src={coverPreviewUrl} 
                    alt="Book cover preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpenIcon className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>
          </div>
          
          {/* Book Details Preview */}
          <div className="md:col-span-2 bg-white rounded-xl p-6 text-gray-900 shadow-lg">
            <h4 className="font-bold text-2xl mb-2">
              {bookCreation.title || 'Your Book Title'}
            </h4>
            {bookCreation.subtitle && (
              <p className="text-lg text-gray-600 mb-3">{bookCreation.subtitle}</p>
            )}
            <p className="text-sm text-gray-500 mb-4">
              by {bookCreation.authorName || 'Author Name'}
            </p>
            
            {bookCreation.categories && bookCreation.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {bookCreation.categories.map(category => (
                  <span key={category} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {category}
                  </span>
                ))}
              </div>
            )}
            
            <p className="text-sm text-gray-700 line-clamp-4 mb-4">
              {bookCreation.description || 'Your book description will appear here...'}
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Price</p>
                <p className="text-2xl font-bold text-green-600">
                  {bookCreation.isFree ? 'Free' : formatCurrencyAmount(bookCreation.price || 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{bookCreation.bookType || 'eBook'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <CheckCircleIcon className="w-7 h-7 text-green-600" />
          Review Your Book
        </h2>
        <p className="text-gray-600 mt-2 text-sm">
          Review all the information below carefully before publishing your book to the world.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Book Details */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-blue-600" />
              Book Details
            </h3>
            <button
              onClick={() => handleEditStep(0)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</label>
              <p className="text-gray-900 font-medium mt-1">{bookCreation.title || 'Not specified'}</p>
            </div>
            {bookCreation.subtitle && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtitle</label>
                <p className="text-gray-900 mt-1">{bookCreation.subtitle}</p>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Author</label>
              <p className="text-gray-900 font-medium mt-1">{bookCreation.authorName || 'Not specified'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                <p className="text-gray-900 capitalize mt-1">{bookCreation.bookType || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Language</label>
                <p className="text-gray-900 mt-1">{bookCreation.language || 'Not specified'}</p>
              </div>
            </div>
            {bookCreation.categories && bookCreation.categories.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {bookCreation.categories.map(category => (
                    <span key={category} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white shadow-sm">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {bookCreation.keywords && bookCreation.keywords.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keywords</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {bookCreation.keywords.map(keyword => (
                    <span key={keyword} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Distribution */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-purple-600" />
              Pricing & Distribution
            </h3>
            <button
              onClick={() => handleEditStep(2)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</label>
              <p className="text-gray-900 font-bold text-lg mt-1">
                {bookCreation.isFree ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  formatCurrencyAmount(bookCreation.price || 0)
                )}
              </p>
            </div>
            {bookCreation.royaltyOption && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Royalty Option</label>
                <p className="text-gray-900 font-medium mt-1">{bookCreation.royaltyOption}</p>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Pays Processing Fee</label>
              <p className="text-gray-900 mt-1">{bookCreation.customerPaysProcessingFee ? 'Yes' : 'No'}</p>
            </div>
            <div className="pt-3 border-t border-purple-200">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <InformationCircleIcon className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <span>Wolly platform fee: 20% | Your earnings: 80%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-gray-600" />
            Uploaded Files
          </h3>
          <button
            onClick={() => handleEditStep(1)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Manuscript</label>
            <div className="mt-2 flex items-center gap-2">
              {bookCreation.manuscriptFile ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-gray-900 font-medium truncate">{bookCreation.manuscriptFile.name}</p>
                </>
              ) : (
                <p className="text-sm text-amber-600">No file uploaded</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cover</label>
            <div className="mt-2 flex items-center gap-2">
              {bookCreation.coverFile ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-gray-900 font-medium truncate">{bookCreation.coverFile.name}</p>
                </>
              ) : (
                <p className="text-sm text-amber-600">No file uploaded</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Content */}
      {bookCreation.isAIGenerated && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-amber-600" />
            AI Generated Content
          </h3>
          <div className="space-y-4">
            {bookCreation.aiToolUsed && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Tool Used</label>
                <p className="text-gray-900 font-medium mt-1">{bookCreation.aiToolUsed}</p>
              </div>
            )}
            {bookCreation.aiUsageDescription && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage Description</label>
                <p className="text-gray-900 mt-1">{bookCreation.aiUsageDescription}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legal & Compliance */}
      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-600" />
          Legal & Compliance
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              bookCreation.ownsCopyright ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {bookCreation.ownsCopyright ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Copyright Ownership</p>
              <p className="text-xs text-gray-600">
                {bookCreation.ownsCopyright ? 'Confirmed' : 'Not confirmed'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              bookCreation.hasExplicitContent ? 'bg-yellow-500' : 'bg-green-500'
            }`}>
              {bookCreation.hasExplicitContent ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Explicit Content</p>
              <p className="text-xs text-gray-600">
                {bookCreation.hasExplicitContent ? 'Contains explicit content' : 'No explicit content'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Publication Readiness Checklist */}
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-600" />
          Publication Checklist
        </h3>
        <div className="space-y-3">
          {/* Title & Author */}
          <div className="flex items-center gap-3">
            {bookCreation.title && bookCreation.authorName ? (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Title and author provided</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-sm text-red-700 font-medium">Missing title or author</span>
              </>
            )}
          </div>

          {/* Categories */}
          <div className="flex items-center gap-3">
            {bookCreation.categories && bookCreation.categories.length > 0 ? (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Categories selected</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-yellow-700 font-medium">No categories selected</span>
              </>
            )}
          </div>

          {/* Manuscript */}
          <div className="flex items-center gap-3">
            {bookCreation.manuscriptFile ? (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Manuscript uploaded</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-sm text-red-700 font-medium">Manuscript not uploaded</span>
              </>
            )}
          </div>

          {/* Cover */}
          <div className="flex items-center gap-3">
            {bookCreation.coverFile ? (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Cover image uploaded</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-sm text-red-700 font-medium">Cover image not uploaded</span>
              </>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            {bookCreation.isFree || (bookCreation.price && bookCreation.price >= 0.99) ? (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Price set</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-sm text-red-700 font-medium">Price not set or below minimum</span>
              </>
            )}
          </div>

          {/* Copyright */}
          <div className="flex items-center gap-3">
            {bookCreation.ownsCopyright ? (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Copyright confirmed</span>
              </>
            ) : (
              <>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-sm text-red-700 font-medium">Copyright not confirmed</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Publish/Update Button - Only one button, prominently displayed */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full max-w-md flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-1"
          >
            {isPublishing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditMode ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEditMode ? 'Update Book' : 'Publish Book'}
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center">
            By publishing, you confirm that all information is accurate and you have the rights to distribute this content.
          </p>
        </div>
      </div>
    </div>
  );
}
