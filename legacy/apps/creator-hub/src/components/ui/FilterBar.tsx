'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

export interface Filter {
  key: string;
  label: string;
  type: 'select' | 'date' | 'text';
  options?: { value: string; label: string }[];
}

interface FilterBarProps {
  onSearch: (query: string) => void;
  filters?: Filter[];
  onFilterChange?: (key: string, value: string) => void;
  placeholder?: string;
}

export default function FilterBar({
  onSearch,
  filters = [],
  onFilterChange,
  placeholder = 'Search...',
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    if (onFilterChange) {
      onFilterChange(key, value);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="input-field pl-10"
          />
        </div>

        {/* Filter Toggle Button */}
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
            {Object.keys(filterValues).length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Object.keys(filterValues).length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && filters.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                {filter.type === 'select' && filter.options ? (
                  <select
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="select-field"
                  >
                    <option value="">All</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'text' ? (
                  <input
                    type="text"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    placeholder={`Filter by ${filter.label.toLowerCase()}`}
                    className="input-field"
                  />
                ) : (
                  <input
                    type="date"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="input-field"
                  />
                )}
              </div>
            ))}
          </div>
          {Object.keys(filterValues).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setFilterValues({});
                  filters.forEach((filter) => {
                    if (onFilterChange) {
                      onFilterChange(filter.key, '');
                    }
                  });
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

