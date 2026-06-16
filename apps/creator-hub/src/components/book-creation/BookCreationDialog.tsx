'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import BookCreationForm from './BookCreationForm';
import { useBookCreationStore } from '@/stores/bookCreationStore';
import { PlatformBook } from '@/types/book';

interface BookCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editBook?: PlatformBook | null;
}

export default function BookCreationDialog({ isOpen, onClose, editBook }: BookCreationDialogProps) {
  const { reset, setCurrentStep, initializeFromBook, bookCreation, loadDraft, clearDraft, setBookCreation } = useBookCreationStore();
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Check for draft on mount
  useEffect(() => {
    if (isOpen && !editBook) {
      const draft = loadDraft();
      if (draft && (draft.title || draft.authorName || draft.description)) {
        setHasDraft(true);
        setShowDraftBanner(true);
      }
    }
  }, [isOpen, editBook, loadDraft]);

  // Initialize store when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (editBook) {
        // Edit mode: load book data
        initializeFromBook(editBook);
        setCurrentStep(0);
      } else if (!hasDraft) {
        // Create mode without draft: reset to defaults
        reset();
        setCurrentStep(0);
      }
    }
  }, [isOpen, editBook, reset, setCurrentStep, initializeFromBook, hasDraft]);

  // Keyboard navigation - Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // Check if user has entered any data
        const hasData = bookCreation.title || 
                       bookCreation.authorName || 
                       bookCreation.description ||
                       (bookCreation.categories && bookCreation.categories.length > 0);
        
        if (hasData) {
          // Show confirmation before closing
          const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
          if (confirmed) {
            handleClose();
          }
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, bookCreation]);

  // Reset store when dialog closes
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleResumeDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setBookCreation(draft);
      setShowDraftBanner(false);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
    setHasDraft(false);
    reset();
    setCurrentStep(0);
  };

  if (!isOpen) {
    return null;
  }

  const isEditMode = !!editBook;

  return (
    <>
      {/* Dialog overlay */}
      <div className="fixed inset-0 z-[60] bg-white/30 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-4xl h-[85vh] max-h-[800px] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? `Edit Book: ${editBook.title}` : 'Create New Book'}
            </h2>
            <div className="flex items-center gap-2">
              {showDraftBanner && !isEditMode && (
                <button
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors duration-200"
                >
                  Discard Draft
                </button>
              )}
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close dialog"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Draft Resume Banner */}
          {showDraftBanner && !isEditMode && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-medium text-amber-900 flex-1">
                    You have an unsaved draft. Would you like to resume where you left off?
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleResumeDraft}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors duration-200"
                  >
                    Resume Draft
                  </button>
                  <button
                    onClick={() => setShowDraftBanner(false)}
                    className="rounded-lg p-2 text-amber-600 hover:bg-amber-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    aria-label="Dismiss banner"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dialog content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <BookCreationForm onClose={handleClose} />
          </div>
        </div>
      </div>
    </>
  );
}
