'use client';

import { useBookCreationStore } from '@/stores/bookCreationStore';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CountryService } from '@/services/countryService';
import { getCurrencySymbol } from '@/utils/currency';
import { CurrencyDollarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export function PricingStep() {
  const { bookCreation, setBookCreation } = useBookCreationStore();
  const { user } = useAuth();
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  const authCurrency = user?.currency;

  // Prefer currency from AuthContext (Firestore user.currency), then fallback to country-based
  const loadUserCurrency = useCallback(async () => {
    if (!user) return;
    if (authCurrency) {
      setUserCurrency(authCurrency);
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
            setUserCurrency(country.currency.code);
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

  const getCurrencyDisplay = () => currencySymbol;

  // Calculate earnings based on price and platform fee (20%)
  const calculateEarnings = (price: number): number => {
    return price * 0.8; // You keep 80%
  };

  const yourEarnings = !bookCreation.isFree && bookCreation.price 
    ? calculateEarnings(bookCreation.price) 
    : 0;

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <CurrencyDollarIcon className="w-7 h-7 text-blue-600" />
          Pricing & Distribution
        </h2>
        <p className="text-gray-600 mt-2 text-sm">
          Set your book&apos;s price and distribution preferences
        </p>
      </div>

      {/* Free or Paid */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <label className="flex items-start cursor-pointer group">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              checked={bookCreation.isFree || false}
              onChange={(e) => setBookCreation({ isFree: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
            />
          </div>
          <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
            This book is free
          </span>
        </label>
      </div>

      {/* Price */}
      {!bookCreation.isFree && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <CurrencyDollarIcon className="w-4 h-4 text-gray-500" />
            Price ({userCurrency}) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm font-medium">{getCurrencyDisplay()}</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.99"
              value={bookCreation.price || ''}
              onChange={(e) => setBookCreation({ price: parseFloat(e.target.value) || 0 })}
              className="input-field pl-10"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Minimum price: {getCurrencyDisplay()}0.99
          </p>

          {/* Earnings Calculator */}
          {bookCreation.price && bookCreation.price >= 0.99 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Your Earnings Per Sale</p>
                  <p className="text-2xl font-bold text-green-700">
                    {getCurrencyDisplay()}{yourEarnings.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (80% of {getCurrencyDisplay()}{bookCreation.price.toFixed(2)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 mb-1">Wolly Platform Fee</p>
                  <p className="text-lg font-semibold text-gray-600">
                    {getCurrencyDisplay()}{(bookCreation.price - yourEarnings).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">(20%)</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-gray-500">10 sales</p>
                    <p className="font-semibold text-green-700">{getCurrencyDisplay()}{(yourEarnings * 10).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">100 sales</p>
                    <p className="font-semibold text-green-700">{getCurrencyDisplay()}{(yourEarnings * 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">1,000 sales</p>
                    <p className="font-semibold text-green-700">{getCurrencyDisplay()}{(yourEarnings * 1000).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Royalty Option */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Royalty Option <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          <label className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
            bookCreation.royaltyOption === '35%' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="royaltyOption"
              value="35%"
              checked={bookCreation.royaltyOption === '35%'}
              onChange={(e) => setBookCreation({ royaltyOption: e.target.value as '35%' | '70%' })}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-3 flex-1">
              <span className="text-sm font-semibold text-gray-900">35% Royalty</span>
              <p className="text-xs text-gray-600 mt-1">Standard option - Good for lower prices</p>
            </div>
          </label>
          <label className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
            bookCreation.royaltyOption === '70%' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="royaltyOption"
              value="70%"
              checked={bookCreation.royaltyOption === '70%'}
              onChange={(e) => setBookCreation({ royaltyOption: e.target.value as '35%' | '70%' })}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-3 flex-1">
              <span className="text-sm font-semibold text-gray-900">70% Royalty</span>
              <p className="text-xs text-gray-600 mt-1">Premium option - Best for higher-priced books</p>
            </div>
          </label>
        </div>
      </div>

      {/* Processing Fee */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={bookCreation.customerPaysProcessingFee || false}
            onChange={(e) => setBookCreation({ customerPaysProcessingFee: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Customer pays processing fee
          </span>
        </label>
      </div>

      {/* Revenue Share Information */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Revenue Share
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Wolly retains a 20% platform fee on all sales to support distribution, payment processing, and platform maintenance. 
              You keep 80% of every sale, with no hidden fees or monthly subscriptions.
            </p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Example:</span> For a book priced at {getCurrencyDisplay()}10.00, 
                you receive {getCurrencyDisplay()}8.00 per sale.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hardcover-specific options */}
      {bookCreation.bookType === 'hardcover' && (
        <div className="space-y-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900">Hardcover Options</h3>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bookCreation.isLowContentBook || false}
                onChange={(e) => setBookCreation({ isLowContentBook: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                This is a low-content book (coloring book, journal, etc.)
              </span>
            </label>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bookCreation.isLargePrintBook || false}
                onChange={(e) => setBookCreation({ isLargePrintBook: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                This is a large print book
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper Type
              </label>
              <select
                value={bookCreation.paperType || ''}
                onChange={(e) => setBookCreation({ paperType: e.target.value as 'white' | 'cream' })}
                className="select-field"
              >
                <option value="">Select paper type</option>
                <option value="white">White</option>
                <option value="cream">Cream</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trim Size
              </label>
              <select
                value={bookCreation.trimSize || ''}
                onChange={(e) => setBookCreation({ trimSize: e.target.value })}
                className="select-field"
              >
                <option value="">Select trim size</option>
                <option value="5x8">5&quot; x 8&quot;</option>
                <option value="6x9">6&quot; x 9&quot;</option>
                <option value="8x10">8&quot; x 10&quot;</option>
                <option value="8.5x11">8.5&quot; x 11&quot;</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Finish
            </label>
            <select
              value={bookCreation.coverFinish || ''}
              onChange={(e) => setBookCreation({ coverFinish: e.target.value as 'matte' | 'glossy' })}
              className="select-field"
            >
              <option value="">Select cover finish</option>
              <option value="matte">Matte</option>
              <option value="glossy">Glossy</option>
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bookCreation.useWollyIsbn || false}
                onChange={(e) => setBookCreation({ useWollyIsbn: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Use Wolly ISBN
              </span>
            </label>
          </div>

          {!bookCreation.useWollyIsbn && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ISBN
                <button 
                  type="button"
                  className="ml-2 text-blue-600 hover:text-blue-700 text-xs underline"
                  onClick={() => alert('ISBN (International Standard Book Number) is a unique identifier for books. You can use Wolly\'s ISBN for free, or provide your own if you already have one.')}
                >
                  What is ISBN?
                </button>
              </label>
              <input
                type="text"
                value={bookCreation.isbn || ''}
                onChange={(e) => setBookCreation({ isbn: e.target.value })}
                className="input-field"
                placeholder="Enter your ISBN"
              />
            </div>
          )}

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bookCreation.hasPaperbackVersion || false}
                onChange={(e) => setBookCreation({ hasPaperbackVersion: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                This book has a paperback version
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
