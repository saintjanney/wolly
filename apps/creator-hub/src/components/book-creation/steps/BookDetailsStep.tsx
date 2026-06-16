'use client';

import { useBookCreationStore } from '@/stores/bookCreationStore';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { 
  BookOpenIcon, 
  LanguageIcon, 
  DocumentTextIcon, 
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  BeakerIcon,
  FireIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  TrophyIcon,
  MusicalNoteIcon,
  FaceSmileIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const languages = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi'
];

// Categories with icons and colors
const categories = [
  { name: 'Fiction', icon: BookOpenIcon, color: 'blue' },
  { name: 'Non-Fiction', icon: AcademicCapIcon, color: 'green' },
  { name: 'Romance', icon: HeartIcon, color: 'pink' },
  { name: 'Mystery & Thriller', icon: ShieldCheckIcon, color: 'purple' },
  { name: 'Science Fiction', icon: RocketLaunchIcon, color: 'indigo' },
  { name: 'Fantasy', icon: SparklesIcon, color: 'violet' },
  { name: 'Horror', icon: FireIcon, color: 'red' },
  { name: 'Biography & Memoir', icon: UserIcon, color: 'amber' },
  { name: 'Self-Help', icon: TrophyIcon, color: 'emerald' },
  { name: 'Business & Economics', icon: TrophyIcon, color: 'slate' },
  { name: 'History', icon: GlobeAltIcon, color: 'orange' },
  { name: 'Science & Technology', icon: BeakerIcon, color: 'cyan' },
  { name: 'Health & Fitness', icon: HeartIcon, color: 'rose' },
  { name: 'Travel', icon: GlobeAltIcon, color: 'sky' },
  { name: 'Cooking', icon: FireIcon, color: 'orange' },
  { name: 'Poetry', icon: MusicalNoteIcon, color: 'purple' },
  { name: 'Drama', icon: MusicalNoteIcon, color: 'red' },
  { name: 'Comedy', icon: FaceSmileIcon, color: 'yellow' },
  { name: 'Adventure', icon: RocketLaunchIcon, color: 'lime' },
  { name: 'Educational', icon: AcademicCapIcon, color: 'blue' }
];

const readingAges = [
  'All Ages', 'Children (0-12)', 'Young Adult (13-17)', 'Adult (18+)', 'Mature (21+)'
];

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:border-blue-300' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:border-green-300' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', hover: 'hover:border-pink-300' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:border-purple-300' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', hover: 'hover:border-indigo-300' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', hover: 'hover:border-violet-300' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', hover: 'hover:border-red-300' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:border-amber-300' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hover: 'hover:border-emerald-300' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', hover: 'hover:border-slate-300' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', hover: 'hover:border-orange-300' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', hover: 'hover:border-cyan-300' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', hover: 'hover:border-rose-300' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', hover: 'hover:border-sky-300' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', hover: 'hover:border-yellow-300' },
  lime: { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', hover: 'hover:border-lime-300' },
};

