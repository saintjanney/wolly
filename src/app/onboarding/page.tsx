'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CreatorService } from '@/services/creatorService';
import { CountryService } from '@/services/countryService';
import { CreatorOnboarding, Genre, Country } from '@/types/creator';
import toast from 'react-hot-toast';
import { 
  UserIcon, 
  GlobeAltIcon, 
  BookOpenIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  PhoneIcon,
  MapPinIcon,
  UserCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import DatePicker from '@/components/ui/DatePicker';


export default function OnboardingPage() {
  const { user, loading, markOnboardingComplete } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [showAddGenre, setShowAddGenre] = useState(false);
  const [dateOfBirthError, setDateOfBirthError] = useState<string | null>(null);

  // Set default date of birth to 18 years ago (a valid default)
  const getDefaultDateOfBirth = (): Date => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date;
  };

  const [onboardingData, setOnboardingData] = useState<CreatorOnboarding>({
    firstName: '',
    lastName: '',
    dateOfBirth: getDefaultDateOfBirth(),
    phoneNumber: '',
    countryOfResidence: '',
    selectedGenres: [],
    customGenres: [],
    penName: '',
    bio: '',
    website: ''
  });

  useEffect(() => {
    console.log('[OnboardingPage] State:', { loading, user: user?.email, onboardingCompleted: user?.onboardingCompleted });
    
    // Only redirect if loading is complete AND user is still null
    // Give auth state a moment to stabilize after account creation
    if (!loading && !user) {
      console.log('[OnboardingPage] No user after loading complete, redirecting to home');
      // Small delay to allow auth state to update
      const timeoutId = setTimeout(() => {
        if (!user) {
          router.push('/');
        }
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, loading, router]);

  useEffect(() => {
    console.log('[OnboardingPage] Loading genres...');
    const loadGenres = async () => {
      try {
        const genresData = await CreatorService.getGenres();
        console.log('[OnboardingPage] Genres loaded:', genresData.length);
        setGenres(genresData);
      } catch (error) {
        console.error('[OnboardingPage] Error loading genres:', error);
        toast.error('Failed to load genres');
      } finally {
        setLoadingGenres(false);
      }
    };

    loadGenres();
  }, []);

  useEffect(() => {
    console.log('[OnboardingPage] Loading countries...');
    const loadCountries = async () => {
      try {
        const countriesData = await CountryService.getCountries();
        console.log('[OnboardingPage] Countries loaded:', countriesData.length);
        console.log('[OnboardingPage] Countries data:', countriesData);
        if (countriesData.length === 0) {
          console.warn('[OnboardingPage] No countries returned from service');
        }
        setCountries(countriesData);
      } catch (error: unknown) {
        console.error('[OnboardingPage] Error loading countries:', error);
        const errorObj = error as { code?: string; message?: string };
        console.error('[OnboardingPage] Error details:', {
          code: errorObj?.code,
          message: errorObj?.message,
          stack: errorObj?.message
        });
        toast.error(`Failed to load countries: ${errorObj?.message || 'Unknown error'}`);
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const validateDateOfBirth = (date: Date): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if date is in the future
    if (date > today) {
      return 'Date of birth cannot be in the future';
    }
    
    // Check if user is at least 13 years old
    const age = calculateAge(date);
    if (age < 13) {
      return 'You must be at least 13 years old to create an account';
    }
    
    // Check for unreasonable past dates (e.g., more than 120 years ago)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    if (date < minDate) {
      return 'Please enter a valid date of birth';
    }
    
    return null;
  };

  const handleInputChange = (field: keyof CreatorOnboarding, value: string | Date | string[]) => {
    // Clear error when user starts typing
    if (field === 'dateOfBirth') {
      setDateOfBirthError(null);
    }
    
    setOnboardingData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validate date of birth on change
    if (field === 'dateOfBirth' && value instanceof Date) {
      const error = validateDateOfBirth(value);
      setDateOfBirthError(error);
    }
  };

  const handleGenreToggle = (genreId: string) => {
    setOnboardingData(prev => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genreId)
        ? prev.selectedGenres.filter(id => id !== genreId)
        : [...prev.selectedGenres, genreId]
    }));
  };

  const handleAddCustomGenre = async () => {
    if (!newGenreName.trim()) return;

    try {
      const newGenre = await CreatorService.addCustomGenre(newGenreName.trim());
      setGenres(prev => [...prev, newGenre]);
      setOnboardingData(prev => ({
        ...prev,
        customGenres: [...prev.customGenres, newGenre.name],
        selectedGenres: [...prev.selectedGenres, newGenre.id]
      }));
      setNewGenreName('');
      setShowAddGenre(false);
      toast.success(`Added "${newGenre.name}" genre`);
    } catch (error) {
      console.error('Error adding custom genre:', error);
      toast.error('Failed to add custom genre');
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Validate date of birth if not already validated
        if (onboardingData.dateOfBirth) {
          const error = validateDateOfBirth(onboardingData.dateOfBirth);
          if (error) {
            setDateOfBirthError(error);
            return false;
          }
        }
        
        return onboardingData.firstName.trim() !== '' && 
               onboardingData.lastName.trim() !== '' &&
               onboardingData.dateOfBirth &&
               !dateOfBirthError &&
               onboardingData.countryOfResidence !== '';
      case 2:
        return onboardingData.selectedGenres.length > 0;
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      if (currentStep === 1 && dateOfBirthError) {
        toast.error(dateOfBirthError);
      } else {
        toast.error('Please fill in all required fields');
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      await CreatorService.completeOnboarding(
        user.uid, 
        onboardingData,
        {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      );
      markOnboardingComplete();
      toast.success('Welcome to Wolly! Your creator profile is ready.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while auth is loading OR if we're waiting for user state to stabilize
  if (loading) {
    console.log('[OnboardingPage] Auth loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }
  
  // If loading is complete but user is still null, wait a bit longer for auth state to catch up
  // This handles the race condition when redirecting immediately after account creation
  // The useEffect will handle redirecting to home if user is still null after a delay
  if (!user) {
    console.log('[OnboardingPage] No user yet, showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show loading state while genres or countries are loading
  if (loadingGenres || loadingCountries) {
    console.log('[OnboardingPage] Loading data...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loadingGenres ? 'Loading genres...' : loadingCountries ? 'Loading countries...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  console.log('[OnboardingPage] Rendering form');

  const steps = [
    { number: 1, title: 'Personal Information', icon: UserIcon },
    { number: 2, title: 'Genre Selection', icon: BookOpenIcon },
    { number: 3, title: 'Profile Setup', icon: GlobeAltIcon }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4 transform transition-transform hover:scale-105">
            <BookOpenIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome to Wolly!</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Let&apos;s set up your creator profile to get you started
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="relative">
            {/* Connecting Line Background */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
            
            <div className="relative flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const StepIcon = step.icon;
                
                return (
                  <div key={step.number} className="flex flex-col items-center flex-1">
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 z-10 ${
                      isCompleted
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-blue-600 shadow-lg scale-110'
                        : isActive
                        ? 'bg-white border-blue-600 text-blue-600 shadow-lg scale-110 ring-4 ring-blue-100'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircleIcon className="w-6 h-6 text-white" />
                      ) : (
                        <StepIcon className={`w-6 h-6 ${isActive ? 'text-blue-600' : ''}`} />
                      )}
                    </div>
                    <div className="mt-3 text-center max-w-[120px]">
                      <p className={`text-sm font-semibold transition-colors ${
                        isActive || isCompleted
                          ? 'text-gray-900' 
                          : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                      <p className={`text-xs mt-1 transition-colors ${
                        isActive || isCompleted
                          ? 'text-blue-600 font-medium' 
                          : 'text-gray-400'
                      }`}>
                        Step {step.number}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 border border-gray-100 transform transition-all duration-300 hover:shadow-2xl">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <UserCircleIcon className="w-7 h-7 text-blue-600" />
                  Personal Information
                </h2>
                <p className="mt-2 text-gray-600">Tell us about yourself so we can personalize your experience.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={onboardingData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="input-field pl-10"
                      placeholder="Enter your first name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={onboardingData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="input-field pl-10"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={onboardingData.dateOfBirth}
                  onChange={(date) => handleInputChange('dateOfBirth', date)}
                  maxDate={new Date()}
                  error={dateOfBirthError || undefined}
                  placeholder="Select your date of birth"
                />
                {dateOfBirthError && (
                  <div 
                    className="flex items-start gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                    style={{ animation: 'slideIn 0.2s ease-out' }}
                  >
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">
                      {dateOfBirthError}
                    </p>
                  </div>
                )}
                {!dateOfBirthError && onboardingData.dateOfBirth && calculateAge(onboardingData.dateOfBirth) >= 13 && (
                  <div 
                    className="flex items-center gap-2 mt-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                    style={{ animation: 'slideIn 0.2s ease-out' }}
                  >
                    <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">
                      Age requirement satisfied
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Phone Number <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={onboardingData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Country of Residence <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <MapPinIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={onboardingData.countryOfResidence}
                    onChange={(e) => handleInputChange('countryOfResidence', e.target.value)}
                    className="select-field pl-10"
                  >
                    <option value="">Select your country</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                  {countries.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      No countries available. Please contact support.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Genre Selection */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <BookOpenIcon className="w-7 h-7 text-blue-600" />
                  Genre Selection
                </h2>
                <p className="mt-2 text-gray-600">
                  What genres will you be creating content for? Select all that apply.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {genres.map(genre => {
                  const isSelected = onboardingData.selectedGenres.includes(genre.id);
                  return (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreToggle(genre.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-105 ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 shadow-md ring-2 ring-blue-200'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-sm">{genre.name}</div>
                        {isSelected && (
                          <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      {genre.description && (
                        <div className={`text-xs mt-2 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                          {genre.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Genre */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Don&apos;t see your genre?</h3>
                  <button
                    onClick={() => setShowAddGenre(!showAddGenre)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Genre
                  </button>
                </div>
                
                {showAddGenre && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Enter new genre name"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomGenre()}
                    />
                    <button
                      onClick={handleAddCustomGenre}
                      className="btn-primary"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddGenre(false);
                        setNewGenreName('');
                      }}
                      className="btn-secondary"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {onboardingData.selectedGenres.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                    Selected Genres ({onboardingData.selectedGenres.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {onboardingData.selectedGenres.map(genreId => {
                      const genre = genres.find(g => g.id === genreId);
                      return genre ? (
                        <span 
                          key={genreId} 
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white shadow-sm"
                        >
                          {genre.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Profile Setup */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <GlobeAltIcon className="w-7 h-7 text-blue-600" />
                  Profile Setup
                </h2>
                <p className="mt-2 text-gray-600">
                  Optional: Add some details to make your profile more complete.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Pen Name <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={onboardingData.penName}
                  onChange={(e) => handleInputChange('penName', e.target.value)}
                  className="input-field"
                  placeholder="Your author pen name"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Bio <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  value={onboardingData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="input-field resize-none"
                  rows={5}
                  placeholder="Tell readers about yourself and your writing..."
                />
                <p className="text-xs text-gray-500">Share your writing journey, inspirations, or what makes your stories unique.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Website <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={onboardingData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="input-field"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200 mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                currentStep === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm transform hover:-translate-y-0.5'
              }`}
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </div>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircleIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
