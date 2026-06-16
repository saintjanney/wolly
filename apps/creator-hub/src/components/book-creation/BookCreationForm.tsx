'use client';

import { useState, useEffect } from 'react';
import { useBookCreationStore } from '@/stores/bookCreationStore';
import { BookDetailsStep } from './steps/BookDetailsStep';
import { UploadStep } from './steps/UploadStep';
import { PricingStep } from './steps/PricingStep';
import { ReviewStep } from './steps/ReviewStep';

const steps = [
  { id: 'details', title: 'Book Details', component: BookDetailsStep },
  { id: 'upload', title: 'Upload Content', component: UploadStep },
  { id: 'pricing', title: 'Pricing & Distribution', component: PricingStep },
  { id: 'review', title: 'Review & Publish', component: ReviewStep },
];

interface BookCreationFormProps {
  onClose?: () => void;
}

export default function BookCreationForm({ onClose }: BookCreationFormProps) {
  const { currentStep, setCurrentStep, validateStep, bookCreation, saveDraft, getCompletionPercentage } = useBookCreationStore();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Autosave to localStorage on every bookCreation change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only save if there's some meaningful data
      if (bookCreation.title || bookCreation.authorName || bookCreation.description) {
        saveDraft();
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [bookCreation, saveDraft]);

  // Calculate completion percentage
  const completionPercentage = getCompletionPercentage();

  const nextStep = () => {
    // Validate current step before proceeding
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setValidationErrors([]);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setValidationErrors([]);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTabClick = (index: number) => {
    // Allow navigation to current or previous steps only
    if (index <= currentStep) {
      setValidationErrors([]);
      setCurrentStep(index);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  // Check if current step is valid
  const currentStepValidation = validateStep(currentStep);
  const isCurrentStepValid = currentStepValidation.valid;

  // Keyboard navigation - Enter to advance (on non-last step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter if not on last step and target is not a textarea
      if (
        e.key === 'Enter' && 
        currentStep < steps.length - 1 &&
        !(e.target instanceof HTMLTextAreaElement) &&
        isCurrentStepValid
      ) {
        e.preventDefault();
        nextStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isCurrentStepValid]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab-based Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
        <div className="flex">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isClickable = index <= currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => handleTabClick(index)}
                disabled={!isClickable}
                className={`
                  flex-1 relative px-4 py-4 text-sm font-semibold transition-all duration-200 
                  border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                  ${isActive
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : isCompleted
                    ? 'border-transparent text-green-700 hover:bg-white/50 cursor-pointer'
                    : 'border-transparent text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  {/* Step number or checkmark */}
                  <span className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-500'
                    }
                  `}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  
                  {/* Step title */}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Bar Below Tabs */}
      <div className="flex-shrink-0 px-6 pt-3 pb-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Overall Progress</span>
          <span className="text-xs font-bold text-blue-600">{completionPercentage}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Content - Scrollable */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Top scroll shadow indicator */}
        <div className="sticky top-0 h-6 bg-gradient-to-b from-gray-50 via-gray-50/80 to-transparent pointer-events-none z-10 -mb-6" />
        
        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Please fix the following errors:
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === steps.length - 1 ? (
              <CurrentStepComponent onClose={onClose} />
            ) : (
              <CurrentStepComponent />
            )}
          </div>
        </div>
        
        {/* Bottom scroll shadow indicator */}
        <div className="sticky bottom-0 h-6 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent pointer-events-none z-10 -mt-6" />
      </div>

      {/* Navigation Buttons - Sticky at Bottom */}
      <div className="flex-shrink-0 border-t-2 border-gray-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-5 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex justify-between items-center gap-4">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <div className="text-sm text-gray-500 font-medium">
            Step {currentStep + 1} of {steps.length}
          </div>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              disabled={!isCurrentStepValid}
              title={!isCurrentStepValid ? 'Complete all required fields to continue' : ''}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Next
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-32"></div>
          )}
        </div>
      </div>
    </div>
  );
}