export function BookDetailsStep() {
  const { bookCreation, setBookCreation } = useBookCreationStore();
  const { user } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(bookCreation.categories || []);
  const [keywords, setKeywords] = useState<string[]>(bookCreation.keywords || []);
  const [titleLength, setTitleLength] = useState(0);
  const [descLength, setDescLength] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Auto-fill fields from user profile on mount
  useEffect(() => {
    const loadUserProfileAndPrefill = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        // Import Firestore functions
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        // Get full user document from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log('[BookDetailsStep] User data:', userData);
          
          // Prepare updates object - only update fields that are currently empty
          const updates: Record<string, string> = {};
          
          // Pre-fill author name (from firstName + lastName, or displayName, or email)
          if (!bookCreation.authorName) {
            let authorName = '';
            if (userData.firstName && userData.lastName) {
              authorName = `${userData.firstName} ${userData.lastName}`;
            } else if (userData.firstName) {
              authorName = userData.firstName;
            } else if (userData.displayName) {
              authorName = userData.displayName;
            } else if (user.email) {
              authorName = user.email.split('@')[0];
            }
            if (authorName) {
              updates.authorName = authorName;
            }
          }
          
          // Pre-fill language if available
          if (!bookCreation.language && userData.language) {
            updates.language = userData.language;
          }
          
          // Apply all updates at once
          if (Object.keys(updates).length > 0) {
            console.log('[BookDetailsStep] Pre-filling fields:', updates);
            setBookCreation(updates);
          }
        }
      } catch (error) {
        console.error('[BookDetailsStep] Error loading user profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserProfileAndPrefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setTitleLength((bookCreation.title || '').length);
    setDescLength((bookCreation.description || '').length);
  }, [bookCreation.title, bookCreation.description]);

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
    setBookCreation({ categories: newCategories });
  };

  const handleKeywordAdd = (keyword: string) => {
    if (keyword.trim() && !keywords.includes(keyword.trim()) && keywords.length < 5) {
      const newKeywords = [...keywords, keyword.trim()];
      setKeywords(newKeywords);
      setBookCreation({ keywords: newKeywords });
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    const newKeywords = keywords.filter(k => k !== keyword);
    setKeywords(newKeywords);
    setBookCreation({ keywords: newKeywords });
  };

  return (
    <div className="space-y-4">
      {/* Basic Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4 md:p-5 border border-blue-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-blue-600" />
            Basic Information
          </h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Book Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Book Type
                </label>
                <div className="relative">
                  <select
                    value={bookCreation.bookType || ''}
                    onChange={(e) => setBookCreation({ bookType: e.target.value as 'ebook' | 'hardcover' })}
                    className="select-field pl-10"
                  >
                    <option value="">Select type</option>
                    <option value="ebook">📱 eBook</option>
                    <option value="hardcover">📕 Hardcover</option>
                    <option value="paperback">📘 Paperback</option>
                  </select>
                  <BookOpenIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Language
                  {bookCreation.language && (
                    <span className="ml-2 text-xs font-normal text-green-600">✓ Pre-filled</span>
                  )}
                </label>
                <div className="relative">
                  <select
                    value={bookCreation.language || ''}
                    onChange={(e) => setBookCreation({ language: e.target.value })}
                    className={`select-field pl-10 ${isLoadingProfile ? 'animate-pulse' : ''}`}
                    disabled={isLoadingProfile}
                  >
                    <option value="">Select language</option>
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <LanguageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Book Title <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DocumentTextIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={bookCreation.title || ''}
                  onChange={(e) => setBookCreation({ title: e.target.value })}
                  className="input-field pl-10"
                  placeholder="Enter your book title"
                  maxLength={100}
                  required
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  💡 Keep it clear and memorable
                </p>
                <p className={`text-xs font-medium ${titleLength > 80 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {titleLength}/100
                </p>
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subtitle <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={bookCreation.subtitle || ''}
                onChange={(e) => setBookCreation({ subtitle: e.target.value })}
                className="input-field"
                placeholder="Add context or intrigue"
                maxLength={100}
              />
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Author Name <span className="text-red-500">*</span>
                {bookCreation.authorName && (
                  <span className="ml-2 text-xs font-normal text-green-600">✓ Pre-filled from profile</span>
                )}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={bookCreation.authorName || ''}
                  onChange={(e) => setBookCreation({ authorName: e.target.value })}
                  className={`input-field pl-10 ${isLoadingProfile ? 'animate-pulse' : ''}`}
                  placeholder={isLoadingProfile ? "Loading..." : "Your name or pen name"}
                  disabled={isLoadingProfile}
                  required
                />
              </div>
            </div>
          </div>
      </div>

      {/* Description Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Book Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={bookCreation.description || ''}
            onChange={(e) => setBookCreation({ description: e.target.value })}
            className="input-field h-32 resize-none"
            placeholder="What's your book about? Hook your readers with a compelling description..."
            maxLength={1000}
            required
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              💡 Include key themes and what makes it unique
            </p>
            <p className={`text-xs font-medium ${descLength > 800 ? 'text-amber-600' : 'text-gray-500'}`}>
              {descLength}/1000
            </p>
          </div>
      </div>

      {/* Categories Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-gray-500" />
              Categories <span className="text-red-500">*</span>
            </label>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {selectedCategories.length}/3 selected
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {categories.map(({ name, icon: Icon, color }) => {
              const isSelected = selectedCategories.includes(name);
              const isDisabled = !isSelected && selectedCategories.length >= 3;
              const colors = colorMap[color] || colorMap.blue;
              
              return (
                <label
                  key={name}
                  className={`
                    relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                    ${isSelected
                      ? `${colors.border} ${colors.bg} shadow-md scale-105`
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-40'
                      : `border-gray-200 bg-white ${colors.hover} hover:shadow-sm hover:scale-102`
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleCategoryToggle(name)}
                    disabled={isDisabled}
                    className="sr-only"
                  />
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? colors.text : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className={`text-sm font-medium ${isSelected ? colors.text : 'text-gray-700'}`}>
                    {name}
                  </span>
                  {isSelected && (
                    <CheckCircleIcon className={`w-5 h-5 ml-auto ${colors.text}`} />
                  )}
                </label>
              );
            })}
          </div>
          
          {selectedCategories.length === 3 && (
            <p className="text-xs text-amber-600 mt-3 flex items-center gap-2 bg-amber-50 p-2 rounded-lg">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Maximum of 3 categories selected
            </p>
          )}
      </div>

      {/* Keywords & Reading Age */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Keywords */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                Keywords
              </label>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {keywords.length}/5
              </span>
            </div>
            
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {keywords.map(keyword => (
                  <span
                    key={keyword}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200"
                  >
                    {keyword}
                    <button
                      onClick={() => handleKeywordRemove(keyword)}
                      className="ml-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-200 p-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <input
              type="text"
              placeholder={keywords.length >= 5 ? "Max reached" : "Type and press Enter"}
              className="input-field"
              disabled={keywords.length >= 5}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleKeywordAdd(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>

          {/* Reading Age */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Reading Age <span className="text-gray-400 font-normal text-xs">(Optional)</span>
            </label>
            <select
              value={bookCreation.readingAge || ''}
              onChange={(e) => setBookCreation({ readingAge: e.target.value })}
              className="select-field"
            >
              <option value="">Select age range</option>
              {readingAges.map(age => (
                <option key={age} value={age}>{age}</option>
              ))}
            </select>
          </div>
      </div>

      {/* Checkboxes */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Legal & Content</h3>
          <div className="space-y-3">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={bookCreation.ownsCopyright || false}
                onChange={(e) => setBookCreation({ ownsCopyright: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                ✅ I own the copyright to this book
              </span>
            </label>

            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={bookCreation.hasExplicitContent || false}
                onChange={(e) => setBookCreation({ hasExplicitContent: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                🔞 This book contains sexually explicit content
              </span>
            </label>
          </div>
      </div>
    </div>
  );
}
