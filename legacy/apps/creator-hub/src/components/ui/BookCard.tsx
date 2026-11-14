'use client';

import { PlatformBook } from '@/types/book';
import { getCurrencySymbol } from '@/utils/currency';
import { BookOpenIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface BookCardProps {
  book: PlatformBook;
  /** Currency symbol from user's Firestore profile (e.g. "₵" for GHS). When provided, used for price display. */
  currencySymbol?: string;
  onClick?: (book: PlatformBook) => void;
  onEdit?: (book: PlatformBook, e: React.MouseEvent) => void;
  onDelete?: (book: PlatformBook, e: React.MouseEvent) => void;
  showActions?: boolean;
}

export default function BookCard({
  book,
  currencySymbol: currencySymbolProp,
  onClick,
  onEdit,
  onDelete,
  showActions = true,
}: BookCardProps) {
  const currencySymbol = currencySymbolProp ?? getCurrencySymbol(book.currency);
  const handleClick = () => {
    if (onClick) {
      onClick(book);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(book, e);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(book, e);
    }
  };

  return (
    <div
      className={`group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      <div className="aspect-w-3 aspect-h-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-xl overflow-hidden">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <BookOpenIcon className="h-16 w-16 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-base font-semibold text-gray-900 truncate flex-1 group-hover:text-blue-600 transition-colors">
            {book.title}
          </h4>
          <span
            className={`ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              book.isPublished
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
            }`}
          >
            {book.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
          {book.description || 'No description available'}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center text-sm">
            <span
              className={`font-semibold ${
                book.isFree ? 'text-green-600' : 'text-gray-900'
              }`}
            >
              {book.isFree
                ? 'Free'
                : `${currencySymbol}${(book.price || 0).toFixed(2)}`}
            </span>
          </div>
          {showActions && (
            <div className="flex space-x-2">
              {onEdit && (
                <button
                  className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2 rounded-lg"
                  onClick={handleEdit}
                  title="Edit book"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 p-2 rounded-lg"
                  onClick={handleDelete}
                  title="Delete book"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

