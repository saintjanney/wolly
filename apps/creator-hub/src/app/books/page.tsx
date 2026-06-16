'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { BookService } from '@/services/bookService';
import { PlatformBook } from '@/types/book';
import { getCurrencySymbol } from '@/utils/currency';
import { 
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, ClockIcon as ClockIconSolid, CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import BookCreationDialog from '@/components/book-creation/BookCreationDialog';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface BookRow {
  title: string;
  books: PlatformBook[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function BooksPage() {
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();
  const [books, setBooks] = useState<PlatformBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [isCreateBookDialogOpen, setIsCreateBookDialogOpen] = useState(false);
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<PlatformBook | null>(null);

  // Set page title
  useEffect(() => {
    setPageTitle('My Books', 'Your author\'s workspace');
  }, [setPageTitle]);

  const loadBooks = useCallback(async () => {
    if (!user) return;
    
    try {
      setBooksLoading(true);
      const userBooks = await BookService.getUserBooks(user.uid);
      setBooks(userBooks);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('Failed to load books');
    } finally {
      setBooksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      loadBooks();
    }
  }, [user, authLoading, router, loadBooks]);

  const handleDeleteBook = useCallback(async (book: PlatformBook, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await BookService.deleteBook(book.id);
      toast.success('Book deleted successfully');
      await loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book');
    }
  }, [loadBooks]);

  const handleEditBook = useCallback((book: PlatformBook, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBook(book);
    setIsCreateBookDialogOpen(true);
  }, []);

  // Organize books into rows
  const featuredBook = books.find(b => b.isPublished) || books[0];
  const publishedBooks = books.filter(b => b.isPublished);
  const draftBooks = books.filter(b => !b.isPublished);
  const recentBooks = [...books].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 10);

  const bookRows: BookRow[] = [
    { title: 'Published & Live', books: publishedBooks, icon: CheckCircleIcon, color: 'green' },
    { title: 'Drafts & In Progress', books: draftBooks, icon: ClockIcon, color: 'amber' },
    { title: 'Recently Updated', books: recentBooks, icon: SparklesIcon, color: 'purple' },
  ].filter(row => row.books.length > 0);

  if (authLoading || booksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userCurrencySymbol = getCurrencySymbol(user.currency || 'USD');

  if (books.length === 0) {
  return (
      <div className="h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-x-hidden flex items-center justify-center py-8">
        <div className="text-center px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-6">
            <BookOpenIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Your workspace awaits</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Start your publishing journey by creating your first book. Share your story with the world!
          </p>
          <button
            onClick={() => {
              setEditingBook(null);
              setIsCreateBookDialogOpen(true);
            }}
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:scale-105 transition-all duration-300"
          >
            <PlusIcon className="h-6 w-6 mr-2" />
            Create Your First Book
          </button>
        </div>
        
        <BookCreationDialog
          isOpen={isCreateBookDialogOpen}
          onClose={() => {
            setIsCreateBookDialogOpen(false);
            setEditingBook(null);
          }}
          editBook={editingBook}
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-x-hidden overflow-y-auto pt-8">
      {/* Featured Book - Creator Focus */}
      {featuredBook && (
        <div className="px-4 sm:px-6 lg:px-8 mb-12">
          <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
            
            <div className="relative p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Book Cover */}
                <div className="flex-shrink-0">
                  <div className="w-48 h-72 bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 flex items-center justify-center shadow-2xl">
                    <BookOpenIcon className="w-20 h-20 text-white/60" />
                  </div>
                </div>

                {/* Book Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-xs font-semibold text-white">
                      Featured Work
                    </span>
                    {featuredBook.isPublished && (
                      <span className="px-3 py-1 bg-green-500/30 backdrop-blur-sm border border-green-400/30 rounded-full text-xs font-semibold text-white flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        Published
              </span>
            )}
          </div>

                  <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                    {featuredBook.title}
                  </h2>

                  <p className="text-lg text-white/90 mb-6 line-clamp-3 leading-relaxed">
                    {featuredBook.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 mb-8 text-white/90">
          <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      <span className="text-sm">
                        {featuredBook.updatedAt.toLocaleDateString()}
            </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarIconSolid className="w-5 h-5 text-yellow-300" />
                      <span className="text-sm font-semibold">4.8 Rating</span>
                    </div>
                    {!featuredBook.isFree && (
            <div className="flex items-center gap-2">
                        <CurrencyDollarIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">
                          {userCurrencySymbol}{(featuredBook.price || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
              <button
                      onClick={(e) => handleEditBook(featuredBook, e)}
                      className="inline-flex items-center px-6 py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-xl"
              >
                      <PencilIcon className="w-5 h-5 mr-2" />
                      Edit Book
              </button>
              <button
                      className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                      <ChartBarIcon className="w-5 h-5 mr-2" />
                      View Analytics
              </button>
              <button
                      onClick={(e) => handleDeleteBook(featuredBook, e)}
                      className="inline-flex items-center px-6 py-3 bg-red-500/20 backdrop-blur-sm border-2 border-red-400/30 text-white font-semibold rounded-xl hover:bg-red-500/30 transition-all duration-200"
              >
                      <TrashIcon className="w-5 h-5 mr-2" />
                Delete
              </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

      {/* Book Rows */}
      <div className="px-4 sm:px-6 lg:px-8 pb-20 space-y-10">
        {bookRows.map((row, rowIndex) => (
          <BookRow
            key={rowIndex}
            title={row.title}
            icon={row.icon}
            color={row.color}
            books={row.books}
            currencySymbol={userCurrencySymbol}
            onEdit={handleEditBook}
            onDelete={handleDeleteBook}
            hoveredBook={hoveredBook}
            setHoveredBook={setHoveredBook}
          />
        ))}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setEditingBook(null);
          setIsCreateBookDialogOpen(true);
        }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
        aria-label="Create new book"
      >
        <PlusIcon className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Book Creation Dialog */}
      <BookCreationDialog
        isOpen={isCreateBookDialogOpen}
        onClose={() => {
          setIsCreateBookDialogOpen(false);
          setEditingBook(null);
        }}
        editBook={editingBook}
      />
    </div>
  );
}

// Book Row Component
function BookRow({ 
  title, 
  icon: Icon, 
  color,
  books, 
  currencySymbol,
  onEdit, 
  onDelete,
  hoveredBook,
  setHoveredBook 
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>;
  color: string; 
  books: PlatformBook[]; 
  currencySymbol: string;
  onEdit: (book: PlatformBook, e: React.MouseEvent) => void;
  onDelete: (book: PlatformBook, e: React.MouseEvent) => void;
  hoveredBook: string | null;
  setHoveredBook: (id: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    amber: 'text-amber-600 bg-amber-100',
    purple: 'text-purple-600 bg-purple-100',
    blue: 'text-blue-600 bg-blue-100',
  }[color] || 'text-gray-600 bg-gray-100';

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        ref.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [books]);

  return (
    <div className="group/row">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${colorClasses}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">
            {books.length}
          </span>
                </div>
              </div>

      <div className="relative group/slider">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-16 bg-gradient-to-r from-white to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300"
          >
            <div className="p-2 bg-white rounded-full shadow-xl border border-gray-200 hover:scale-110 transition-transform">
              <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
            </div>
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {books.map((book) => (
                  <div
                    key={book.id}
              className={`flex-none w-72 transition-all duration-300 ${
                hoveredBook === book.id ? 'scale-105 z-30' : 'scale-100'
              }`}
              onMouseEnter={() => setHoveredBook(book.id)}
              onMouseLeave={() => setHoveredBook(null)}
            >
              <div className="relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200">
                {/* Book Cover */}
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                  <BookOpenIcon className="w-20 h-20 text-gray-400" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {book.isPublished ? (
                      <div className="p-2 bg-green-500 rounded-full shadow-lg">
                        <CheckCircleIconSolid className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-500 rounded-full shadow-lg">
                        <ClockIconSolid className="w-5 h-5 text-white" />
                      </div>
                    )}
                      </div>

                  {/* Quick Actions Overlay on Hover */}
                  {hoveredBook === book.id && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center gap-2 animate-fadeIn">
                      <button
                        onClick={(e) => onEdit(book, e)}
                        className="p-3 bg-white rounded-xl hover:scale-110 transition-transform shadow-xl"
                        title="Edit book"
                      >
                        <PencilIcon className="w-5 h-5 text-gray-900" />
                      </button>
                      <button
                        className="p-3 bg-white rounded-xl hover:scale-110 transition-transform shadow-xl"
                        title="View analytics"
                      >
                        <ChartBarIcon className="w-5 h-5 text-gray-900" />
                      </button>
                      <button
                        onClick={(e) => onDelete(book, e)}
                        className="p-3 bg-red-500 rounded-xl hover:scale-110 transition-transform shadow-xl"
                        title="Delete book"
                      >
                        <TrashIcon className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1 truncate text-base">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">by {book.authorName}</p>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <EyeIcon className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600">0 views</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <StarIconSolid className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-600">4.5</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      <CalendarIcon className="w-3 h-3 inline mr-1" />
                      {book.updatedAt.toLocaleDateString()}
                    </div>
                    {!book.isFree && (
                      <span className="text-sm font-bold text-green-600">
                        {currencySymbol}{(book.price || 0).toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-16 bg-gradient-to-l from-white to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300"
          >
            <div className="p-2 bg-white rounded-full shadow-xl border border-gray-200 hover:scale-110 transition-transform">
              <ChevronRightIcon className="w-6 h-6 text-gray-700" />
          </div>
          </button>
        )}
      </div>
    </div>
  );
}
