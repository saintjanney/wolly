'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import DatePicker from './DatePicker';

export type TimeRangePreset = 'month' | 'quarter' | 'year' | 'custom';

export interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeFilter {
  preset: TimeRangePreset;
  customRange?: CustomDateRange;
}

interface DateRangeToggleProps {
  value: DateRangeFilter;
  onChange: (filter: DateRangeFilter) => void;
  className?: string;
}

const presetOptions = [
  { value: 'month' as const, label: 'This Month' },
  { value: 'quarter' as const, label: 'This Quarter' },
  { value: 'year' as const, label: 'This Year' },
  { value: 'custom' as const, label: 'Custom Range' },
];

export default function DateRangeToggle({
  value,
  onChange,
  className = '',
}: DateRangeToggleProps) {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(
    value.customRange?.startDate || new Date()
  );
  const [tempEndDate, setTempEndDate] = useState<Date>(
    value.customRange?.endDate || new Date()
  );
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsCustomModalOpen(false);
      }
    };

    if (isCustomModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCustomModalOpen]);

  const handlePresetClick = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      setIsCustomModalOpen(true);
    } else {
      onChange({ preset });
    }
  };

  const handleCustomRangeApply = () => {
    onChange({
      preset: 'custom',
      customRange: {
        startDate: tempStartDate,
        endDate: tempEndDate,
      },
    });
    setIsCustomModalOpen(false);
  };

  const getDisplayText = () => {
    if (value.preset === 'custom' && value.customRange) {
      return `${format(value.customRange.startDate, 'MMM d')} - ${format(
        value.customRange.endDate,
        'MMM d, yyyy'
      )}`;
    }
    return presetOptions.find((opt) => opt.value === value.preset)?.label || 'This Month';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Desktop: Horizontal Toggle Buttons */}
      <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {presetOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handlePresetClick(option.value)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
              ${
                value.preset === option.value
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }
            `}
          >
            {option.value === 'custom' && value.preset === 'custom' && value.customRange
              ? getDisplayText()
              : option.label}
          </button>
        ))}
      </div>

      {/* Mobile: Dropdown Select */}
      <div className="sm:hidden relative">
        <select
          value={value.preset}
          onChange={(e) => {
            const preset = e.target.value as TimeRangePreset;
            handlePresetClick(preset);
          }}
          className="w-full text-xs border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
        >
          {presetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value === 'custom' && value.preset === 'custom' && value.customRange
                ? getDisplayText()
                : option.label}
            </option>
          ))}
        </select>
        <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Custom Range Modal */}
      {isCustomModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Select Custom Date Range
              </h3>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <DatePicker
                  value={tempStartDate}
                  onChange={setTempStartDate}
                  maxDate={tempEndDate}
                  placeholder="Select start date"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <DatePicker
                  value={tempEndDate}
                  onChange={setTempEndDate}
                  minDate={tempStartDate}
                  maxDate={new Date()}
                  placeholder="Select end date"
                />
              </div>

              {/* Date Range Summary */}
              {tempStartDate && tempEndDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Selected Range:</span>{' '}
                    {format(tempStartDate, 'MMM d, yyyy')} -{' '}
                    {format(tempEndDate, 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {Math.ceil(
                      (tempEndDate.getTime() - tempStartDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1}{' '}
                    days
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomRangeApply}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
